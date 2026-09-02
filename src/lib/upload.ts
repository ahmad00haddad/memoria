import { toast } from "sonner";
import React from "react";
import imageCompression from 'browser-image-compression';
import { supabase } from "@/integrations/supabase/client";
// ============================================================================
// upload.ts — مساعد رفع الملفات الشامل (مُصلَح)
// ----------------------------------------------------------------------------
// يحل المشاكل الشائعة عند رفع الملفات:
//   1. Bucket غير موجود
//   2. صلاحيات غير كافية (RLS)
//   3. حجم الملف كبير
//   4. نوع الملف غير مسموح
//   5. انتهاء صلاحية الجلسة
//   6. تعارض المسار (ملف موجود مسبقاً)
//   7. انقطاع الشبكة
//   8. حصة التخزين ممتلئة
//
// تحسينات هذا الإصدار:
//   * إضافة uploadPortfolioPhoto() — يستخدم bucket "portfolio" الصحيح.
//   * إصلاح ترتيب الاستيراد (React في الأعلى).
//   * إضافة تحقّق من أبعاد الصورة (العرض/الارتفاع).
//   * رسائل خطأ عربية أكثر تفصيلاً مع السبب والحل.
//   * إضافة detailedError لكل نوع خطأ (للـ logging).
// ============================================================================



export type AllowedFileType = "image" | "image_or_pdf" | "any";

export type UploadConfig = {
  bucket: string;
  path: string;
  maxMb?: number;
  allowedTypes?: AllowedFileType;
  upsert?: boolean;
  /** أقصى عرض/ارتفاع للصور (بكسل). افتراضي: 2048 (توفير مساحة التخزين) */
  maxDimension?: number;
  /** الحجم المستهدف بعد الضغط (ميغابايت). افتراضي: 0.3 */
  targetSizeMb?: number;
};

export type UploadResult = {
  ok: true;
  path: string;
  publicUrl?: string;
} | {
  ok: false;
  error: string;
  userMessage: string;
  errorType: UploadErrorType;
  /** تفاصيل تقنية إضافية للتشخيص */
  details?: string;
};

export type UploadErrorType =
  | "file_too_large"
  | "invalid_type"
  | "invalid_dimension"
  | "bucket_not_found"
  | "permission_denied"
  | "auth_expired"
  | "path_conflict"
  | "network_error"
  | "quota_exceeded"
  | "unknown";

const ALLOWED_IMAGES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const ALLOWED_IMAGES_AND_PDF = [...ALLOWED_IMAGES, "application/pdf"];

function validateFileType(file: File, allowedTypes: AllowedFileType): string | null {
  if (allowedTypes === "any") return null;
  const allowed = allowedTypes === "image_or_pdf" ? ALLOWED_IMAGES_AND_PDF : ALLOWED_IMAGES;
  if (!allowed.includes(file.type)) {
    const typeLabel = allowedTypes === "image_or_pdf"
      ? "صور (JPG / PNG / WebP) أو PDF"
      : "صور (JPG / PNG / WebP)";
    if (/heic|heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name)) {
      return "صور iPhone بصيغة HEIC غير مدعومة. من إعدادات الجوال: الكاميرا ← الصِيَغ ← اختاري «الأكثر توافقاً»، أو حوّلي الصورة إلى JPG وأعيدي المحاولة.";
    }
    return `نوع الملف "${file.type || "غير معروف"}" غير مدعوم. يُسمح بـ: ${typeLabel}`;
  }
  return null;
}

/** تحقّق من أبعاد الصورة (للصور فقط) */
async function validateImageDimensions(file: File, maxDimension: number): Promise<string | null> {
  if (!file.type.startsWith("image/")) return null;

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      if (img.naturalWidth > maxDimension || img.naturalHeight > maxDimension) {
        resolve(
          `أبعاد الصورة كبيرة جداً (${img.naturalWidth}×${img.naturalHeight}). ` +
          `الحد الأقصى: ${maxDimension}×${maxDimension} بكسل. ` +
          `يرجى تصغير الصورة وإعادة المحاولة.`
        );
      } else {
        resolve(null);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      // إذا تعذّر قراءة الصورة، نسمح بالرفع (قد تكون PDF أو صيغة غير مدعومة للمعاينة)
      resolve(null);
    };
    img.src = url;
  });
}

