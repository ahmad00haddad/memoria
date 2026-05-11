import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/photographers/join")({
  component: JoinPage,
});

function JoinPage() {
  const [form, setForm] = useState({ display_name: "", username: "", email: "", password: "" });
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [refCode, setRefCode] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get("ref");
    if (ref) setRefCode(ref);
  }, []);

  const upd = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    const username = form.username.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (username.length < 3) {
      setLoading(false);
      return setErr("اسم المستخدم يجب أن يكون 3 أحرف على الأقل وبالإنجليزية.");
    }
    const { data: signUpData, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          role: "photographer",
          username,
          display_name: form.display_name,
          referral_code: refCode,
        },
      },
    });
    setLoading(false);
    if (error) return setErr(error.message);
    // Record referral if a code was provided
    if (refCode && signUpData.user) {
      const { data: referrer } = await supabase
        .from("profiles")
        .select("id")
        .eq("referral_code", refCode)
        .maybeSingle();
      if (referrer) {
        await supabase.from("referrals").insert({ referrer_id: referrer.id, referred_id: signUpData.user.id });
        await supabase.from("profiles").update({ referred_by: referrer.id }).eq("id", signUpData.user.id);
      }
    }
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container-editorial py-16 max-w-lg">
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
          <Field label="كلمة المرور" type="password" value={form.password} onChange={upd("password")} required />
          {err && <p className="text-sm text-destructive">{err}</p>}
          <button disabled={loading} className="w-full bg-charcoal text-ivory py-3 rounded-sm hover:opacity-90 disabled:opacity-60">
            {loading ? "جاري الإنشاء…" : "إنشاء حسابي"}
          </button>
          <p className="text-sm text-center text-muted-foreground">
            لديك حساب؟ <Link to="/login" className="text-gold underline">تسجيل الدخول</Link>
          </p>
        </form>
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
