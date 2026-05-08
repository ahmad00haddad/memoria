import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return setErr(error.message);
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container-editorial py-16 max-w-md">
        <div className="text-center mb-8">
          <div className="text-xs uppercase tracking-[0.3em] text-gold mb-2">بوابة المصوّرين</div>
          <h1 className="font-serif text-4xl">تسجيل الدخول</h1>
        </div>
        <form onSubmit={submit} className="space-y-4 bg-card border border-border rounded-sm p-6 shadow-soft">
          <Field label="البريد الإلكتروني" type="email" value={email} onChange={setEmail} required />
          <Field label="كلمة المرور" type="password" value={password} onChange={setPassword} required />
          {err && <p className="text-sm text-destructive">{err}</p>}
          <button disabled={loading} className="w-full bg-charcoal text-ivory py-3 rounded-sm hover:opacity-90 disabled:opacity-60">
            {loading ? "جاري الدخول…" : "دخول"}
          </button>
          <p className="text-sm text-center text-muted-foreground">
            مصوّر جديد؟ <Link to="/photographers/join" className="text-gold underline">أنشئ حسابًا</Link>
          </p>
          <p className="text-xs text-center text-muted-foreground">
            عميل؟ لا تحتاج حساب — <Link to="/search" className="underline">ابحث عن مصوّر مباشرة</Link>.
          </p>
        </form>
      </div>
      <Footer />
    </div>
  );
}

function Field({ label, type, value, onChange, required }: { label: string; type: string; value: string; onChange: (v: string) => void; required?: boolean }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="mt-1 w-full rounded-sm border border-input bg-background px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-gold/60"
      />
    </label>
  );
}
