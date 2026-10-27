import { friendlyError } from "@/lib/friendlyErrors";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { emailTypoSuggestion } from "@/lib/form-hints";
import { useEffect, useState } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

import { AlertTriangle, RefreshCcw, Home, Eye, EyeOff } from "lucide-react";
import { t, tx } from "@/i18n";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: t("تسجيل الدخول — Memoria · ميموريا") },
      { name: "description", content: t("سجّلي الدخول إلى حساب Memoria لإدارة حجوزاتك، ملفك الشخصي، وباقاتك.") },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LoginPage,
  errorComponent: LoginError,
});

function LoginError({ error, reset }: any) {
  // A stale deploy chunk failed to load: reload into the new build instead of showing an error
  if (typeof window !== "undefined") (window as any).__memoriaChunkReload?.(error);
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center space-y-6">
      <div className="h-16 w-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
        <AlertTriangle className="h-8 w-8 text-red-500" />
      </div>
      <div className="space-y-2 max-w-md">
        <h1 className="font-serif text-2xl">{t("عذراً! تعذر تحميل الصفحة")}</h1>
        <p className="text-muted-foreground">{t("حدث خطأ في النظام. يرجى المحاولة مرة أخرى.")}</p>
      </div>
      <div className="flex gap-4">
        <button onClick={reset} className="inline-flex items-center gap-2 bg-charcoal text-ivory px-6 py-2 rounded-sm hover:opacity-90 transition text-sm">
          <RefreshCcw className="h-4 w-4" />{" "}{t("تحديث الصفحة")}
        </button>
      </div>
    </div>
  );
}

