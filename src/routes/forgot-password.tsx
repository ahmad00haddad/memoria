import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mail, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordPage,
  head: () => ({
    meta: [
      { title: "استعادة كلمة المرور | Memoria" },
      { name: "description", content: "أرسلي رابط استعادة كلمة المرور إلى بريدك الإلكتروني." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return toast.error("الرجاء إدخال البريد الإلكتروني");
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      return toast.error("تعذّر إرسال الرابط. تأكدي من البريد ثم حاولي مجددًا.");
    }
    setSent(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container-editorial py-16 max-w-md">
        <div className="text-center mb-8">
          <div className="text-xs uppercase tracking-[0.3em] text-gold mb-2">استعادة الوصول</div>
          <h1 className="font-serif text-4xl">نسيتِ كلمة المرور؟</h1>
        </div>
        {sent ? (
          <div className="bg-card border border-border rounded-sm p-6 shadow-soft text-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              أرسلنا رابط إعادة تعيين كلمة المرور إلى <strong>{email}</strong>.
              افتحي الرابط من بريدك لإكمال العملية.
            </p>
            <Link to="/login" className="inline-block bg-charcoal text-ivory px-6 py-2.5 rounded-sm hover:opacity-90">العودة لتسجيل الدخول</Link>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4 bg-card border border-border rounded-sm p-6 shadow-soft">
            <p className="text-sm text-muted-foreground leading-relaxed">
              أدخلي بريدكِ الإلكتروني وسنرسل لكِ رابطًا لإعادة تعيين كلمة المرور.
            </p>
            <label className="block">
              <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">البريد الإلكتروني</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="mt-1 w-full rounded-sm border border-input bg-background px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-gold/60"
              />
            </label>
            <button disabled={loading} className="w-full bg-charcoal text-ivory py-3 rounded-sm hover:opacity-90 disabled:opacity-60 inline-flex items-center justify-center gap-2">
              <Mail className="h-4 w-4" />
              {loading ? "جاري الإرسال…" : "إرسال رابط الاستعادة"}
            </button>
            <p className="text-sm text-center text-muted-foreground">
              تذكّرت كلمة المرور؟ <Link to="/login" className="text-gold underline">تسجيل الدخول</Link>
            </p>
          </form>
        )}
      </div>
      <Footer />
    </div>
  );
}