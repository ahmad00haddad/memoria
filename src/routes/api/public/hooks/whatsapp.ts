import { createFileRoute } from "@tanstack/react-router";

// ============================================================================
// /api/public/hooks/whatsapp — webhook واتساب (WhatsApp Cloud API من Meta)
// ----------------------------------------------------------------------------
// GET : تحقق Meta من الـ webhook (hub.verify_token = WHATSAPP_VERIFY_TOKEN).
// POST: رسائل واردة. إذا احتوت رمز 6 أرقام يطابق verify_code_wa لحجز غير مؤكد
//       ومُرسلة من نفس رقم الحجز → نؤكد الحجز ونرد برابط التتبع. الرد مجاني لأن
//       العروس هي من بدأت المحادثة (نافذة خدمة 24 ساعة).
// التوقيع: X-Hub-Signature-256 بـ WHATSAPP_APP_SECRET (يُرفض الطلب إن لم يطابق).
// نعيد 200 دائماً بعد التحقق حتى لا تعيد Meta الإرسال على أخطاء منطقية.
// ============================================================================

async function validSignature(raw: string, header: string | null): Promise<boolean> {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret) return false;
  if (!header?.startsWith("sha256=")) return false;
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(raw)));
  const hex = Array.from(mac, (b) => b.toString(16).padStart(2, "0")).join("");
  const given = header.slice(7);
  if (given.length !== hex.length) return false;
  let diff = 0;
  for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ given.charCodeAt(i);
  return diff === 0;
}

const ok = () => new Response("ok", { status: 200 });

export const Route = createFileRoute("/api/public/hooks/whatsapp")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const expected = process.env.WHATSAPP_VERIFY_TOKEN;
        if (
          expected &&
          url.searchParams.get("hub.mode") === "subscribe" &&
          url.searchParams.get("hub.verify_token") === expected
        ) {
          return new Response(url.searchParams.get("hub.challenge") ?? "", { status: 200 });
        }
        return new Response("forbidden", { status: 403 });
      },

      POST: async ({ request }) => {
        const raw = await request.text();
        if (!(await validSignature(raw, request.headers.get("x-hub-signature-256")))) {
          return new Response("invalid signature", { status: 401 });
        }

        let body: any;
        try { body = JSON.parse(raw); } catch { return ok(); }

        const messages: any[] = [];
        for (const entry of body?.entry ?? []) {
          for (const change of entry?.changes ?? []) {
            for (const m of change?.value?.messages ?? []) messages.push(m);
          }
        }
        if (messages.length === 0) return ok(); // تحديثات حالة (delivered/read) — لا شيء

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const v = await import("@/lib/verification.server");
        const { sendWhatsAppText } = await import("@/lib/whatsapp.server");

        for (const m of messages) {
          try {
            const from: string = m?.from ?? "";
            const text: string = m?.text?.body ?? m?.button?.text ?? "";
            const code = text.match(/\b(\d{6})\b/)?.[1];
            if (!from || !code) continue;

            const { data: candidates } = await supabaseAdmin
              .from("bookings")
              .select("id, client_phone, client_tracking_token, verify_expires_at, phone_verified_at")
              .eq("verify_code_wa" as any, code)
              .is("phone_verified_at" as any, null)
              .is("deleted_at", null)
              .limit(5);

            const match = (candidates ?? []).find((b: any) => v.phoneKey(b.client_phone) === v.phoneKey(from));
            if (!match) {
              if ((candidates ?? []).length > 0) {
                await sendWhatsAppText(from, "⚠️ يجب إرسال الرمز من نفس رقم الهاتف الذي استخدمتِه في طلب الحجز.");
              } else {
                await sendWhatsAppText(from, "لم نجد طلب حجز بهذا الرمز، أو انتهت مهلته. جرّبي الحجز من جديد من صفحة المصوّرة.");
              }
              continue;
            }
            const b: any = match;
            if (b.verify_expires_at && new Date(b.verify_expires_at).getTime() < Date.now()) {
              await sendWhatsAppText(from, "انتهت مهلة هذا الرمز (30 دقيقة). جرّبي الحجز من جديد.");
              continue;
            }

            await v.markBookingVerified(b.id, "whatsapp");
            await sendWhatsAppText(from, [
              "تم تأكيد طلب حجزك ✅",
              "",
              "رابط تتبع حجزك — احفظيه، منه ترسلين العربون وتتابعين كل شيء:",
              `${v.appBase()}/track/${b.client_tracking_token}`,
            ].join("\n"));
          } catch (e) {
            console.error("[whatsapp-hook] message handling failed", e);
          }
        }
        return ok();
      },
    },
  },
});
