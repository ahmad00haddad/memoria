// ============================================================================
// telegram.server.ts — إشعارات المصوّرة عبر بوت تيليغرام (خادمي فقط، env-gated)
// ----------------------------------------------------------------------------
//   TELEGRAM_BOT_TOKEN       من @BotFather
//   TELEGRAM_BOT_USERNAME    اسم البوت بدون @ (لبناء رابط t.me)
//   TELEGRAM_WEBHOOK_SECRET  يُمرَّر لـ setWebhook كـ secret_token ويُتحقق منه في
//                            /api/public/hooks/telegram
// بدونها: كل الدوال no-op ولا ترمي.
// الربط: المصوّرة تفتح t.me/<bot>?start=<code> → البوت يستلم "/start <code>"
// → نحفظ chat_id في photographer_private.
// ============================================================================

export function isTelegramConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_BOT_USERNAME);
}

export function telegramBotUsername(): string | null {
  return process.env.TELEGRAM_BOT_USERNAME?.replace(/^@/, "") || null;
}

export async function sendTelegramMessage(chatId: number | string, html: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: html, parse_mode: "HTML", disable_web_page_preview: true }),
    });
    if (!res.ok) console.error("[telegram] sendMessage", res.status, (await res.text()).slice(0, 200));
    return res.ok;
  } catch (e) {
    console.error("[telegram] sendMessage failed", e);
    return false;
  }
}

export async function sendTelegramToPhotographer(photographerId: string, html: string): Promise<boolean> {
  if (!isTelegramConfigured()) return false;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await (supabaseAdmin as any).from("photographer_private")
    .select("telegram_chat_id").eq("user_id", photographerId).maybeSingle();
  if (!data?.telegram_chat_id) return false;
  return sendTelegramMessage(data.telegram_chat_id, html);
}
