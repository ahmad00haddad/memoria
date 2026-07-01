import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ============================================================================
// upload-diagnostic.functions.ts — تشخيص مشاكل الرفع (server-authoritative)
// ----------------------------------------------------------------------------
// يوفّر للواجهة معلومات تشخيصية واضحة عن حالة التخزين:
//   * checkUploadHealth — هل الـ buckets موجودة؟ هل RLS مفعّل؟
//   * getUploadConfig — إعدادات الرفع للواجهة (أنواع، أحجام، buckets).
//
// الاستخدام: تستدعيها الواجهة عند فشل الرفع لعرض رسالة تشخيصية واضحة.
// ============================================================================

export const checkUploadHealth = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    // 1) تحقّق من الجلسة.
    if (!userId) {
      return {
        healthy: false,
        error: "انتهت الجلسة. سجّل الدخول مجدداً.",
        errorType: "auth_expired" as const,
      };
    }

    // 2) تحقّق من وجود الـ buckets الأساسية.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: healthData, error: healthErr } = await supabaseAdmin.rpc("check_storage_health");

    if (healthErr) {
      return {
        healthy: false,
        error: `تعذّر فحص حالة التخزين: ${healthErr.message}`,
        errorType: "unknown" as const,
      };
    }

    const data = (healthData ?? {}) as any;
    const buckets = (data.buckets ?? []) as any[];
    const rlsEnabled = Boolean(data.rls_enabled);
    const policyCount = Number(data.policy_count ?? 0);

    // 3) تحقّق من bucket محدّد (avatars) بمحاولة list.
    const { data: listData, error: listErr } = await supabase.storage
      .from("avatars")
      .list(`${userId}/`, { limit: 1 });

    const canListAvatars = !listErr;

    // 4) تشخيص شامل.
    const issues: string[] = [];

    if (!rlsEnabled) {
      issues.push("RLS غير مفعّل على storage.objects — هذا خطر أمني.");
    }

    if (policyCount < 5) {
      issues.push(`عدد سياسات التخزين منخفض (${policyCount}). قد لا تكون الـ buckets مضبوطة.`);
    }

    const requiredBuckets = ["avatars", "deposit-proofs", "payment-proofs", "delivery-photos", "portfolio"];
    const existingBuckets = buckets.map((b: any) => b.id);
    for (const req of requiredBuckets) {
      if (!existingBuckets.includes(req)) {
        issues.push(`Bucket "${req}" غير موجود. شغّل migration التخزين.`);
      }
    }

    if (!canListAvatars) {
      const errMsg = String(listErr?.message || "").toLowerCase();
      if (errMsg.includes("bucket not found")) {
        issues.push("Bucket \"avatars\" غير موجود في Supabase. شغّل migration 20260623130000.");
      } else if (errMsg.includes("jwt") || errMsg.includes("401")) {
        issues.push("انتهت صلاحية الجلسة. سجّل الدخول مجدداً.");
      } else if (errMsg.includes("rls") || errMsg.includes("policy") || errMsg.includes("403")) {
        issues.push("لا تملك صلاحية الوصول إلى التخزين. تحقّق من سياسات RLS.");
      } else {
        issues.push(`تعذّر الوصول إلى bucket \"avatars\": ${listErr?.message || "خطأ غير معروف"}`);
      }
    }

    return {
      healthy: issues.length === 0,
      issues,
      buckets: buckets.map((b: any) => ({
        id: b.id,
        public: b.public,
        file_size_limit_mb: b.file_size_limit ? Math.round(b.file_size_limit / 1024 / 1024) : null,
        allowed_mime_types: b.allowed_mime_types,
      })),
      rls_enabled: rlsEnabled,
      policy_count: policyCount,
      can_list_avatars: canListAvatars,
      user_id: userId,
    };
  });

// إعدادات الرفع للواجهة (أنواع مسموحة، أحجام قصوى، أسماء buckets).
export const getUploadConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    return {
      buckets: {
        avatars: {
          max_mb: 5,
          allowed_types: ["image/jpeg", "image/png", "image/webp", "image/gif"],
          allowed_label: "صور (JPG / PNG / WebP / GIF)",
          public: true,
        },
        "deposit-proofs": {
          max_mb: 5,
          allowed_types: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
          allowed_label: "صور (JPG / PNG / WebP) أو PDF",
          public: false,
        },
        "payment-proofs": {
          max_mb: 5,
          allowed_types: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
          allowed_label: "صور (JPG / PNG / WebP) أو PDF",
          public: false,
        },
        "delivery-photos": {
          max_mb: 20,
          allowed_types: ["image/jpeg", "image/png", "image/webp"],
          allowed_label: "صور (JPG / PNG / WebP)",
          public: false,
        },
        portfolio: {
          max_mb: 10,
          allowed_types: ["image/jpeg", "image/png", "image/webp"],
          allowed_label: "صور (JPG / PNG / WebP)",
          public: true,
        },
      },
    };
  });