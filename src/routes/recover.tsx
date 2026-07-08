import { createFileRoute, Link } from '@tanstack/react-router'
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { toast } from "sonner";
import { recoverTrackingLinks } from "@/lib/recover.functions";

export const Route = createFileRoute("/recover")({
  head: () => ({
    meta: [
      { title: "استرداد رابط الحجز — Memoria" },
      { name: "description", content: "استعيدي روابط تتبع حجوزاتك على منصة ميموريا." },
    ],
  }),
  component: RecoverPage,
});

function RecoverPage() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  
  const recoverFn = useServerFn(recoverTrackingLinks);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const val = String(fd.get("contact") ?? "").trim();
    
    if (!val) {
      setErr("يرجى إدخال البريد الإلكتروني أو رقم الهاتف.");
      return;
    }
    
    setErr(null);
    setLoading(true);
    
    try {
      await recoverFn({ data: { emailOrPhone: val } });
      // نظهر نجاحاً في كل الحالات لأسباب أمنية
      setSuccess(true);
    } catch (error: any) {
      setErr(error.message || "حدث خطأ غير متوقع.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container-editorial py-16 max-w-md">
        <div className="text-center mb-8">
          <div className="text-xs uppercase tracking-[0.3em] text-gold mb-2">استرداد الحجز</div>
          <h1 className="font-serif text-4xl">أضعتِ رابط التتبع؟</h1>
          <p className="text-muted-foreground mt-4 text-sm leading-relaxed">
            لا تقلقي. أدخلي البريد الإلكتروني أو رقم الهاتف الذي حجزتِ به، وسنرسل لك روابط تتبع جميع حجوزاتك النشطة.
          </p>
        </div>
        
        {success ? (
          <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-sm p-6 text-center space-y-4">
            <h3 className="font-serif text-emerald-800 dark:text-emerald-300 text-xl">تم استلام طلبك</h3>
            <p className="text-sm text-emerald-700 dark:text-emerald-400">
              إذا كان هذا الحساب مسجلاً لدينا ويحتوي على حجوزات نشطة، ستصلك رسالة قريباً تحتوي على روابط التتبع الخاصة بك.
            </p>
            <Link to="/" className="inline-block w-full bg-charcoal text-ivory py-3 rounded-sm hover:opacity-90 mt-4 text-sm">
              العودة للرئيسية
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 bg-card border border-border rounded-sm p-6 shadow-soft">
            <label className="block">
              <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">البريد الإلكتروني أو الهاتف</span>
              <input
                name="contact"
                type="text"
                placeholder="user@example.com أو 079XXXXXXX"
                required
                className="mt-2 w-full rounded-sm border border-input bg-background px-3 py-2.5 text-left direction-ltr focus:outline-none focus:ring-2 focus:ring-gold/60"
              />
            </label>
            
            {err && <p className="text-sm text-destructive">{err}</p>}
            
            <button disabled={loading} className="w-full bg-charcoal text-ivory py-3 rounded-sm hover:opacity-90 disabled:opacity-60">
              {loading ? "جاري الإرسال…" : "أرسل لي روابط التتبع"}
            </button>
            
            <p className="text-xs text-center text-muted-foreground mt-4">
              هل تواجهين مشكلة؟ تواصلي مع <a href="mailto:support@memoria.jo" className="underline">الدعم الفني</a>.
            </p>
          </form>
        )}
      </div>
      <Footer />
    </div>
  );
}
