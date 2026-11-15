import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { t, tx } from "@/i18n";
import { getGoogleClientId } from "@/lib/google-auth.functions";
import { forgetLastLogin, googleRedirect, readLastLogin, startOneTap, stopOneTap, type LastLogin } from "@/lib/google-auth";

export function GoogleIcon({ size = 18 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

/**
 * Google first: "continue as …" for the last account on this device, the main Google button
 * (always shows Google's account chooser) and One Tap on the page itself when Google allows it.
 */
export function GoogleSignIn({
  redirectPath = "/dashboard",
  label,
  onError,
  onLastLogin,
}: {
  redirectPath?: string;
  label: string;
  onError: (msg: string) => void;
  onLastLogin?: (last: LastLogin | null) => void;
}) {
  const navigate = useNavigate();
  const fetchClientId = useServerFn(getGoogleClientId);
  const [last, setLast] = useState<LastLogin | null>(null);
  const [busy, setBusy] = useState<"main" | "last" | null>(null);

  useEffect(() => {
    const l = readLastLogin();
    setLast(l);
    onLastLogin?.(l);
    let alive = true;
    fetchClientId().then(({ clientId }) => {
      if (!alive || !clientId) return;
      void startOneTap({
        clientId,
        loginHint: l?.provider === "google" ? l.email : undefined,
        onSignedIn: () => navigate({ to: redirectPath, replace: true }),
        onError: () => onError(t("تعذّر تسجيل الدخول عبر Google. حاولي مجدداً.")),
      });
    }).catch(() => { /* One Tap is optional */ });
    return () => { alive = false; stopOneTap(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const go = async (which: "main" | "last") => {
    setBusy(which);
    // The browser leaves for Google here; Supabase sends it back with the session.
    const { error } = await googleRedirect(redirectPath, which === "last" ? last?.email : undefined);
    if (error) { setBusy(null); onError(t("تعذّر تسجيل الدخول عبر Google. حاولي مجدداً.")); }
  };

  const lastIsGoogle = last?.provider === "google";

  return (
    <div className="space-y-3">
      {lastIsGoogle && last && (
        <div className="space-y-1.5">
          <button
            type="button"
            disabled={!!busy}
            onClick={() => go("last")}
            className="w-full flex items-center gap-3 rounded-2xl border border-gold/50 bg-gold/5 px-4 py-3 text-start hover:bg-gold/10 disabled:opacity-60 active:scale-[0.99] transition"
          >
            {last.avatar
              ? <img src={last.avatar} alt="" referrerPolicy="no-referrer" className="h-10 w-10 rounded-full object-cover" />
              : <span className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center"><GoogleIcon size={20} /></span>}
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-medium truncate">
                {t("تابعي باسم")}{" "}{last.name ? tx(last.name) : tx(last.email.split("@")[0])}
              </span>
              <span className="block text-xs text-muted-foreground truncate" dir="ltr">{tx(last.email)}</span>
            </span>
            {busy === "last"
              ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current/30 border-t-current" />
              : <GoogleIcon />}
          </button>
          <button
            type="button"
            onClick={() => { forgetLastLogin(); setLast(null); onLastLogin?.(null); }}
            className="block mx-auto text-xs text-muted-foreground hover:text-foreground underline"
          >
            {t("ليس حسابك؟")}
          </button>
        </div>
      )}
      <button
        type="button"
        disabled={!!busy}
        onClick={() => go("main")}
        className="w-full flex items-center justify-center gap-2 rounded-full border border-border bg-background py-3.5 text-sm font-medium shadow-soft hover:bg-secondary disabled:opacity-60 active:scale-[0.99] transition"
      >
        {busy === "main" ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current/30 border-t-current" /> : <GoogleIcon />}
        <span>{lastIsGoogle ? t("حساب Google آخر") : tx(label)}</span>
      </button>
    </div>
  );
}
