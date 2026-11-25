// تحقق Turnstile على الخادم. بلا سرّ مضبوط = معطّل (لا يحجب شيئاً).
export type TurnstileResult = "ok" | "missing" | "invalid" | "disabled" | "unavailable";

export async function verifyTurnstile(token: string | null | undefined, ip?: string): Promise<TurnstileResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return "disabled";
  if (!token) return "missing";
  try {
    const body = new URLSearchParams({ secret, response: token });
    if (ip && ip !== "unknown") body.set("remoteip", ip);
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body });
    if (!res.ok) return "unavailable";
    const j = (await res.json()) as { success?: boolean };
    return j.success ? "ok" : "invalid";
  } catch {
    return "unavailable"; // عطل Cloudflare لا يوقف الحجز
  }
}
