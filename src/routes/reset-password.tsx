import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
  head: () => ({
    meta: [
      { title: "إعادة تعيين كلمة المرور | Memoria" },
      { name: "description", content: "اختاري كلمة مرور جديدة لحسابكِ." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function ResetPasswordPage() {
  const nav = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // After clicking the email link, Supabase establishes a recovery session.
    supabase.auth.getSession().then(({ data }) => {
      setReady(!!data.session);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return toast.error("كلمة المرور يجب أن تكون 8 أحرف على الأقل");
    if (password !== confirm) return toast.error("تأكيد كلمة المرور لا يطابق");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return toast.error("تعذّر تحديث كلمة المرور. الرابط ربما انتهت صلاحيته.");
    toast.success("تم تحديث كلمة المرور");
    nav({ to: "/dashboard", replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container-editorial py-16 max-w-md">
        <div className="text-center mb-8">
          <div className="text-xs uppercase tracking-[0.3em] text-gold mb-2">حساب جديد آمن</div>
          <h1 className="font-serif text-4xl">إعادة تعيين كلمة المرور</h1>
        </div>
        {!ready ? (
          <div className="bg-card border border-border rounded-sm p-6 shadow-soft text-center text-sm text-muted-foreground">
            هذا الرابط غير صالح أو انتهت صلاحيته. <Link to="/forgot-password" className="text-gold underline">اطلبي رابطًا جديدًا</Link>.
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4 bg-card border border-border rounded-sm p-6 shadow-soft">
            <label className="block">
              <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">كلمة المرور الجديدة</span>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8}
                className="mt-1 w-full rounded-sm border border-input bg-background px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-gold/60" />
            </label>
            <label className="block">
              <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">تأكيد كلمة المرور</span>
              <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={8}
                className="mt-1 w-full rounded-sm border border-input bg-background px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-gold/60" />
            </label>
            <button disabled={loading} className="w-full bg-charcoal text-ivory py-3 rounded-sm hover:opacity-90 disabled:opacity-60">
              {loading ? "جاري الحفظ…" : "تحديث كلمة المرور"}
            </button>
          </form>
        )}
      </div>
      <Footer />
    </div>
  );
}