function LoginPage() {
  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [unconfirmed, setUnconfirmed] = useState(false);
  const [linkSent, setLinkSent] = useState(false);
  const [shake, setShake] = useState(0);
  const navigate = useNavigate();
  const emailFix = emailTypoSuggestion(email);

  // تذكّر آخر بريد دخلت به المصوّرة على هذا الجهاز
  useEffect(() => {
    try { const last = localStorage.getItem("memoria_last_email"); if (last) setEmail(last); } catch { /* ignore */ }
  }, []);
  const search = Route.useSearch() as any;
  const r = search?.redirect;
  const redirectPath = typeof r === "string" && r.startsWith("/") && !r.startsWith("//") ? r : "/dashboard";

  useEffect(() => {
    let active = true;

    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (active && session) {
        navigate({ to: redirectPath, replace: true });
      }
    };

    checkSession();

    return () => {
      active = false;
    };
  }, [navigate]);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const password = String(fd.get("password") ?? "");
    if (!email.trim() || !password) {
      setErr(t("أدخلي البريد الإلكتروني وكلمة المرور."));
      setShake((n) => n + 1);
      return;
    }
    setErr(null);
    setSuccess(null);
    setUnconfirmed(false);
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) {
        const m = error.message.toLowerCase();
        let friendly = t("تعذّر تسجيل الدخول. تحقّقي من البريد وكلمة المرور.");
        if (m.includes("invalid login")) friendly = t("البريد أو كلمة المرور غير صحيحة.");
        else if (m.includes("not confirmed")) { friendly = t("لم يُفعَّل بريدك بعد. افتحي رابط التفعيل في بريدك."); setUnconfirmed(true); }
        else if (m.includes("rate") || m.includes("limit")) friendly = t("محاولات كثيرة، حاولي بعد قليل.");
        setErr(friendly);
        setShake((n) => n + 1);
        return;
      }

      try { localStorage.setItem("memoria_last_email", email.trim()); } catch { /* ignore */ }
      setSuccess(t("أهلاً بعودتك — ننقلك الآن."));
      navigate({ to: redirectPath, replace: true });
    } catch (error: any) {
      const message = friendlyError(error);
      setErr(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container-editorial py-16 max-w-md">
        <div className="text-center mb-8">
          <div className="text-xs uppercase tracking-[0.3em] text-gold mb-2">{t("بوابة المصوّرين")}</div>
          <h1 className="font-serif text-4xl">{t("تسجيل الدخول")}</h1>
        </div>
        <motion.form
          key={shake}
          animate={shake ? { x: [0, -8, 8, -6, 6, 0] } : undefined}
          transition={{ duration: 0.35 }}
          onSubmit={submit}
          className="space-y-4 bg-card border border-border rounded-2xl p-6 shadow-soft"
        >
          <label className="block">
            <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{t("البريد الإلكتروني")}</span>
            <input
              name="email"
              type="email"
              dir="ltr"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-gold/60"
            />
            {emailFix && (
              <button type="button" onClick={() => setEmail(emailFix)} className="mt-1 text-xs text-gold hover:underline">
                {t("هل تقصدين")}{" "}<span dir="ltr">{tx(emailFix)}</span>{t("؟")}
              </button>
            )}
          </label>
          <Field label={t("كلمة المرور")} name="password" type="password" autoComplete="current-password" required />
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{t("يبقى دخولك محفوظاً على هذا الجهاز.")}</span>
            <Link to="/forgot-password" className="text-gold underline">{t("نسيتِ كلمة المرور؟")}</Link>
          </div>
          {success && <p className="text-sm text-emerald-600">{tx(success)}</p>}
          <AnimatePresence initial={false}>
          {err && (
            <motion.div key="login-error" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }} className="overflow-hidden">
            <div className="text-sm text-destructive">
              {friendlyError(err)}
              {unconfirmed && (
                <button
                  type="button"
                  onClick={async () => {
                    const { error } = await supabase.auth.resend({ type: "signup", email: email.trim(), options: { emailRedirectTo: `${window.location.origin}/dashboard` } });
                    if (error) toast.error(t("تعذّر إعادة الإرسال الآن"));
                    else toast.success(t("أعدنا إرسال رابط التفعيل"));
                  }}
                  className="ms-2 text-gold underline"
                >
                  {t("إعادة إرسال الرابط")}
                </button>
              )}
            </div>
            </motion.div>
          )}
          </AnimatePresence>
          <button disabled={loading} className="w-full inline-flex items-center justify-center gap-2 bg-charcoal text-ivory py-3 rounded-full hover:opacity-90 disabled:opacity-60 active:scale-[0.99] transition-transform dark:bg-gold dark:text-charcoal">
            {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-current/30 border-t-current" />}
            {loading ? t("ندخلك…") : t("دخول")}
          </button>
          <button
            type="button"
            disabled={loading || linkSent}
            onClick={async () => {
              if (!email.trim()) { setErr(t("أدخلي بريدك أولاً لنرسل لكِ رابط الدخول.")); setShake((n) => n + 1); return; }
              setErr(null);
              const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: false, emailRedirectTo: `${window.location.origin}${redirectPath}` } });
              if (error) { setErr(t("تعذّر إرسال الرابط. تأكّدي أن البريد مسجّل لدينا.")); return; }
              setLinkSent(true);
            }}
            className="w-full text-xs text-muted-foreground hover:text-foreground disabled:opacity-70"
          >
            {linkSent ? t("أرسلنا رابط دخول إلى بريدك — افتحيه من هذا الجهاز") : t("ادخلي برابط على بريدك بدل كلمة المرور")}
          </button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">{t("أو")}</span>
            </div>
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={async () => {
              setErr(null);
              setLoading(true);
              // The browser leaves for Google here; Supabase sends it back to
              // /dashboard with the session. Navigating ourselves would cancel it.
              const { error } = await supabase.auth.signInWithOAuth({
                provider: "google",
                options: {
                  redirectTo: `${window.location.origin}/dashboard`,
                }
              });
              if (error) {
                setLoading(false);
                setErr(t("تعذّر تسجيل الدخول عبر Google. حاولي مجدداً."));
              }
            }}
            className="w-full border border-border py-3 rounded-sm hover:bg-secondary disabled:opacity-60 flex items-center justify-center gap-2 text-sm"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            <span>{t("تسجيل الدخول بواسطة Google")}</span>
          </button>
          <p className="text-sm text-center text-muted-foreground">
            {t("مصوّرة جديدة؟")}{" "}<Link to="/photographers/join" className="text-gold underline">{t("أنشئي حسابك")}</Link>
          </p>
          <p className="text-xs text-center text-muted-foreground">
            {t("عروس؟ لا تحتاجين حساباً —")}{" "}<Link to="/search" className="underline">{t("ابحثي عن مصوّرة مباشرة")}</Link>.
          </p>
        </motion.form>
      </div>
      <Footer />
    </div>
  );
}

function Field({ label, name, type, autoComplete, required }: { label: string; name: string; type: string; autoComplete?: string; required?: boolean }) {
  const [show, setShow] = useState(false);
  const [caps, setCaps] = useState(false);
  const isPassword = type === "password";
  
  return (
    <label className="block relative">
      <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{tx(label)}</span>
      <input
        name={name}
        type={isPassword && show ? "text" : type}
        autoComplete={autoComplete}
        required={required}
        onKeyUp={(e) => setCaps(e.getModifierState?.("CapsLock") ?? false)}
        className="mt-1 w-full rounded-sm border border-input bg-background px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-gold/60 ps-3 pe-10" dir="ltr"
      />
      {isPassword && (
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute end-3 top-[32px] text-muted-foreground hover:text-foreground transition-colors"
          aria-label={show ? t("إخفاء كلمة المرور") : t("إظهار كلمة المرور")}
          tabIndex={-1}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      )}
      {isPassword && caps && <span className="mt-1 block text-xs text-amber-700 dark:text-amber-400">{t("زر الأحرف الكبيرة (Caps Lock) مفعّل")}</span>}
    </label>
  );
}
