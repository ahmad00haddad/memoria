import { createFileRoute, useRouter } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { hapticVibrate } from "@/lib/utils";
import { PageLoader } from "@/components/ui/loading";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { getContractByToken, signContract } from "@/lib/contracts.functions";
import { toast } from "sonner";
import { CheckCircle2, ScrollText, Printer } from "lucide-react";

export const Route = createFileRoute("/contracts/$token")({
  head: () => ({
    meta: [
      { title: "توقيع عقد التصوير — ميموريا" },
      { name: "description", content: "راجعي عقد جلسة التصوير ووقّعيه إلكترونياً بأمان." },
      { property: "og:title", content: "توقيع عقد التصوير — ميموريا" },
      { property: "og:description", content: "راجعي عقد جلسة التصوير ووقّعيه إلكترونياً بأمان." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SignPage,
});

function SignPage() {
  const { token } = Route.useParams();
  const router = useRouter();
  const fetchFn = useServerFn(getContractByToken);
  const signFn = useServerFn(signContract);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [signature, setSignature] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [readPct, setReadPct] = useState(0);
  const articleRef = useRef<HTMLElement>(null);
  const signRef = useRef<HTMLDivElement>(null);

  // شريط تقدّم القراءة — يعرف أين وصلت العروس في العقد
  useEffect(() => {
    const onScroll = () => {
      const el = articleRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const total = r.height - window.innerHeight * 0.6;
      setReadPct(Math.max(0, Math.min(100, ((-r.top + window.innerHeight * 0.2) / Math.max(1, total)) * 100)));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [data]);

  useEffect(() => {
    fetchFn({ data: { token } }).then((r) => {
      setData(r); if (r?.contract) setName(r.contract.client_name); setLoading(false);
    });
  }, [token]);

  if (loading) return <PageLoader />;
  if (!data) return <div className="min-h-screen grid place-items-center">العقد غير موجود</div>;

  const { contract, booking, photographer } = data;
  const signed = contract.status === "signed";

  const onSign = async () => {
    if (!agreed || !signature.trim() || !name.trim()) {
      hapticVibrate("error");
      toast.error(!name.trim() ? "اكتبي اسمك الكامل" : !signature.trim() ? "اكتبي توقيعك" : "أكّدي الموافقة على البنود"); return;
    }
    if (signature.trim().length < 3) {
      toast.error("التوقيع قصير جداً. يرجى كتابة 3 حروف على الأقل."); return;
    }
    setSubmitting(true);
    try {
      await signFn({ data: { token, signature, client_name: name } });
      hapticVibrate("success");
      toast.success("وُقّع العقد — وصلت نسخة للمصوّرة");
      router.invalidate();
      const r = await fetchFn({ data: { token } });
      setData(r);
    } catch (e: any) {
      toast.error(e.message ?? "تعذّر التوقيع");
    } finally { setSubmitting(false); }
  };

  return (
    <div className="min-h-screen bg-background">
{/* Print styles — تُخفي الـ Header والـ Footer عند الطباعة */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          header, footer { display: none !important; }
          .container-editorial { max-width: 100% !important; padding: 0 !important; }
          body { background: white !important; }
        }
      `}</style>
      <Header />
      <section className="container-editorial py-12 max-w-3xl">
        <div className="text-xs uppercase tracking-[0.3em] text-gold mb-1">عقد تصوير</div>
        <h1 className="font-serif text-4xl mb-2 flex items-center gap-3"><ScrollText className="h-7 w-7 text-gold" /> {photographer?.display_name}</h1>
        <div className="mb-6 flex flex-wrap gap-2 text-xs">
          {booking?.event_date && <span className="rounded-full bg-secondary px-3 py-1">الحفل {new Date(booking.event_date).toLocaleDateString("ar-JO", { weekday: "long", day: "numeric", month: "long" })}</span>}
          {booking?.start_time && <span className="rounded-full bg-secondary px-3 py-1 tabular-nums">{String(booking.start_time).slice(0, 5)}–{String(booking.end_time ?? "").slice(0, 5)}</span>}
          {booking?.total_price != null && <span className="rounded-full bg-secondary px-3 py-1 tabular-nums">المجموع {booking.total_price} د.أ</span>}
          {booking?.deposit_amount != null && <span className="rounded-full bg-secondary px-3 py-1 tabular-nums">العربون {booking.deposit_amount} د.أ</span>}
        </div>

        {!signed && (
          <div className="no-print sticky top-[calc(env(safe-area-inset-top,0px)+4rem)] z-20 -mx-4 mb-3 flex items-center gap-3 bg-background/90 px-4 py-2 backdrop-blur">
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-secondary">
              <div className="h-full rounded-full bg-gold transition-[width] duration-200" style={{ width: `${readPct}%` }} />
            </div>
            <button onClick={() => signRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })} className="shrink-0 rounded-full border border-border px-3 py-1 text-xs hover:border-gold/50">
              {readPct >= 95 ? "إلى التوقيع" : "تخطّي إلى التوقيع"}
            </button>
          </div>
        )}

        <article ref={articleRef} className="border border-border rounded-2xl p-6 bg-card whitespace-pre-wrap leading-loose text-sm">
          {contract.body}
        </article>

        {signed ? (
          <div className="mt-8 border border-emerald-300 bg-emerald-50 rounded-sm p-6 flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            <div className="flex-1">
              <div className="font-semibold">تم التوقيع</div>
              <div className="text-sm text-muted-foreground">بواسطة {contract.client_name} · {new Date(contract.signed_at).toLocaleString("ar")}</div>
              <div className="font-serif italic text-xl mt-2">{contract.client_signature}</div>
            </div>
            <button onClick={() => window.print()} className="print:hidden inline-flex items-center gap-2 border border-emerald-600 text-emerald-700 px-3 py-2 rounded-sm hover:bg-emerald-100 text-sm">
              <Printer className="h-4 w-4" /> طباعة / حفظ PDF
            </button>
          </div>
        ) : (
          <div ref={signRef} className="mt-8 space-y-4 border border-border rounded-2xl p-6 scroll-mt-28">
            <h2 className="font-serif text-2xl">التوقيع الإلكتروني</h2>
            <p className="text-xs text-muted-foreground">يُحفظ التوقيع مع التاريخ والوقت، وله نفس إلزام التوقيع الورقي.</p>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="الاسم الكامل"
              className="w-full border border-input rounded-sm px-3 py-2 bg-background" />
            <div className="relative">
              <input value={signature} onChange={(e) => setSignature(e.target.value)} placeholder="اكتبي توقيعك هنا"
                className="w-full border border-input rounded-xl px-3 pt-2 pb-6 bg-background font-script text-3xl text-gold" />
              <span className="pointer-events-none absolute inset-x-4 bottom-3 border-b border-dashed border-border" />
            </div>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-1" />
              <span>أقرّ بأنني قرأت وفهمت جميع بنود العقد وأوافق عليها.</span>
            </label>
            <button onClick={onSign} disabled={submitting}
              className={`w-full inline-flex items-center justify-center gap-2 bg-gradient-gold text-charcoal font-semibold py-3 rounded-full hover:opacity-90 disabled:opacity-50 active:scale-[0.99] transition ${agreed && signature.trim().length >= 3 && name.trim() ? "" : "opacity-70"}`}>
              {submitting && <span className="h-4 w-4 animate-spin rounded-full border-2 border-charcoal/30 border-t-charcoal" />}
              {submitting ? "نوقّع…" : "توقيع العقد"}
            </button>
          </div>
        )}
      </section>
      <Footer />
    </div>
  );
}