import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type GoogleLinkStatus = {
  configured: boolean;
  connected: boolean;
  email: string | null;
  lastSyncAt: string | null;
  lastError: string | null;
  busyDays: number | null;
};

/** حالة ربط Google لصاحب الحساب (بدون أي توكن). */
export const getGoogleStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<GoogleLinkStatus> => {
    const { isGoogleConfigured } = await import("@/lib/google-calendar.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.from("google_calendar_links" as any)
      .select("google_email,last_sync_at,last_error,busy_days").eq("user_id", context.userId).maybeSingle();
    const l = data as any;
    return {
      configured: isGoogleConfigured(),
      connected: !!l,
      email: l?.google_email ?? null,
      lastSyncAt: l?.last_sync_at ?? null,
      lastError: l?.last_error ?? null,
      busyDays: l?.busy_days ?? null,
    };
  });

/** رابط صفحة موافقة Google — المتصفح ينتقل إليه ثم يعود إلى /api/public/google/callback. */
export const getGoogleConnectUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { isGoogleConfigured, googleAuthUrl } = await import("@/lib/google-calendar.server");
    if (!isGoogleConfigured()) throw new Error("ربط Google غير مفعّل بعد على المنصّة");
    return { url: await googleAuthUrl(context.userId) };
  });

export const syncGoogleNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { syncGoogleUser } = await import("@/lib/google-calendar.server");
    return await syncGoogleUser(context.userId);
  });

export const disconnectGoogle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { removeLink } = await import("@/lib/google-calendar.server");
    await removeLink(context.userId);
    return { ok: true };
  });
