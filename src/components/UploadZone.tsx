import React, { useCallback, useRef, useState } from "react";
import { Upload, X, CheckCircle2, AlertCircle, Loader2, Image as ImageIcon, FileText } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { uploadFile, type UploadConfig, type AllowedFileType } from "@/lib/upload";

// ============================================================================
// UploadZone.tsx — مكوّن رفع ملفات شامل مع تجربة مستخدم ممتازة
// ----------------------------------------------------------------------------
// يدعم:
//   - Drag & Drop
//   - اختيار ملف بالنقر
//   - معاينة الصورة قبل الرفع
//   - شريط تقدّم مرئي
//   - رسائل خطأ واضحة بالعربية
//   - إعادة المحاولة عند الفشل
//   - إلغاء الرفع
// ============================================================================

export type UploadZoneProps = {
  /** اسم الـ bucket */
  bucket: string;
  /** المسار في الـ bucket */
  path: string | ((file: File) => string);
  /** أقصى حجم بالـ MB */
  maxMb?: number;
  /** أنواع الملفات المسموحة */
  allowedTypes?: AllowedFileType;
  /** نص الـ placeholder */
  placeholder?: string;
  /** عند النجاح */
  onSuccess?: (path: string) => void;
  /** عند الفشل */
  onError?: (message: string) => void;
  /** هل يعمل مع anonymous uploads؟ */
  allowAnonymous?: boolean;
  /** ملف موجود مسبقاً (لعرض المعاينة) */
  existingUrl?: string | null;
  /** هل نُظهر معاينة؟ */
  showPreview?: boolean;
  /** className إضافية */
  className?: string;
  /** هل الـ upsert مفعّل؟ */
  upsert?: boolean;
  /** نص الزر */
  buttonLabel?: string;
  /** أيقونة المكوّن */
  compact?: boolean;
};

