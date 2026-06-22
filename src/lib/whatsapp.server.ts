// ============================================================================
// whatsapp.server.ts — مساعد WhatsApp Cloud API (خادمي فقط، env-gated)
// ----------------------------------------------------------------------------
// لا تستورد هذا الملف من كود العميل/المتصفح. حمّله ديناميكياً داخل معالِجات
// server-fn / server-route فقط.
//
// السلوك (على نمط email.server.ts):
//   * عند غياب WHATSAPP_API_TOKEN أو WHATSAPP_PHONE_ID → no-op آمن (skipped=true)
//     ولا يرمي خطأً إطلاقاً، حتى لا يتعطّل تدفّق الحجز/الدفع.
//   * Workers-safe: يستخدم fetch فقط.
// ============================================================================

export function isWhatsAppConfigured(): boolean {
  return Boolean(process.env.WHATSAPP_API_TOKEN && process.env.WHATSAPP_PHONE_ID);
}

/** تطبيع رقم الهاتف إلى الصيغة الدولية التي يتوقّعها واتساب (أرقام فقط). */
function normalizePhone(phone: string): string {
  let p = (phone || "").replace(/[^\d+]/g, "");
  if (p.startsWith("+")) p = p.slice(1);
  if (p.startsWith("00")) p = p.slice(2);
  // أرقام أردنية محلية تبدأ بـ 0 → استبدال بمقدّمة الدولة 962.
  if (p.startsWith("0")) p = "962" + p.slice(1);
  return p;
}

export type WhatsAppResult = { ok: boolean; id?: string; error?: string; skipped?: boolean };

/**
 * إرسال رسالة نصّية بسيطة عبر WhatsApp Cloud API.
 * يُفضّل لاحقاً استخدام القوالب المعتمدة (templates) للرسائل خارج نافذة 24 ساعة؛
 * أُبقيت الواجهة بسيطة لتسهيل التوسعة من Lovable.
 */
export async function sendWhatsAppText(to: string, body: string): Promise<WhatsAppResult> {
  const token = process.env.WHATSAPP_API_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;

  // غير مهيّأ → تجاهل بأمان (لا نكسر التدفّق).
  if (!token || !phoneId) return { ok: false, skipped: true };

  const recipient = normalizePhone(to);
  if (!recipient || recipient.length < 8) return { ok: false, error: "invalid recipient phone" };

  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: recipient,
        type: "text",
        text: { body },
      }),
    });
    const json: any = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: json?.error?.message || `HTTP ${res.status}` };
    }
    return { ok: true, id: json?.messages?.[0]?.id };
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) };
  }
}
