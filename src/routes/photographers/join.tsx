import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff, Check } from "lucide-react";
import { emailTypoSuggestion, passwordStrength } from "@/lib/form-hints";
import { AnimatePresence, motion } from "framer-motion";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { friendlyError } from "@/lib/friendlyErrors";
import { isEmail, EMAIL_HINT } from "@/lib/validation";
import { toast } from "sonner";
import { recordReferralAfterSignup } from "@/lib/booking.functions";
import { t as tr, tx } from "@/i18n";

export const Route = createFileRoute("/photographers/join")({
  head: () => ({
    meta: [
      { title: tr("انضمي كمصوّرة — Memoria · ميموريا") },
      { name: "description", content: tr("انضمي إلى Memoria وابدئي استقبال حجوزات مباشرة من العميلات، بأدوات إدارة كاملة وبدون عمولة.") },
      { property: "og:title", content: tr("انضمي كمصوّرة — Memoria") },
      { property: "og:description", content: tr("منصّة عربية لمصوّرات المناسبات — سجّلي مجاناً وابدئي.") },
      { property: "og:url", content: "https://memoria-production.ahmad000haddad.workers.dev/photographers/join" },
    ],
    links: [{ rel: "canonical", href: "https://memoria-production.ahmad000haddad.workers.dev/photographers/join" }],
  }),
  component: JoinPage,
});

