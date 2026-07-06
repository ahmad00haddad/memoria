import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "تسجيل الدخول — Memoria · ميموريا" },
      { name: "description", content: "سجّلي الدخول إلى حساب Memoria لإدارة حجوزاتك، ملفك الشخصي، وباقاتك." },
      { name: "robots", content: "noindex" },
    ],
  }),
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
              const result = await lovable.auth.signInWithOAuth("google", {
                redirect_uri: window.location.origin,
              });
              if (result.error) {
                setLoading(false);
                setErr("تعذّر تسجيل الدخول عبر Google. حاول مجدداً.");
                return;
              }
              if (result.redirected) return;
              setLoading(false);
              navigate({ to: "/dashboard", replace: true });
            }}
            className="w-full border border-border py-3 rounded-sm hover:bg-secondary disabled:opacity-60 flex items-center justify-center gap-2 text-sm"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            <span>تسجيل الدخول بواسطة Google</span>
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
