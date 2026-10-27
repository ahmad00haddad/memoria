import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { MapPin, MessageCircle, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getPhotographerProfileData } from "@/lib/profile.functions";
import { splitPortfolioItem } from "@/lib/portfolio-link";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { g } from "@/hooks/use-gender";
import { locale, t as tr, tx } from "@/i18n";

type Pkg = { id: string; label: string; price: number; package: string };

// معاينة صفحة المصوّرة كما تظهر للعروس على الموبايل — نفس ترتيب ونصوص
// /photographers/$username، وتتحدّث فوراً مع التعديلات غير المحفوظة (p).
// ما يظهر بإطار منقّط تلميح للمصوّرة فقط، لا تراه العروس.
export function LivePhonePreview({ p }: { p: any }) {
  const fetchProfileData = useServerFn(getPhotographerProfileData);
  const [pricing, setPricing] = useState<Pkg[]>([]);
  const [responseHours, setResponseHours] = useState<number | null>(null);
  const [ratings, setRatings] = useState<number[]>([]);
  const [isPro, setIsPro] = useState(true);

  useEffect(() => {
    if (!p?.id) return;
    supabase.from("pricing_rules").select("id,label,price,package").eq("photographer_id", p.id).order("price")
      .then(({ data }) => setPricing((data as Pkg[]) ?? []));
    supabase.from("reviews").select("rating").eq("photographer_id", p.id).eq("is_published", true)
      .then(({ data }) => setRatings(((data as any[]) ?? []).map((r) => r.rating)));
    fetchProfileData({ data: { pid: p.id } }).then((r) => { setResponseHours(r.responseHours); setIsPro(r.isPro); }).catch(() => {});
  }, [p?.id]);

  const mains = pricing.filter((x) => x.package !== "addon");
  const photos = (p.portfolio_urls ?? []).slice(0, 12).map((x: string) => splitPortfolioItem(x).src);
  const avg = ratings.length ? ratings.reduce((s, r) => s + r, 0) / ratings.length : 0;
  const hint = "rounded-md border border-dashed border-gold/50 p-2 text-[10px] text-gold/90";

  return (
    <div className="relative mx-auto w-[320px] h-[650px] bg-background border-[10px] border-charcoal rounded-[2.5rem] shadow-2xl overflow-hidden">
      <div className="absolute top-0 inset-x-0 mx-auto w-32 h-6 bg-charcoal rounded-b-2xl z-50" />
      <div className="h-full overflow-y-auto pb-16 scrollbar-none">
        {/* الغلاف (على الموبايل يظهر أولاً) */}
        <div className="relative h-56 bg-gradient-royal overflow-hidden">
          {(p.cover_url || p.avatar_url) && (
            <img src={p.cover_url || p.avatar_url} className="absolute inset-0 h-full w-full object-cover" alt="" />
          )}
          <div className="absolute inset-0 bg-gradient-to-tr from-charcoal/40 via-transparent to-transparent" />
          <div className="absolute bottom-3 end-3 max-w-[170px] rounded-sm border border-border bg-ivory/95 p-2.5 text-charcoal shadow">
            <div className="text-[8px] uppercase tracking-[0.25em] text-muted-foreground mb-1">{tr("مختارة من المعرض")}</div>
            <div className="font-serif text-[11px] leading-snug">{tr("«كل صورة قصة، وكل قصة تستحق الفخامة»")}</div>
            {p.city && <div className="mt-1.5 inline-flex items-center gap-1 text-[9px] text-muted-foreground"><MapPin className="h-2.5 w-2.5" /> {tx(p.city)}</div>}
          </div>
        </div>

        <div className="px-5 pt-5">
          <div className="text-[9px] uppercase tracking-[0.4em] text-gold mb-3">{p.tagline || "WEDDING PHOTOGRAPHY"}</div>
          {p.avatar_url && (
            <img src={p.avatar_url} className="mb-3 h-16 w-16 rounded-full object-cover ring-2 ring-gold/60" alt="" />
          )}
          <h2 className="display-serif text-4xl leading-none mb-3">{p.display_name || tr("اسم المصورة")}</h2>

          <div className="flex flex-wrap gap-1.5 mb-3">
            {p.verification_status === "verified" && isPro && <VerifiedBadge />}
            {p.is_featured && (
              <span className="inline-flex items-center gap-1 text-[9px] bg-gold/15 text-gold px-2 py-1 rounded-full border border-gold/30">
                <Star className="h-2.5 w-2.5 fill-gold" />{" "}{tr("اختيار المحرّر")}
              </span>
            )}
            {responseHours != null && (
              <span className="inline-flex items-center gap-1 text-[9px] bg-emerald-500/15 text-emerald-500 px-2 py-1 rounded-full border border-emerald-500/30">
                ⚡ {responseHours < 1 ? tr("تردّ خلال أقل من ساعة") : tr("تردّ خلال ~{0} ساعة", [Math.round(responseHours)])}
              </span>
            )}
          </div>

          {p.verification_status === "verified" && !isPro && (
            <div className={`${hint} mb-3`}>{g(tr("تلميح لكِ فقط: شارة التوثيق مخفية عن العروس لأنها ضمن باقة Pro."), tr("تلميح لك فقط: شارة التوثيق مخفية عن العروس لأنها ضمن باقة Pro."))}</div>
          )}

          {p.bio ? (
            <p className="text-xs leading-relaxed opacity-85 whitespace-pre-line mb-4">{tx(p.bio)}</p>
          ) : (
            <div className={`${hint} mb-4`}>{g(tr("تلميح لكِ فقط: النبذة فاضية فما بتظهر للعروس. اكتبي سطرين عنك وعن أسلوبك."), tr("تلميح لك فقط: النبذة فاضية فما بتظهر للعروس. اكتب سطرين عنك وعن أسلوبك."))}</div>
          )}

          <div className="w-full rounded-sm border border-ivory/40 py-2 text-center text-xs mb-5">{tr("الباقات")}</div>

          <div className="grid grid-cols-3 gap-2 border-t border-ivory/10 pt-3 mb-6 text-center">
            <div><div className="text-[9px] text-muted-foreground">{tr("التقييم")}</div><div className="font-serif text-sm">{ratings.length ? avg.toFixed(1) : "—"}</div></div>
            <div><div className="text-[9px] text-muted-foreground">{tr("الموقع")}</div><div className="font-serif text-sm truncate">{p.city || "—"}</div></div>
            <div><div className="text-[9px] text-muted-foreground">{tr("الباقات")}</div><div className="font-serif text-sm">{mains.length}</div></div>
          </div>

          <div className="text-center text-[9px] uppercase tracking-[0.3em] text-gold">{tr("الباقات")}</div>
          <div className="font-serif text-lg text-center mb-3">{tr("بطاقة الأسعار")}</div>
          {mains.length ? (
            <div className="space-y-2 mb-6">
              {mains.slice(0, 3).map((pk) => (
                <div key={pk.id} className="flex items-center justify-between gap-2 rounded-sm border border-border bg-card px-3 py-2">
                  <span className="text-[11px] font-medium truncate">{tx(pk.label)}</span>
                  <span className="shrink-0 font-serif text-sm text-gold">{tr("{0} د.أ", [Number(pk.price).toLocaleString(locale("ar-JO"))])}</span>
                </div>
              ))}
              {mains.length > 3 && <div className="text-center text-[10px] text-muted-foreground">{tr("+ {0} باقات أخرى", [mains.length - 3])}</div>}
            </div>
          ) : (
            <div className={`${hint} mb-6`}>{g(tr("تلميح لكِ فقط: ما في باقات، فالعروس ما بتقدر تحجز. أضيفي باقة من صفحة الأسعار."), tr("تلميح لك فقط: ما في باقات، فالعروس ما بتقدر تحجز. أضف باقة من صفحة الأسعار."))}</div>
          )}

          {photos.length ? (
            <>
              <div className="font-serif text-lg text-center mb-3">{tr("مختارات من الأعمال")}</div>
              <div className="grid grid-cols-2 gap-1.5 mb-6">
                {photos.slice(0, 6).map((src: string, i: number) => (
                  <img key={i} src={src} className="aspect-square w-full rounded-sm object-cover" alt="" />
                ))}
              </div>
              {photos.length > 6 && <div className="-mt-4 mb-6 text-center text-[10px] text-muted-foreground">{tr("+ {0} صور أخرى", [photos.length - 6])}</div>}
            </>
          ) : (
            <div className={`${hint} mb-6`}>{g(tr("تلميح لكِ فقط: المعرض فاضي فمخفي عن العروس. ارفعي 5 صور على الأقل."), tr("تلميح لك فقط: المعرض فاضي فمخفي عن العروس. ارفع 5 صور على الأقل."))}</div>
          )}
        </div>
      </div>

      {/* شريط الحجز الثابت أسفل الشاشة كما على الموبايل */}
      <div className="absolute bottom-0 inset-x-0 flex items-center gap-2 border-t border-border bg-background/95 px-3 py-2.5">
        <div className="min-w-0 flex-1">
          <div className="text-[9px] text-muted-foreground">{tr("احجزي مع")}</div>
          <div className="font-serif text-xs truncate">{p.display_name || tr("اسم المصورة")}</div>
        </div>
        {p.whatsapp && (
          <div className="grid h-8 w-8 place-items-center rounded-full border border-border"><MessageCircle className="h-3.5 w-3.5 text-green-600" /></div>
        )}
        <div className="rounded-full bg-charcoal px-4 py-2 text-[11px] font-medium text-ivory dark:bg-gold dark:text-charcoal">{tr("احجزي موعدك")}</div>
      </div>
    </div>
  );
}
