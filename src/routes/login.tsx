import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;

    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (active && session) {
        navigate({ to: "/dashboard", replace: true });
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
    const email = String(fd.get("email") ?? "").trim();
    const password = String(fd.get("password") ?? "");
    if (!email || !password) {
      setErr("الرجاء إدخال البريد الإلكتروني وكلمة المرور.");
      return;
    }
    setErr(null);
    setSuccess(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        const m = error.message.toLowerCase();
        let friendly = "تعذّر تسجيل الدخول. تحقّقي من البريد وكلمة المرور.";
        if (m.includes("invalid login")) friendly = "البريد أو كلمة المرور غير صحيحة.";
        else if (m.includes("not confirmed") || m.includes("email")) friendly = "لم يتم تأكيد البريد بعد. افتحي رابط التفعيل في بريدك.";
        else if (m.includes("rate") || m.includes("limit")) friendly = "محاولات كثيرة، الرجاء المحاولة بعد قليل.";
        setErr(friendly);
        toast.error("تعذّر تسجيل الدخول");
        return;
      }

      setSuccess("تم تسجيل الدخول بنجاح، يتم تحويلك الآن.");
      toast.success("تم تسجيل الدخول بنجاح");
      navigate({ to: "/dashboard", replace: true });
    } catch (error: any) {
      const message = error?.message || "حدث خلل غير متوقع أثناء تسجيل الدخول.";
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
          <div className="text-xs uppercase tracking-[0.3em] text-gold mb-2">بوابة المصوّرين</div>
          <h1 className="font-serif text-4xl">تسجيل الدخول</h1>
        </div>
        <form onSubmit={submit} className="space-y-4 bg-card border border-border rounded-sm p-6 shadow-soft">
          <Field label="البريد الإلكتروني" name="email" type="email" autoComplete="email" required />
          <Field label="كلمة المرور" name="password" type="password" autoComplete="current-password" required />
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">سيبقى تسجيل دخولك محفوظًا على هذا المتصفح.</span>
            <Link to="/forgot-password" className="text-gold underline">نسيتِ كلمة المرور؟</Link>
          </div>
          {success && <p className="text-sm text-emerald-600">{success}</p>}
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

function Field({ label, name, type, autoComplete, required }: { label: string; name: string; type: string; autoComplete?: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</span>
      <input
        name={name}
        type={type}
        autoComplete={autoComplete}
        required={required}
        className="mt-1 w-full rounded-sm border border-input bg-background px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-gold/60"
      />
    </label>
  );
}
