import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { recordReferralAfterSignup } from "@/lib/booking.functions";

export const Route = createFileRoute("/photographers/join")({
  head: () => ({
    meta: [
      { title: "انضمي كمصوّرة — Memoria · ميموريا" },
      { name: "description", content: "انضمي إلى Memoria وابدئي استقبال حجوزات مباشرة من العميلات، بأدوات إدارة كاملة وبدون عمولة." },
      { property: "og:title", content: "انضمي كمصوّرة — Memoria" },
      { property: "og:description", content: "منصّة عربية لمصوّرات المناسبات — سجّلي مجاناً وابدئي." },
      { property: "og:url", content: "https://memoria-jo.lovable.app/photographers/join" },
    ],
    links: [{ rel: "canonical", href: "https://memoria-jo.lovable.app/photographers/join" }],
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
    const ref = new URLSearchParams(window.location.search).get("ref");
    if (ref) {
      setRefCode(ref);
      // Persist referral code for OAuth flow (Google signup)
      try { sessionStorage.setItem("pending_referral_code", ref); } catch {}
    }
  }, []);

  const upd = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    const hadArabic = /[^\u0000-\u007F]/.test(form.username);
    const username = form.username.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (username.length < 3) {
      return setErr(hadArabic
        ? "اسم المستخدم يجب أن يكون بالإنجليزية فقط (a-z, 0-9, _)."
        : "اسم المستخدم يجب أن يكون 3 أحرف على الأقل.");
    }
    const reserved = new Set(["admin", "dashboard", "login", "logout", "auth", "api", "search", "guide", "track", "review", "contracts", "notifications", "photographers", "settings", "profile", "support"]);
    if (reserved.has(username)) {
      return setErr("اسم المستخدم محجوز، الرجاء اختيار اسم آخر.");
    }
    if (!form.display_name.trim()) {
      return setErr("الرجاء إدخال الاسم الكامل أو اسم الاستوديو.");
    }
    if (form.password.length < 8) {
      return setErr("كلمة المرور يجب أن تكون 8 أحرف على الأقل.");
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
      return setErr("اسم المستخدم مستخدم بالفعل، الرجاء اختيار اسم آخر.");
    }
    const { data: signUpData, error } = await supabase.auth.signUp({
      email: form.email,
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
        return setErr("هذا البريد مسجّل بالفعل. سجّلي الدخول بدلاً من إنشاء حساب جديد.");
      }
      if (m.includes("password")) {
        return setErr("كلمة المرور ضعيفة، استخدمي 8 أحرف على الأقل مع أرقام ورموز.");
      }
      if (m.includes("rate") || m.includes("limit")) {
        return setErr("محاولات كثيرة، الرجاء المحاولة بعد قليل.");
      }
      return setErr(error.message);
    }
    // Record referral via secure server function (idempotent, no-op if no session yet).
    if (refCode && signUpData.user) {
      try { await referralFn({ data: { referral_code: refCode } }); } catch {}
    }
    // If email confirmation is required, the session will be null.
    if (signUpData.session) {
      navigate({ to: "/dashboard" });
    } else {
      setConfirmSent(form.email);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container-editorial py-16 max-w-lg">
        {confirmSent ? (
          <div className="bg-card border border-border rounded-sm p-6 shadow-soft text-center">
            <div className="text-xs uppercase tracking-[0.3em] text-gold mb-2">تحقّقي من بريدك</div>
            <h1 className="font-serif text-3xl mb-3">رابط تفعيل في طريقه إليكِ</h1>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              أرسلنا رابط تفعيل إلى <strong>{confirmSent}</strong>.
              افتحي الرابط لإكمال إنشاء حسابكِ ثم سجّلي الدخول.
            </p>
            <Link to="/login" className="inline-block bg-charcoal text-ivory px-6 py-2.5 rounded-sm hover:opacity-90">الذهاب لتسجيل الدخول</Link>
          </div>
        ) : (<>
        <div className="text-center mb-8">
          <div className="text-xs uppercase tracking-[0.3em] text-gold mb-2">بوابة المصوّرين</div>
          <h1 className="font-serif text-4xl">انضم إلى المنصة</h1>
          <p className="text-sm text-muted-foreground mt-2">أنشئ ملفك خلال دقيقة وابدأ باستقبال الحجوزات.</p>
        </div>
        <form onSubmit={submit} className="space-y-4 bg-card border border-border rounded-sm p-6 shadow-soft">
          {refCode && (
            <div className="text-xs bg-gold/10 border border-gold/30 px-3 py-2 rounded-sm text-gold">
              تمّ تطبيق رمز إحالة: <strong>{refCode}</strong> — شهر مجاني للطرفين عند تفعيل الاشتراك.
            </div>
          )}
          <Field label="الاسم الكامل / اسم الاستوديو" value={form.display_name} onChange={upd("display_name")} required />
          <Field label="اسم المستخدم (بالإنجليزية)" value={form.username} onChange={upd("username")} required placeholder="مثال: studio_amman" />
          <Field label="البريد الإلكتروني" type="email" value={form.email} onChange={upd("email")} required />
          <Field label="كلمة المرور (8 أحرف على الأقل)" type="password" value={form.password} onChange={upd("password")} required />
          {err && <p className="text-sm text-destructive">{err}</p>}
          <button disabled={loading} className="w-full bg-charcoal text-ivory py-3 rounded-sm hover:opacity-90 disabled:opacity-60">
            {loading ? "جاري الإنشاء…" : "إنشاء حسابي"}
          </button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">أو</span>
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
              if (error) setErr("تعذّر التسجيل عبر Google. حاول مجدداً.");
            }}
            className="w-full border border-border py-3 rounded-sm hover:bg-secondary disabled:opacity-60 flex items-center justify-center gap-2 text-sm"
          >
            {/* Lovable AI: replace with Google icon if desired */}
            <span>التسجيل بواسطة Google</span>
          </button>
          <p className="text-sm text-center text-muted-foreground">
            لديك حساب؟ <Link to="/login" className="text-gold underline">تسجيل الدخول</Link>
          </p>
        </form>
        </>)}
      </div>
      <Footer />
    </div>
  );
}

function Field({ label, type = "text", value, onChange, required, placeholder }: { label: string; type?: string; value: string; onChange: (v: string) => void; required?: boolean; placeholder?: string }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="mt-1 w-full rounded-sm border border-input bg-background px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-gold/60"
      />
    </label>
  );
}
