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
        // الرمز يصل إما مع /start (من الرابط) أو مكتوباً لوحده (إذا كتبته المصوّرة يدوياً)
        const m = /^(?:\/start\s+)?([A-Za-z0-9]{8})$/.exec(text);
        if (!m) {
          await sendTelegramMessage(chatId, [
            "أهلاً 👋 هذا بوت إشعارات ميموريا.",
            "",
            "للربط:",
            "1. افتحي ميموريا ← لوحة التحكم ← الملف الشخصي ← «الإشعارات».",
            "2. اضغطي «فتح تيليغرام والربط»، أو انسخي الرمز المكوّن من 8 أحرف وابعتيه هون.",
          ].join("\n"));
          return ok();
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: row } = await (supabaseAdmin as any).from("photographer_private")
          .update({ telegram_chat_id: chatId, telegram_link_code: null, telegram_linked_at: new Date().toISOString() })
          .eq("telegram_link_code", m[1].toUpperCase())
          .select("user_id").maybeSingle();
        await sendTelegramMessage(chatId, row
          ? [
              "✅ تم الربط بنجاح!",
              "",
              "من الآن رح يوصلك هون:",
              "• كل طلب حجز جديد (وعندك 24 ساعة توافقي أو ترفضي)",
              "• إثبات العربون لما العروس تحوّل",
              "• تذكير قبل ما تنتهي مهلة الرد",
              "",
              "خلّي إشعارات تيليغرام مفعّلة على موبايلك 🔔",
            ].join("\n")
          : "الرمز غير صحيح أو مستخدم. ارجعي لميموريا واضغطي «فتح تيليغرام والربط» من جديد لتحصلي على رمز جديد.");
        return ok();
      },
    },
  },
});
