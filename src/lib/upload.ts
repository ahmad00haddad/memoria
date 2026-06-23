import { toast } from "sonner";

// ============================================================================
// upload.ts — مساعد رفع الملفات الشامل
// ----------------------------------------------------------------------------
// يحل المشاكل الأكثر شيوعاً عند رفع الملفات:
//   1. Bucket غير موجود
//   2. صلاحيات غير كافية (RLS)
//   3. حجم الملف كبير
//   4. نوع الملف غير مسموح
//   5. انتهاء صلاحية التوكن
//   6. تعارض المسار (ملف موجود مسبقاً)
//   7. انقطاع الشبكة
//   8. حصة التخزين ممتلئة
// ============================================================================

import { supabase } from "@/integrations/supabase/client";

export type AllowedFileType = "image" | "image_or_pdf" | "any";

export type UploadConfig = {
  /** اسم الـ bucket في Supabase Storage */
  bucket: string;
  /** المسار داخل الـ bucket */
  path: string;
  /** أقصى حجم بالـ MB (افتراضي: 10MB) */
  maxMb?: number;
  /** نوع الملفات المسموحة */
  allowedTypes?: AllowedFileType;
  /** هل نُضيف upsert لتجنب تعارض المسار؟ */
  upsert?: boolean;
};

export type UploadResult = {
  ok: true;
  path: string;
  publicUrl?: string;
} | {
  ok: false;
  error: string;
  /** رسالة للمستخدم (عربية، واضحة) */
  userMessage: string;
  /** نوع الخطأ للـ logging */
  errorType: UploadErrorType;
};

export type UploadErrorType =
  | "file_too_large"
  | "invalid_type"
  | "bucket_not_found"
  | "permission_denied"
  | "auth_expired"
  | "path_conflict"
  | "network_error"
  | "quota_exceeded"
  | "unknown";

const ALLOWED_IMAGES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const ALLOWED_IMAGES_AND_PDF = [...ALLOWED_IMAGES, "application/pdf"];

/** تحقق من نوع الملف قبل الرفع */
function validateFileType(file: File, allowedTypes: AllowedFileType): string | null {
  if (allowedTypes === "any") return null;
  const allowed = allowedTypes === "image_or_pdf" ? ALLOWED_IMAGES_AND_PDF : ALLOWED_IMAGES;
  if (!allowed.includes(file.type)) {
    const typeLabel = allowedTypes === "image_or_pdf"
      ? "صور (JPG / PNG / WebP) أو PDF"
      : "صور (JPG / PNG / WebP)";
    return `نوع الملف غير مدعوم. يُسمح بـ: ${typeLabel}`;
  }
  return null;
}

/** تحويل رسالة خطأ Supabase إلى رسالة مفهومة للمستخدم */
function parseStorageError(error: any): { userMessage: string; errorType: UploadErrorType } {
  const msg = String(error?.message || error?.error || error || "").toLowerCase();
  const status = Number(error?.statusCode || error?.status || 0);

  // Bucket not found
  if (msg.includes("bucket not found") || msg.includes("no such bucket") || status === 404) {
    return {
      userMessage: "مشكلة في إعداد التخزين. يرجى التواصل مع الدعم.",
      errorType: "bucket_not_found",
    };
  }

  // Permission denied / RLS
  if (msg.includes("new row violates row-level security") ||
      msg.includes("permission denied") ||
      msg.includes("not authorized") ||
      msg.includes("policies") ||
      status === 403) {
    return {
      userMessage: "لا تملك صلاحية رفع الملف. تأكد من تسجيل دخولك أو حدّث الصفحة وحاول مجدداً.",
      errorType: "permission_denied",
    };
  }

  // Auth expired / JWT
  if (msg.includes("jwt expired") || msg.includes("invalid jwt") || msg.includes("jwt") || status === 401) {
    return {
      userMessage: "انتهت صلاحية جلستك. يرجى تسجيل الدخول مجدداً.",
      errorType: "auth_expired",
    };
  }

  // File already exists
  if (msg.includes("already exists") || msg.includes("duplicate") || msg.includes("409") || status === 409) {
    return {
      userMessage: "ملف بهذا الاسم موجود مسبقاً. جاري الاستبدال…",
      errorType: "path_conflict",
    };
  }

  // Storage quota
  if (msg.includes("quota") || msg.includes("limit exceeded") || msg.includes("insufficient storage")) {
    return {
      userMessage: "مساحة التخزين ممتلئة. يرجى التواصل مع الدعم.",
      errorType: "quota_exceeded",
    };
  }

  // Network / timeout
  if (msg.includes("network") || msg.includes("timeout") || msg.includes("fetch") ||
      msg.includes("failed to fetch") || status === 0 || status >= 500) {
    return {
      userMessage: "انقطع الاتصال أثناء الرفع. تحقق من اتصالك بالإنترنت وحاول مجدداً.",
      errorType: "network_error",
    };
  }

  return {
    userMessage: "تعذّر رفع الملف. يرجى المحاولة مجدداً.",
    errorType: "unknown",
  };
}