function JoinPage() {
  const [form, setForm] = useState({ display_name: "", username: "", email: "", password: "" });
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [refCode, setRefCode] = useState<string | null>(null);
  const [confirmSent, setConfirmSent] = useState<string | null>(null);
  const navigate = useNavigate();
  const referralFn = useServerFn(recordReferralAfterSignup);

  useEffect(() => {
    let active = true;
    
    // Redirect if already logged in
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (active && session) {
        navigate({ to: "/dashboard", replace: true });
      }
    };
    checkSession();

    const ref = new URLSearchParams(window.location.search).get("ref");
    if (ref) {
      setRefCode(ref);
      // Persist referral code for OAuth flow (Google signup)
      try { sessionStorage.setItem("pending_referral_code", ref); } catch { /* ignore */ }
    }
    
    // Idea 5: Smart Autofill Hint
    const prefillEmail = new URLSearchParams(window.location.search).get("email");
    if (prefillEmail) {
      setForm((prev) => ({ ...prev, email: prefillEmail }));
      setAutofillHint(true);
    }
    
    return () => { active = false; };
  }, [navigate]);

  const [autofillHint, setAutofillHint] = useState(false);
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [uState, setUState] = useState<"idle" | "checking" | "free" | "taken" | "invalid">("idle");
  const [shake, setShake] = useState(0);
  const [resent, setResent] = useState(false);

  // اقتراح اسم مستخدم من الاسم (إن كان بالإنجليزية) حتى تعدّله المصوّرة
  useEffect(() => {
    if (usernameTouched) return;
    const slug = form.display_name.toLowerCase().trim().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "").slice(0, 24);
    if (slug.length >= 3) setForm((f) => ({ ...f, username: slug }));
  }, [form.display_name, usernameTouched]);

  // التحقق من توفّر اسم المستخدم أثناء الكتابة
  useEffect(() => {
    const u = form.username.trim().toLowerCase();
    if (!u) { setUState("idle"); return; }
    if (!/^[a-z0-9_]{3,}$/.test(u)) { setUState("invalid"); return; }
    setUState("checking");
    const t = setTimeout(async () => {
      const { data } = await supabase.from("profiles").select("id").eq("username", u).maybeSingle();
      setUState(data ? "taken" : "free");
    }, 450);
    return () => clearTimeout(t);
  }, [form.username]);

  const emailFix = emailTypoSuggestion(form.email);
  const strength = passwordStrength(form.password);

  const upd = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const fail = (m: string) => { setErr(m); setShake((n) => n + 1); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    const hadArabic = /[^\u0000-\u007F]/.test(form.username);
    const username = form.username.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (username.length < 3) {
      return fail(hadArabic
        ? tr("اسم المستخدم يجب أن يكون بالإنجليزية فقط (a-z, 0-9, _).")
        : tr("اسم المستخدم يجب أن يكون 3 أحرف على الأقل."));
    }
    const reserved = new Set(["admin", "dashboard", "login", "logout", "auth", "api", "search", "guide", "track", "review", "contracts", "notifications", "photographers", "settings", "profile", "support"]);
    if (reserved.has(username)) {
      return fail(tr("اسم المستخدم محجوز، الرجاء اختيار اسم آخر."));
    }
    if (!form.display_name.trim()) {
      return fail(tr("الرجاء إدخال الاسم الكامل أو اسم الاستوديو."));
    }
    if (!isEmail(form.email)) {
      return fail(EMAIL_HINT);
    }
    if (form.password.length < 8) {
      return fail(tr("كلمة المرور يجب أن تكون 8 أحرف على الأقل."));
    }
    setLoading(true);
    // Ensure username is unique before creating the auth account.
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", username)
      .maybeSingle();
    if (existing) {
      setLoading(false);
      return fail(tr("اسم المستخدم مستخدم بالفعل، الرجاء اختيار اسم آخر."));
    }
    const { data: signUpData, error } = await supabase.auth.signUp({
      email: form.email.trim().toLowerCase(),
      password: form.password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: {
          role: "photographer",
          username,
          display_name: form.display_name.trim(),
          referral_code: refCode,
        },
      },
    });
    setLoading(false);
    if (error) {
      const m = error.message.toLowerCase();
      if (m.includes("already registered") || m.includes("user already")) {
        return fail(tr("هذا البريد مسجّل بالفعل. سجّلي الدخول بدلاً من إنشاء حساب جديد."));
      }
      if (m.includes("password")) {
        return fail(tr("كلمة المرور ضعيفة، استخدمي 8 أحرف على الأقل مع أرقام ورموز."));
      }
      if (m.includes("rate") || m.includes("limit")) {
        return fail(tr("محاولات كثيرة، الرجاء المحاولة بعد قليل."));
      }
      return fail(friendlyError(error.message));
    }
    // Record referral via secure server function (idempotent, no-op if no session yet).
    if (refCode && signUpData.user) {
      try { await referralFn({ data: { referral_code: refCode } }); } catch { /* ignore */ }
    }
    // If email confirmation is required, the session will be null.
    if (signUpData.session) {
      navigate({ to: "/dashboard" });
    } else {
      setConfirmSent(form.email.trim().toLowerCase());
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container-editorial py-16 max-w-lg">
        {confirmSent ? (
          <div className="bg-card border border-border rounded-2xl p-6 shadow-soft text-center">
            <div className="text-xs uppercase tracking-[0.3em] text-gold mb-2">{tr("تحقّقي من بريدك")}</div>
            <h1 className="font-serif text-3xl mb-3">{tr("رابط تفعيل في طريقه إليكِ")}</h1>
            <p className="text-sm text-muted-foreground leading-relaxed mb-2">
              {tr("أرسلنا رابط تفعيل إلى")}{" "}<strong dir="ltr">{tx(confirmSent)}</strong>{tr(". افتحي الرابط لإكمال إنشاء حسابكِ.")}
            </p>
            <p className="text-xs text-muted-foreground mb-5">{tr("لم يصل خلال دقيقة؟ تحقّقي من مجلد الرسائل غير المرغوبة.")}</p>
            <div className="flex flex-wrap justify-center gap-2">
              {/@gmail\.com$/i.test(confirmSent) && (
                <a href="https://mail.google.com" target="_blank" rel="noreferrer" className="inline-block bg-charcoal text-ivory px-6 py-2.5 rounded-full hover:opacity-90 dark:bg-gold dark:text-charcoal">{tr("افتحي Gmail")}</a>
              )}
              <button
                type="button"
                disabled={resent}
                onClick={async () => {
                  const { error } = await supabase.auth.resend({ type: "signup", email: confirmSent, options: { emailRedirectTo: `${window.location.origin}/dashboard` } });
                  if (error) return setErr(tr("تعذّر إعادة الإرسال الآن، حاولي بعد دقيقة."));
                  setResent(true);
                }}
                className="inline-flex items-center gap-1.5 border border-border px-5 py-2.5 rounded-full text-sm hover:bg-secondary disabled:opacity-60"
              >
                {resent ? <><Check className="h-4 w-4" />{" "}{tr("أُعيد الإرسال")}</> : tr("إعادة إرسال الرابط")}
              </button>
              <Link to="/login" className="inline-block border border-border px-5 py-2.5 rounded-full text-sm hover:bg-secondary">{tr("تسجيل الدخول")}</Link>
            </div>
            <AnimatePresence initial={false}>{err && <motion.p key="join-error" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }} className="overflow-hidden mt-3 text-sm text-destructive">{friendlyError(err)}</motion.p>}</AnimatePresence>
          </div>
        ) : (<>
        <div className="text-center mb-8">
          <div className="text-xs uppercase tracking-[0.3em] text-gold mb-2">{tr("بوابة المصوّرين")}</div>
          <h1 className="font-serif text-4xl">{tr("انضمي إلى ميموريا")}</h1>
          <p className="text-sm text-muted-foreground mt-2">{tr("أنشئي ملفك خلال دقيقة — ١٤ يوماً مجاناً بدون بطاقة.")}</p>
        </div>
        <motion.form
          key={shake}
          animate={shake ? { x: [0, -8, 8, -6, 6, 0] } : undefined}
          transition={{ duration: 0.35 }}
          onSubmit={submit}
          className="space-y-4 bg-card border border-border rounded-2xl p-6 shadow-soft"
        >
          {refCode && (
            <div className="text-xs bg-gold/10 border border-gold/30 px-3 py-2 rounded-sm text-gold">
              {tr("تمّ تطبيق رمز إحالة:")}{" "}<strong>{tx(refCode)}</strong>{" "}{tr("— دعتكِ زميلة، وتجربتكِ المجانية ١٤ يوماً تبدأ الآن.")}
            </div>
          )}
          <Field label={tr("الاسم الكامل / اسم الاستوديو")} value={form.display_name} onChange={upd("display_name")} required />
          <div>
            <Field label={tr("اسم المستخدم (بالإنجليزية)")} value={form.username} onChange={(v) => { setUsernameTouched(true); if (/[^a-zA-Z0-9_\s]/.test(v)) toast.error(tr("اسم المستخدم بالأحرف الإنجليزية فقط، مثال: sara_photo"), { id: "username-latin" }); upd("username")(v.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "")); }} required placeholder={tr("مثال: studio_amman")} ltr />
            <div className="mt-1 flex items-center justify-between text-xs">
              <span className="text-muted-foreground" dir="ltr">{form.username ? `memoria/photographers/${form.username}` : ""}</span>
              <span className={uState === "free" ? "text-emerald-600" : uState === "taken" || uState === "invalid" ? "text-destructive" : "text-muted-foreground"}>
                {uState === "checking" ? tr("نتحقّق…") : uState === "free" ? tr("متاح ✓") : uState === "taken" ? tr("محجوز") : uState === "invalid" ? tr("أحرف إنجليزية وأرقام و _ فقط") : ""}
              </span>
            </div>
          </div>
          {autofillHint && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="text-xs text-sky-800 bg-sky-50 p-2 rounded-sm border border-sky-200">
              💡 <strong>{tr("يبدو أنكِ جديدة!")}</strong>{" "}{tr("قمنا بتجهيز إيميلك لكِ اختصاراً لوقتك.")}
            </motion.div>
          )}
          <div>
            <Field label={tr("البريد الإلكتروني")} type="email" value={form.email} onChange={upd("email")} required ltr />
            {emailFix && (
              <button type="button" onClick={() => setForm((f) => ({ ...f, email: emailFix }))} className="mt-1 text-xs text-gold hover:underline">
                {tr("هل تقصدين")}{" "}<span dir="ltr">{tx(emailFix)}</span>{tr("؟")}
              </button>
            )}
          </div>
          <div>
            <Field label={tr("كلمة المرور")} type="password" value={form.password} onChange={upd("password")} required />
            {form.password && (
              <div className="mt-2">
                <div className="flex gap-1" aria-hidden>
                  {[0, 1, 2].map((i) => (
                    <span key={i} className={`h-1 flex-1 rounded-full transition-colors duration-300 ${i < strength.score ? (strength.score === 1 ? "bg-destructive" : strength.score === 2 ? "bg-amber-500" : "bg-emerald-500") : "bg-secondary"}`} />
                  ))}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{tx(strength.hint)}</p>
              </div>
            )}
          </div>
          <AnimatePresence initial={false}>{err && <motion.p key="join-error" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }} className="overflow-hidden text-sm text-destructive">{friendlyError(err)}</motion.p>}</AnimatePresence>
          <button disabled={loading || uState === "taken"} className="w-full inline-flex items-center justify-center gap-2 bg-charcoal text-ivory py-3 rounded-full hover:opacity-90 disabled:opacity-60 active:scale-[0.99] transition-transform dark:bg-gold dark:text-charcoal">
            {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-current/30 border-t-current" />}
            {loading ? tr("ننشئ حسابك…") : tr("إنشاء حسابي")}
          </button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">{tr("أو")}</span>
            </div>
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={async () => {
              setErr(null);
              setLoading(true);
              const { error } = await supabase.auth.signInWithOAuth({
                provider: "google",
                options: {
                  redirectTo: `${window.location.origin}/dashboard`,
                },
              });
              setLoading(false);
              if (error) setErr(tr("تعذّر التسجيل عبر Google. حاول مجدداً."));
            }}
            className="w-full border border-border py-3 rounded-sm hover:bg-secondary disabled:opacity-60 flex items-center justify-center gap-2 text-sm"
          >
            {/* Lovable AI: replace with Google icon if desired */}
            <span>{tr("التسجيل بواسطة Google")}</span>
          </button>
          <p className="text-sm text-center text-muted-foreground">
            {tr("لديك حساب؟")}{" "}<Link to="/login" className="text-gold underline">{tr("تسجيل الدخول")}</Link>
          </p>
        </motion.form>
        </>)}
      </div>
      <Footer />
    </div>
  );
}

function Field({ label, type = "text", value, onChange, required, placeholder, ltr }: { label: string; type?: string; value: string; onChange: (v: string) => void; required?: boolean; placeholder?: string; ltr?: boolean }) {
  const [show, setShow] = useState(false);
  const isPwd = type === "password";

  return (
    <label className="block relative">
      <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{tx(label)}</span>
      <input
        type={isPwd ? (show ? "text" : "password") : type}
        dir={ltr ? "ltr" : undefined}
        value={value}
        placeholder={tx(placeholder)}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="mt-1 w-full rounded-sm border border-input bg-background px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-gold/60"
        style={isPwd ? { paddingInlineEnd: '40px' } : {}}
      />
      {isPwd && (
        <button 
          type="button" 
          aria-label={show ? tr("إخفاء كلمة المرور") : tr("إظهار كلمة المرور")}
          onClick={() => setShow(!show)}
          className="absolute end-3 top-8 text-muted-foreground hover:text-foreground"
        >
          <motion.div initial={false} animate={{ scaleY: [1, 0, 1] }} transition={{ duration: 0.2 }} key={show ? "open" : "closed"}>
             {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </motion.div>
        </button>
      )}
    </label>
  );
}
