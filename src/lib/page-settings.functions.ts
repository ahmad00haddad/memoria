import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { sanitizePageSettings, type PageSettings } from "@/lib/page-settings";

// حفظ إعدادات الصفحة العامة — المصوّرة تعدّل صفحتها فقط، والقيم تُنظّف قبل الحفظ.
export const savePageSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { settings: Partial<PageSettings> }) => {
    if (!d || typeof d.settings !== "object" || d.settings === null) throw new Error("invalid settings");
    return { settings: sanitizePageSettings(d.settings) };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    const { error } = await supabase
      .from("profiles")
      .update({ page_settings: data.settings, updated_at: new Date().toISOString() })
      .eq("id", userId);
    if (error) throw new Error(error.message);
    return { ok: true, settings: data.settings };
  });
