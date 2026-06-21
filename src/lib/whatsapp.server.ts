// Server-only WhatsApp Cloud API sender.
// No-op (returns skipped) until WHATSAPP_API_TOKEN + WHATSAPP_PHONE_ID are set,
// so the booking flow keeps working until WhatsApp is switched on. Always
// fire-and-forget — never block a booking on WhatsApp delivery.

function normalizeMsisdn(raw: string): string {
  // Keep digits only. Cloud API expects the number in international format
  // WITHOUT '+' or leading zeros (e.g. Jordan: 9627XXXXXXXX).
  return (raw || "").replace(/[^0-9]/g, "").replace(/^0+/, "");
}

export async function sendWhatsApp(
  to: string | null | undefined,
  text: string,
): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const token = process.env.WHATSAPP_API_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  if (!token || !phoneId) return { ok: false, skipped: true };
  if (!to) return { ok: false, error: "no recipient" };

  const msisdn = normalizeMsisdn(to);
  if (msisdn.length < 8) return { ok: false, error: "invalid recipient" };

  try {
    const res = await fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: msisdn,
        type: "text",
        text: { body: text },
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, error: `${res.status} ${body}`.slice(0, 300) };
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || "whatsapp send failed" };
  }
}