function parseStorageError(error: any): { userMessage: string; errorType: UploadErrorType; details?: string } {
  const msg = String(error?.message || error?.error || error || "").toLowerCase();
  const status = Number(error?.statusCode || error?.status || 0);

  if (msg.includes("bucket not found") || msg.includes("no such bucket") || status === 404) {
    return {
      userMessage: "مجلد التخزين غير موجود. يرجى التواصل مع الدعم — المشكلة في إعداد الخادم.",
      errorType: "bucket_not_found",
      details: `Bucket not found (status: ${status}). Run migration 20260623130000.`,
    };
  }

  if (msg.includes("new row violates row-level security") ||
      msg.includes("permission denied") ||
      msg.includes("not authorized") ||
      msg.includes("policies") ||
      status === 403) {
    return {
      userMessage: "لا تملك صلاحية رفع الملف. تأكّد من تسجيل دخولك أو حدّث الصفحة وحاول مجدداً.",
      errorType: "permission_denied",
      details: `RLS policy violation (status: ${status}). Check storage policies for the bucket.`,
    };
  }

  if (msg.includes("jwt expired") || msg.includes("invalid jwt") || msg.includes("jwt") || status === 401) {
    return {
      userMessage: "انتهت صلاحية جلستك. يرجى تسجيل الدخول مجدداً ثم إعادة المحاولة.",
      errorType: "auth_expired",
      details: `JWT expired or invalid (status: ${status}).`,
    };
  }

  if (msg.includes("already exists") || msg.includes("duplicate") || msg.includes("409") || status === 409) {
    return {
      userMessage: "ملف بنفس الاسم موجود مسبقاً. جارٍ الاستبدال…",
      errorType: "path_conflict",
      details: `File already exists (status: ${status}).`,
    };
  }

  if (msg.includes("quota") || msg.includes("limit exceeded") || msg.includes("insufficient storage")) {
    return {
      userMessage: "مساحة التخزين ممتلئة. يرجى التواصل مع الدعم.",
      errorType: "quota_exceeded",
      details: `Storage quota exceeded.`,
    };
  }

  if (msg.includes("payload too large") || msg.includes("413") || status === 413) {
    return {
      userMessage: "حجم الملف يتجاوز الحد المسموح به في الخادم.",
      errorType: "file_too_large",
      details: `Payload too large (413).`,
    };
  }

  if (msg.includes("network") || msg.includes("timeout") || msg.includes("fetch") ||
      msg.includes("failed to fetch") || status === 0 || status >= 500) {
    return {
      userMessage: "انقطع الاتصال أثناء الرفع. تحقّق من اتصالك بالإنترنت وحاول مجدداً.",
      errorType: "network_error",
      details: `Network error (status: ${status}).`,
    };
  }

  return {
    userMessage: `تعذّر رفع الملف: ${msg.slice(0, 100)}. يرجى المحاولة مجدداً.`,
    errorType: "unknown",
    details: `Unknown error: ${msg}`,
  };
}

/**
 * دالة رفع الملف الرئيسية — تعالج جميع حالات الخطأ وتعيد رسائل واضحة.
 */
export async function uploadFile(
  file: File,
  config: UploadConfig,
): Promise<UploadResult> {
  const {
    bucket, path, maxMb = 10, allowedTypes = "image", upsert = false,
    maxDimension = 2048, targetSizeMb = 0.3,
  } = config;

  // 1. تحقّق من النوع
  const typeError = validateFileType(file, allowedTypes);
  if (typeError) {
    return { ok: false, error: typeError, userMessage: typeError, errorType: "invalid_type" };
  }

  // Optimize Image (Client-Side Compression) before anything else
  let finalFile = file;
  if (file.type.startsWith('image/') && file.type !== 'image/gif' && file.type !== 'image/svg+xml') {
    try {
      const options = {
        maxSizeMB: targetSizeMb,
        maxWidthOrHeight: maxDimension,
        useWebWorker: true,
        // JPEG دائماً للصور غير الشفافة — أصغر بكثير من PNG
        fileType: 'image/jpeg',
      };
      finalFile = await imageCompression(file, options);
    } catch (e) {
      console.warn("Image compression failed, falling back to original:", e);
    }
  }

  // إن غيّر الضغط نوع الصورة (HEIC → JPEG مثلاً) نُصحّح امتداد المسار
  let uploadPath = path;
  if (finalFile.type && finalFile.type !== file.type) {
    uploadPath = path.replace(/\.[^./]+$/, "") + (finalFile.type === "image/png" ? ".png" : ".jpg");
  }

  // 2. تحقّق من الحجم (using finalFile)
  const maxBytes = maxMb * 1024 * 1024;
  if (finalFile.size > maxBytes) {
    const sizeMb = (finalFile.size / 1024 / 1024).toFixed(1);
    const msg = `حجم الملف كبير (${sizeMb} MB). الحد الأقصى المسموح هو ${maxMb} MB.`;
    return { ok: false, error: msg, userMessage: msg, errorType: "file_too_large" };
  }

  // 3. تحقّق من أبعاد الصورة (using finalFile)
  const dimError = await validateImageDimensions(finalFile, maxDimension);
  if (dimError) {
    return { ok: false, error: dimError, userMessage: dimError, errorType: "invalid_dimension" };
  }

  // 4. تحقّق من الجلسة
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return {
      ok: false,
      error: "no session",
      userMessage: "انتهت جلستك. يرجى تسجيل الدخول مجدداً.",
      errorType: "auth_expired",
    };
  }

  // 5. رفع الملف
  try {
    const { error: uploadErr, data } = await supabase.storage
      .from(bucket)
      .upload(uploadPath, finalFile, {
        upsert,
        contentType: finalFile.type || "application/octet-stream",
        cacheControl: "3600",
      });

    if (uploadErr) {
      // إعادة محاولة بـ upsert=true عند التعارض
      const isConflict = String(uploadErr.message).toLowerCase().includes("already exists") ||
                         (uploadErr as any).statusCode === "409";
      if (isConflict && !upsert) {
        const { error: retryErr, data: retryData } = await supabase.storage
          .from(bucket)
          .upload(uploadPath, finalFile, { upsert: true, contentType: finalFile.type, cacheControl: "3600" });
        if (retryErr) {
          const { userMessage, errorType, details } = parseStorageError(retryErr);
          return { ok: false, error: retryErr.message, userMessage, errorType, details };
        }
        return { ok: true, path: retryData?.path || uploadPath };
      }

      const { userMessage, errorType, details } = parseStorageError(uploadErr);
      return { ok: false, error: uploadErr.message, userMessage, errorType, details };
    }

    return { ok: true, path: data?.path || uploadPath };
  } catch (e: any) {
    const { userMessage, errorType, details } = parseStorageError(e);
    return { ok: false, error: String(e?.message || e), userMessage, errorType, details };
  }
}

