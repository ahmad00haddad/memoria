// Server-only Cloudflare Turnstile verification.
// No-op (returns ok) when TURNSTILE_SECRET_KEY is not configured, so the
// booking flow keeps working until anti-abuse is switched on.

export async function verifyTurnstile(
  token: string | null | undefined,
  remoteIp?: string | null,
): Promise<{ ok: boolean; reason?: string }> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return { ok: true }; // feature disabled

  if (!token) return { ok: false, reason: "missing captcha token" };

  try {
    const body = new URLSearchParams();
    body.set("secret", secret);
    body.set("response", token);
    if (remoteIp) body.set("remoteip", remoteIp);

    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const data: any = await res.json().catch(() => ({}));
    if (data?.success === true) return { ok: true };
    return { ok: false, reason: (data?.["error-codes"] ?? []).join(",") || "verification failed" };
  } catch (e: any) {
    // On network failure, fail-open to avoid blocking legitimate bookings.
    console.error("[turnstile] verify error", e);
    return { ok: true };
  }
}
