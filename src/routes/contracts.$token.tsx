import { createFileRoute, useRouter } from "@tanstack/react-router";
import { PageLoader } from "@/components/ui/loading";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { getContractByToken, signContract } from "@/lib/contracts.functions";
import { toast } from "sonner";
import { CheckCircle2, ScrollText, Printer } from "lucide-react";

export const Route = createFileRoute("/contracts/$token")({ component: SignPage });

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
      toast.error("يرجى تعبئة الاسم والتوقيع والموافقة"); return;
    }
    setSubmitting(true);
    try {
      await signFn({ data: { token, signature, client_name: name } });
      toast.success("تم توقيع العقد بنجاح");
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
        <p className="text-sm text-muted-foreground mb-6">
          تاريخ الحفل: {booking?.event_date} · من {booking?.start_time} إلى {booking?.end_time} ·
          المجموع: {booking?.total_price} د.أ · العربون: {booking?.deposit_amount} د.أ
        </p>

        <article className="border border-border rounded-sm p-6 bg-card whitespace-pre-wrap leading-loose text-sm">
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
          <div className="mt-8 space-y-4 border border-border rounded-sm p-6">
            <h2 className="font-serif text-2xl">التوقيع الإلكتروني</h2>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="الاسم الكامل"
              className="w-full border border-input rounded-sm px-3 py-2 bg-background" />
            <input value={signature} onChange={(e) => setSignature(e.target.value)} placeholder="اكتب توقيعك هنا"
              className="w-full border border-input rounded-sm px-3 py-2 bg-background font-serif italic text-xl" />
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-1" />
              <span>أقرّ بأنني قرأت وفهمت جميع بنود العقد وأوافق عليها.</span>
            </label>
            <button onClick={onSign} disabled={submitting}
              className="w-full bg-gradient-gold text-charcoal font-semibold py-3 rounded-sm hover:opacity-90 disabled:opacity-50">
              {submitting ? "جارٍ التوقيع…" : "توقيع العقد"}
            </button>
          </div>
        )}
      </section>
      <Footer />
    </div>
  );
}