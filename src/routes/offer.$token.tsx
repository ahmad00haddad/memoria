import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Clock, XCircle, Hourglass } from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { PageLoader } from "@/components/ui/loading";
import { getOfferByToken } from "@/lib/negotiation.functions";

export const Route = createFileRoute("/offer/$token")({
  head: () => ({
    meta: [
      { title: "عرض السعر — ميموريا" },
      { name: "description", content: "تابعي حالة عرض السعر الذي أرسلتِه للمصوّرة." },
      { property: "og:title", content: "عرض السعر — ميموريا" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OfferPage,
});

function OfferPage() {
  const { token } = useParams({ from: "/offer/$token" });
  const get = useServerFn(getOfferByToken);
  const [offer, setOffer] = useState<any | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    get({ data: { token } }).then((r) => setOffer(r ?? null)).catch((e: any) => { setError(e?.message || "تعذّر تحميل العرض"); setOffer(null); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (offer === undefined) return <PageLoader />;

  const fmt = (n: number) => Number(n).toLocaleString("ar-JO");
  const cfg: Record<string, { icon: any; cls: string; title: string; text: string }> = {
    pending: { icon: Hourglass, cls: "text-amber-600", title: "بانتظار ردّ المصوّرة", text: "لن يُحجز الموعد إلا بعد موافقتها، وسنراسلكِ على بريدكِ وواتساب." },
    accepted: { icon: CheckCircle2, cls: "text-emerald-600", title: "وافقت المصوّرة على عرضكِ", text: "تم إنشاء حجزكِ بالسعر المتفق عليه. تابعي الحجز وأرسلي العربون من صفحة التتبّع." },
    declined: { icon: XCircle, cls: "text-red-500", title: "لم تتم الموافقة على العرض", text: "يمكنكِ الحجز بالسعر المعلن من صفحة المصوّرة." },
    expired: { icon: Clock, cls: "text-muted-foreground", title: "انتهت صلاحية العرض", text: "لم تردّ المصوّرة خلال المدة المحددة. يمكنكِ إرسال عرض جديد أو الحجز بالسعر المعلن." },
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <section className="container-editorial py-12 max-w-xl mx-auto">
        {!offer ? (
          <div className="text-center">
            <h1 className="font-serif text-3xl mb-2">العرض غير موجود</h1>
            <p className="text-muted-foreground">{error || "الرابط غير صحيح."}</p>
          </div>
        ) : (() => {
          const c = cfg[offer.status] ?? cfg.pending;
          const Icon = c.icon;
          const discount = offer.listed_price > 0 ? Math.round((1 - offer.offered_price / offer.listed_price) * 100) : 0;
          return (
            <div className="bg-card border border-border rounded-sm p-6 sm:p-8 shadow-soft text-center">
              <div className="mb-3 flex justify-center"><Icon className={`h-14 w-14 ${c.cls}`} /></div>
              <h1 className="font-serif text-3xl mb-2">{c.title}</h1>
              <p className="text-muted-foreground mb-5">{c.text}</p>
              <div className="rounded-sm border border-border bg-secondary/40 p-4 text-start text-sm space-y-1.5 mb-5">
                <div className="flex justify-between"><span className="text-muted-foreground">المصوّرة</span><span>{offer.photographer_name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">الباقة</span><span>{offer.package_label}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">التاريخ</span><span>{offer.event_date}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">السعر المعلن</span><span className="line-through">{fmt(offer.listed_price)} د.أ</span></div>
                <div className="flex justify-between font-semibold"><span>سعركِ المقترح</span><span className="text-gold">{fmt(offer.offered_price)} د.أ {discount > 0 && `(−${discount}%)`}</span></div>
              </div>
              {offer.photographer_note && (
                <div className="rounded-sm border border-gold/30 bg-gold/5 p-3 text-sm text-start mb-5">
                  <div className="text-xs text-gold mb-1">ملاحظة المصوّرة</div>
                  {offer.photographer_note}
                </div>
              )}
              {offer.status === "accepted" && offer.tracking_token && (
                <Link to="/track/$token" params={{ token: offer.tracking_token }} className="block bg-charcoal text-ivory py-3 rounded-sm hover:opacity-90">
                  الذهاب لصفحة تتبّع الحجز
                </Link>
              )}
              {(offer.status === "declined" || offer.status === "expired") && offer.photographer_username && (
                <Link to="/photographers/$username" params={{ username: offer.photographer_username }} className="block border border-border py-3 rounded-sm hover:bg-secondary">
                  العودة لصفحة المصوّرة
                </Link>
              )}
            </div>
          );
        })()}
      </section>
      <Footer />
    </div>
  );
}
