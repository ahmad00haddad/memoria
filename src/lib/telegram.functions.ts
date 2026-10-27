import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { t } from "@/i18n";

export type NotifyChannels = {
  email: string | null;
  telegram: { configured: boolean; linked: boolean };
};

/** قنوات إشعارات المصوّرة: الإيميل دائماً مفعّل، وتيليغرام اختياري. */
export const getNotifyChannels = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<NotifyChannels> => {
    const { isTelegramConfigured } = await import("@/lib/telegram.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: u } = await supabaseAdmin.auth.admin.getUserById(context.userId);
    const { data: pp } = await (supabaseAdmin as any).from("photographer_private")
      .select("telegram_chat_id").eq("user_id", context.userId).maybeSingle();
    return {
      email: u?.user?.email ?? null,
      telegram: { configured: isTelegramConfigured(), linked: !!pp?.telegram_chat_id },
    };
  });

/** رابط t.me برمز ربط جديد — المصوّرة تفتحه وتضغط Start. */
export const getTelegramLinkUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { isTelegramConfigured, telegramBotUsername } = await import("@/lib/telegram.server");
    if (!isTelegramConfigured()) throw new Error(t("إشعارات تيليغرام غير مفعّلة بعد على المنصّة"));
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const bytes = crypto.getRandomValues(new Uint8Array(12));
    const code = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    const { error } = await (supabaseAdmin as any).from("photographer_private")
      .upsert({ user_id: context.userId, telegram_link_code: code }, { onConflict: "user_id" });
    if (error) throw new Error(error.message);
    return { url: `https://t.me/${telegramBotUsername()}?start=${code}` };
  });

export const unlinkTelegram = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await (supabaseAdmin as any).from("photographer_private")
      .update({ telegram_chat_id: null, telegram_link_code: null, telegram_linked_at: null })
      .eq("user_id", context.userId);
    return { ok: true };
  });

export const sendTelegramTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { sendTelegramToPhotographer } = await import("@/lib/telegram.server");
    const ok = await sendTelegramToPhotographer(context.userId, "✅ رسالة تجربة من ميموريا. هيك رح توصلك إشعارات الحجوزات.");
    if (!ok) throw new Error(t("تعذّر الإرسال — أعيدي ربط تيليغرام"));
    return { ok: true };
  });