/**
 * مكوّن مرئي لعرض تقدّم الرفع وحالته (hook).
 */
export function useFileUpload() {
  const [status, setStatus] = React.useState<"idle" | "uploading" | "success" | "error">("idle");
  const [progress, setProgress] = React.useState(0);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const upload = async (file: File, config: UploadConfig): Promise<UploadResult> => {
    setStatus("uploading");
    setProgress(10);
    setErrorMsg(null);

    const interval = setInterval(() => {
      setProgress((p) => Math.min(p + 15, 85));
    }, 300);

    try {
      const result = await uploadFile(file, config);
      clearInterval(interval);

      if (result.ok) {
        setProgress(100);
        setStatus("success");
        setTimeout(() => { setProgress(0); setStatus("idle"); }, 2000);
      } else {
        setProgress(0);
        setStatus("error");
        setErrorMsg(result.userMessage);
        toast.error(result.userMessage);
      }

      return result;
    } catch (e: any) {
      clearInterval(interval);
      setProgress(0);
      setStatus("error");
      const msg = "تعذّر رفع الملف. يرجى المحاولة مجدداً.";
      setErrorMsg(msg);
      toast.error(msg);
      return { ok: false, error: String(e), userMessage: msg, errorType: "unknown" as const };
    }
  };

  return { upload, status, progress, errorMsg };
}

/**
 * رفع صورة الملف الشخصي (avatar / cover).
 * يستخدم مساراً ثابتاً (upsert=true) لاستبدال الصورة القديمة.
 */
export async function uploadProfilePhoto(
  file: File,
  userId: string,
  type: "avatar" | "cover",
): Promise<UploadResult> {
  const path = `${userId}/${type}.jpg`;
  const result = await uploadFile(file, {
    bucket: "avatars",
    path,
    maxMb: 5,
    allowedTypes: "image",
    upsert: true,
    // توفير التخزين: الأفاتار 512px، صورة الغلاف 1280px
    maxDimension: type === "avatar" ? 512 : 1280,
    targetSizeMb: type === "avatar" ? 0.1 : 0.25,
  });
  if (result.ok) {
    const { data } = supabase.storage.from("avatars").getPublicUrl(result.path);
    return { ...result, publicUrl: data.publicUrl };
  }
  return result;
}

/**
 * رفع صورة معرض الأعمال (portfolio).
 * يُخزَّن داخل bucket "avatars" العام تحت مجلد <uid>/portfolio/
 * مضغوطة إلى 1600px / ~300KB لتخفيف استهلاك التخزين.
 */
export async function uploadPortfolioPhoto(
  file: File,
  userId: string,
): Promise<UploadResult> {
  const path = `${userId}/portfolio/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const result = await uploadFile(file, {
    bucket: "avatars",
    path,
    maxMb: 10,
    allowedTypes: "image",
    upsert: false,
    maxDimension: 1600,
    targetSizeMb: 0.3,
  });
  if (result.ok) {
    const { data } = supabase.storage.from("avatars").getPublicUrl(result.path);
    return { ...result, publicUrl: data.publicUrl };
  }
  return result;
}


/**
 * رفع إثبات دفع (عربون / اشتراك).
 */
export async function uploadPaymentProof(
  file: File,
  opts: { bucket: "deposit-proofs" | "payment-proofs"; pathPrefix: string },
): Promise<UploadResult> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${opts.pathPrefix}/${Date.now()}.${ext}`;
  return uploadFile(file, {
    bucket: opts.bucket,
    path,
    maxMb: 5,
    allowedTypes: "image_or_pdf",
    upsert: false,
  });
}

/**
 * رفع صورة معرض التسليم (gallery photo).
 * يستخدم bucket "delivery-photos" (20MB، خاص — signed URLs).
 */
export async function uploadGalleryPhoto(
  file: File,
  opts: { photographerId: string; bookingId: string; galleryId: string },
): Promise<UploadResult> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${opts.photographerId}/${opts.bookingId}/${Date.now()}.${ext}`;
  return uploadFile(file, {
    bucket: "delivery-photos",
    path,
    maxMb: 20,
    allowedTypes: "image",
    upsert: false,
  });
}