export function UploadZone({
  bucket,
  path,
  maxMb = 10,
  allowedTypes = "image",
  placeholder,
  onSuccess,
  onError,
  allowAnonymous = false,
  existingUrl,
  showPreview = true,
  className = "",
  upsert = false,
  buttonLabel = "اختر ملفاً أو اسحبه هنا",
  compact = false,
}: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(existingUrl ?? null);
  const [isDragging, setIsDragging] = useState(false);

  // Accept attribute for the file input
  const acceptAttr = allowedTypes === "image_or_pdf"
    ? "image/jpeg,image/png,image/webp,application/pdf"
    : allowedTypes === "image"
    ? "image/jpeg,image/png,image/webp"
    : "*";

  const handleFile = useCallback(async (file: File) => {
    if (!file) return;

    // معاينة فورية للصور
    if (showPreview && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }

    setStatus("uploading");
    setProgress(5);
    setErrorMsg(null);

    // شريط تقدّم تقريبي (Supabase لا يدعم progress events)
    const timer = setInterval(() => {
      setProgress((p) => {
        if (p >= 90) { clearInterval(timer); return 90; }
        return p + Math.random() * 15;
      });
    }, 400);

    try {
      const resolvedPath = typeof path === "function" ? path(file) : path;
      const config: UploadConfig = { bucket, path: resolvedPath, maxMb, allowedTypes, upsert };
      const result = await uploadFile(file, config);

      clearInterval(timer);

      if (result.ok) {
        setProgress(100);
        setStatus("success");
        onSuccess?.(result.path);
        toast.success("تم رفع الملف بنجاح ✓");
        setTimeout(() => { setProgress(0); setStatus("idle"); }, 3000);
      } else {
        setProgress(0);
        setStatus("error");
        setErrorMsg(result.userMessage);
        onError?.(result.userMessage);
        // لا نُعيد ضبط preview عند الخطأ — الصورة المعاينة تبقى
      }
    } catch (e: any) {
      clearInterval(timer);
      setProgress(0);
      setStatus("error");
      const msg = "تعذّر رفع الملف. تحقق من اتصالك وحاول مجدداً.";
      setErrorMsg(msg);
      onError?.(msg);
    }
  }, [bucket, path, maxMb, allowedTypes, upsert, showPreview, onSuccess, onError]);

  // Drag and Drop handlers
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // إعادة ضبط الـ input لدعم رفع نفس الملف مرة أخرى
    e.target.value = "";
  };

  const retry = () => {
    setStatus("idle");
    setErrorMsg(null);
    setProgress(0);
    inputRef.current?.click();
  };

  const remove = () => {
    setPreview(null);
    setStatus("idle");
    setErrorMsg(null);
    setProgress(0);
    if (inputRef.current) inputRef.current.value = "";
  };

  // Compact mode (زر بسيط)
  if (compact) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <input
          ref={inputRef}
          type="file"
          accept={acceptAttr}
          onChange={handleInputChange}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={status === "uploading"}
          className="inline-flex items-center gap-2 border border-border px-3 py-2 rounded-sm text-sm hover:bg-secondary transition-colors disabled:opacity-50"
        >
          {status === "uploading" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          {buttonLabel}
        </button>
        {status === "uploading" && (
          <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-gold transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
        {status === "success" && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
        {status === "error" && (
          <div className="flex items-center gap-2 text-destructive text-xs">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
            <button onClick={retry} className="underline">أعد المحاولة</button>
          </div>
        )}
      </div>
    );
  }

  // Full mode (منطقة كاملة)
  return (
    <div className={className}>
      <input
        ref={inputRef}
        type="file"
        accept={acceptAttr}
        onChange={handleInputChange}
        className="hidden"
      />

      {/* معاينة الصورة الحالية */}
      {showPreview && preview && (
        <div className="relative mb-3 rounded-md overflow-hidden border border-border">
          <img
            src={preview}
            alt="معاينة"
            className="w-full max-h-48 object-cover"
            onError={() => setPreview(null)}
          />
          <button
            type="button"
            onClick={remove}
            className="absolute top-2 left-2 bg-black/60 text-white rounded-full p-1 hover:bg-black/80"
            title="إزالة الصورة"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* منطقة الإفلات */}
      <div
        onClick={() => status !== "uploading" && inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          border-2 border-dashed rounded-md p-6 text-center cursor-pointer transition-all
          ${isDragging ? "border-gold bg-gold/5 scale-[1.01]" : "border-border hover:border-gold/50 hover:bg-secondary/30"}
          ${status === "uploading" ? "pointer-events-none opacity-70" : ""}
          ${status === "error" ? "border-destructive/50 bg-destructive/5" : ""}
          ${status === "success" ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/20" : ""}
        `}
      >
        {status === "uploading" ? (
          <div className="space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-gold mx-auto" />
            <p className="text-sm text-muted-foreground">جارٍ الرفع…</p>
            <div className="h-2 bg-secondary rounded-full overflow-hidden max-w-xs mx-auto">
              <div
                className="h-full bg-gold transition-all duration-300 rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">{Math.round(progress)}%</p>
          </div>
        ) : status === "success" ? (
          <div className="space-y-2">
            <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">تم رفع الملف بنجاح!</p>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
              className="text-xs text-muted-foreground underline"
            >
              استبدال الملف
            </button>
          </div>
        ) : status === "error" ? (
          <div className="space-y-2">
            <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
            <p className="text-sm text-destructive font-medium">{errorMsg}</p>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); retry(); }}
              className="text-xs underline text-muted-foreground hover:text-foreground"
            >
              إعادة المحاولة
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex justify-center gap-2">
              {allowedTypes === "image_or_pdf" ? (
                <>
                  <ImageIcon className="h-7 w-7 text-muted-foreground/60" />
                  <FileText className="h-7 w-7 text-muted-foreground/60" />
                </>
              ) : (
                <Upload className="h-8 w-8 text-muted-foreground/60" />
              )}
            </div>
            <p className="text-sm font-medium">{buttonLabel}</p>
            {placeholder && <p className="text-xs text-muted-foreground">{placeholder}</p>}
            <p className="text-xs text-muted-foreground">
              {allowedTypes === "image_or_pdf"
                ? "JPG · PNG · WebP · PDF"
                : "JPG · PNG · WebP"} • حتى {maxMb} MB
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
