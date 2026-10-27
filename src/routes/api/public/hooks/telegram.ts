import { createFileRoute } from "@tanstack/react-router";

// ============================================================================
// /api/public/hooks/telegram — webhook بوت تيليغرام
// ----------------------------------------------------------------------------
// يُسجَّل تلقائياً عند أول ضغطة «ربط تيليغرام» (ensureTelegramWebhook).
// تيليغرام يرسل الترويسة X-Telegram-Bot-Api-Secret-Token ونرفض أي طلب بدونها.
// "/start <code>" يربط المحادثة بحساب المصوّرة صاحبة الرمز.
// نعيد 200 دائماً بعد التحقق حتى لا يعيد تيليغرام الإرسال.
// ============================================================================

const ok = () => new Response("ok", { status: 200 });

export const Route = createFileRoute("/api/public/hooks/telegram")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
        if (!secret || request.headers.get("x-telegram-bot-api-secret-token") !== secret) {
          return new Response("Unauthorized", { status: 401 });
        }
        const update = (await request.json().catch(() => null)) as any;
        const msg = update?.message;
        const chatId = msg?.chat?.id;
        const text = String(msg?.text ?? "").trim();
        if (!chatId || !text) return ok();

        const { sendTelegramMessage } = await import("@/lib/telegram.server");
        const m = /^\/start\s+([a-f0-9]{24})$/.exec(text);
        if (!m) {
          await sendTelegramMessage(chatId, "أهلاً 👋 هذا بوت إشعارات ميموريا. للربط افتحي لوحة التحكم ← الملف الشخصي ← «الإشعارات»، واضغطي «ربط تيليغرام».");
          return ok();
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: row } = await (supabaseAdmin as any).from("photographer_private")
          .update({ telegram_chat_id: chatId, telegram_link_code: null, telegram_linked_at: new Date().toISOString() })
          .eq("telegram_link_code", m[1])
          .select("user_id").maybeSingle();
        await sendTelegramMessage(chatId, row
          ? "✅ تم الربط. من الآن رح توصلك هون كل طلبات الحجز والعربون والتذكيرات."
          : "الرابط منتهي أو مستخدم. ارجعي للوحة التحكم واضغطي «ربط تيليغرام» من جديد.");
        return ok();
      },
    },
  },
});