/**
 * دالة رفع الملف الرئيسية — تعالج جميع حالات الخطأ وتعيد رسائل واضحة.
 */
export async function uploadFile(
  file: File,
  config: UploadConfig,
): Promise<UploadResult> {
  const { bucket, path, maxMb = 10, allowedTypes = "image", upsert = false } = config;

  // 1. تحقق من النوع (client-side)
  const typeError = validateFileType(file, allowedTypes);
  if (typeError) {
    return { ok: false, error: typeError, userMessage: typeError, errorType: "invalid_type" };
  }

  // 2. تحقق من الحجم (client-side)
  const maxBytes = maxMb * 1024 * 1024;
  if (file.size > maxBytes) {
    const sizeMb = (file.size / 1024 / 1024).toFixed(1);
    const msg = `حجم الملف كبير (${sizeMb} MB). الحد الأقصى المسموح هو ${maxMb} MB.`;
    return { ok: false, error: msg, userMessage: msg, errorType: "file_too_large" };
  }

  // 3. تحقق من الجلسة قبل الرفع
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return {
      ok: false,
      error: "no session",
      userMessage: "انتهت جلستك. يرجى تسجيل الدخول مجدداً.",
      errorType: "auth_expired",
    };
  }

  // 4. رفع الملف
  try {
    const { error: uploadErr, data } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        upsert,
        contentType: file.type || "application/octet-stream",
        cacheControl: "3600",
      });

    if (uploadErr) {
      // إذا كان الخطأ "already exists" وupsert=false، نحاول مرة بـ upsert=true
      const isConflict = String(uploadErr.message).toLowerCase().includes("already exists") ||
                         (uploadErr as any).statusCode === "409";
      if (isConflict && !upsert) {
        const { error: retryErr, data: retryData } = await supabase.storage
          .from(bucket)
          .upload(path, file, { upsert: true, contentType: file.type, cacheControl: "3600" });
        if (retryErr) {
          const { userMessage, errorType } = parseStorageError(retryErr);
          return { ok: false, error: retryErr.message, userMessage, errorType };
        }
        return { ok: true, path: retryData?.path || path };
      }

      const { userMessage, errorType } = parseStorageError(uploadErr);
      return { ok: false, error: uploadErr.message, userMessage, errorType };
    }

    return { ok: true, path: data?.path || path };
  } catch (e: any) {
    const { userMessage, errorType } = parseStorageError(e);
    return { ok: false, error: String(e?.message || e), userMessage, errorType };
  }
}

/**
 * مُكوّن مرئي لعرض تقدّم الرفع وحالته (hook).
 * الاستخدام: const { upload, status, progress } = useFileUpload();
 */
export function useFileUpload() {
  const [status, setStatus] = React.useState<"idle" | "uploading" | "success" | "error">("idle");
  const [progress, setProgress] = React.useState(0);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const upload = async (file: File, config: UploadConfig): Promise<UploadResult> => {
    setStatus("uploading");
    setProgress(10);
    setErrorMsg(null);

    // محاكاة تقدم الرفع (Supabase لا يدعم progress events)
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
      return { ok: false, error: String(e), userMessage: msg, errorType: "unknown" };
    }
  };

  return { upload, status, progress, errorMsg };
}

// React import for the hook
import React from "react";

/**
 * مساعد لرفع صورة الملف الشخصي (avatar / cover).
 * يُعيد الـ path في Supabase Storage.
 */
export async function uploadProfilePhoto(
  file: File,
  userId: string,
  type: "avatar" | "cover",
): Promise<UploadResult> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  // استخدام نفس الاسم دائماً (upsert=true) لتجنب تكديس الملفات القديمة
  const path = `${userId}/${type}.${ext}`;
  return uploadFile(file, {
    bucket: "avatars",
    path,
    maxMb: 5,
    allowedTypes: "image",
    upsert: true,
  });
}

/**
 * مساعد لرفع إثبات الدفع (عربون / اشتراك).
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
 * مساعد لرفع صور المعرض (تسليم الصور للعميل).
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
