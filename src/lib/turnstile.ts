// Cloudflare Turnstile (مجاني): فحص بوت غير مزعج. يُنفَّذ عند الإرسال فقط، وبصمت إن أمكن.
// المفتاح العلني (site key) ليس سرّاً. السرّ TURNSTILE_SECRET_KEY على الـ Worker فقط.
const SITE_KEY = (import.meta as any).env?.VITE_TURNSTILE_SITE_KEY || "0x4AAAAAAGSmKOozcWPBVcWe";

let scriptP: Promise<void> | null = null;
function loadScript(): Promise<void> {
  if (scriptP) return scriptP;
  scriptP = new Promise((resolve, reject) => {
    if ((window as any).turnstile) return resolve();
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => { scriptP = null; reject(new Error("turnstile script blocked")); };
    document.head.appendChild(s);
  });
  return scriptP;
}

/** يعيد رمز Turnstile أو null (الإضافة محجوبة/المهلة). الخادم يقرّر ماذا يفعل بغياب الرمز. */
export async function getTurnstileToken(timeoutMs = 12000): Promise<string | null> {
  if (typeof window === "undefined" || !SITE_KEY) return null;
  try {
    await loadScript();
    const ts = (window as any).turnstile;
    if (!ts) return null;
    const box = document.createElement("div");
    box.style.cssText = "position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:2147483000;";
    document.body.appendChild(box);
    return await new Promise<string | null>((resolve) => {
      let done = false;
      const finish = (v: string | null) => {
        if (done) return;
        done = true;
        try { ts.remove(id); } catch { /* ignore */ }
        box.remove();
        resolve(v);
      };
      const id = ts.render(box, {
        sitekey: SITE_KEY,
        appearance: "interaction-only",
        callback: (t: string) => finish(t),
        "error-callback": () => finish(null),
        "timeout-callback": () => finish(null),
      });
      setTimeout(() => finish(null), timeoutMs);
    });
  } catch {
    return null;
  }
}
