import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

// ─── Last login on this device ("continue as …") ───
export type LastLogin = { email: string; name?: string; avatar?: string; provider: "google" | "email" };
const KEY = "memoria_last_login";

export function readLastLogin(): LastLogin | null {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "null");
    return v && typeof v.email === "string" ? v : null;
  } catch { return null; }
}

export function forgetLastLogin() {
  try { localStorage.removeItem(KEY); localStorage.removeItem("memoria_last_email"); } catch { /* ignore */ }
}

export function rememberLogin(session: Session | null) {
  const u = session?.user;
  if (!u?.email) return;
  const m = (u.user_metadata ?? {}) as Record<string, any>;
  // Which button was used this time: an id-token/OAuth session from Google carries Google's avatar.
  const viaGoogle = u.app_metadata?.provider === "google"
    || (Array.isArray(u.app_metadata?.providers) && u.app_metadata.providers.includes("google") && !!(m.avatar_url || m.picture));
  const provider: LastLogin["provider"] = viaGoogle ? "google" : "email";
  const v: LastLogin = { email: u.email, provider, name: m.full_name || m.name || undefined, avatar: m.avatar_url || m.picture || undefined };
  try { localStorage.setItem(KEY, JSON.stringify(v)); localStorage.setItem("memoria_last_email", u.email); } catch { /* ignore */ }
}

// ─── Redirect sign-in (fallback, always works) ───
export async function googleRedirect(redirectPath = "/dashboard", loginHint?: string) {
  return supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}${redirectPath}`,
      // A known account goes straight in; otherwise Google always shows the account chooser.
      queryParams: loginHint ? { login_hint: loginHint } : { prompt: "select_account" },
    },
  });
}

// ─── One Tap (account chooser on our own page, no redirect) ───
declare global { interface Window { google?: any } }

let scriptP: Promise<void> | null = null;
function loadGsi() {
  if (window.google?.accounts?.id) return Promise.resolve();
  scriptP ??= new Promise<void>((res, rej) => {
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.onload = () => res();
    s.onerror = () => { scriptP = null; rej(new Error("gsi load failed")); };
    document.head.appendChild(s);
  });
  return scriptP;
}

async function sha256Hex(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Shows Google One Tap. Resolves silently if unavailable; calls onSignedIn after a successful Supabase session. */
export async function startOneTap(opts: { clientId: string; loginHint?: string; onSignedIn: () => void; onError?: (e: unknown) => void }) {
  try {
    await loadGsi();
    const raw = crypto.randomUUID() + crypto.randomUUID();
    const hashed = await sha256Hex(raw);
    window.google.accounts.id.initialize({
      client_id: opts.clientId,
      nonce: hashed,
      login_hint: opts.loginHint,
      auto_select: !!opts.loginHint,
      cancel_on_tap_outside: false,
      use_fedcm_for_prompt: true,
      itp_support: true,
      context: "signin",
      callback: async (resp: { credential?: string }) => {
        if (!resp.credential) return;
        const { error } = await supabase.auth.signInWithIdToken({ provider: "google", token: resp.credential, nonce: raw });
        if (error) opts.onError?.(error);
        else opts.onSignedIn();
      },
    });
    window.google.accounts.id.prompt();
  } catch (e) {
    // One Tap is a shortcut only; the normal Google button still works.
    console.warn("[one-tap]", e);
  }
}

export function stopOneTap() {
  try { window.google?.accounts?.id?.cancel(); } catch { /* ignore */ }
}
