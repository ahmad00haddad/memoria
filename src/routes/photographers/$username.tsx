import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BadgeCheck, Instagram, MessageCircle, Copy, Share2, Star, CheckCircle2, Send, ChevronRight, ChevronLeft, Shield, Clock, CalendarCheck, Award, ClipboardCopy, Loader2, Check, Play, ExternalLink } from "lucide-react";
import { splitPortfolioItem, linkLabel } from "@/lib/portfolio-link";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { ar } from "date-fns/locale";
import { format } from "date-fns";
import confetti from "canvas-confetti";
import { useServerFn } from "@tanstack/react-start";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { submitPriceOffer } from "@/lib/negotiation.functions";
import { submitBookingRequest, getPublicDepositInfo, getBookingByToken } from "@/lib/booking.functions";
import { VerifyBookingPanel, type VerifyInfo } from "@/components/VerifyBookingPanel";
import { getPhotographerProfileData } from "@/lib/profile.functions";
import { Lightbox } from "@/components/Lightbox";
import { optimizedImageUrl, responsiveSrcSet } from "@/lib/gallery.functions";
import { hapticVibrate } from "@/lib/utils";
import { playSound } from "@/lib/sounds";
import { motion, AnimatePresence, useScroll, useSpring } from "framer-motion";
import { useIntro } from "@/lib/intro";
import { CountTo, DrawFrame, DrawIcon, EASE_DRAW, EASE_OUT, RevealWords, RiseIn } from "@/components/site/Reveal";
import { MapPin } from "lucide-react";
import { Zap, CircleCheck } from "lucide-react";
import { parseFeatures, emphasizeNumbers } from "@/lib/packageFeatures";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { normalizePhone, isEmail, PHONE_HINT, EMAIL_HINT } from "@/lib/validation";
import { PhotographerProfileTip } from "@/components/PhotographerProfileTip";
import { PriceBreakdownTip } from "@/components/PriceBreakdownTip";
import { locale } from "@/i18n";
import { t as tr, tx, getLang, setLang, LANG_COOKIE } from "@/i18n";
import { sanitizePageSettings, applyPageTheme, type PageSettings } from "@/lib/page-settings";

const GALLERY_GRID: Record<PageSettings["gallery_layout"], string> = {
  grid: "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2",
  wide: "grid grid-cols-1 sm:grid-cols-2 gap-3",
  masonry: "grid grid-cols-2 md:grid-cols-4 auto-rows-[160px] sm:auto-rows-[200px] grid-flow-dense gap-2",
};
// شبكة متداخلة: كل خامس صورة كبيرة، وكل ثالثة طويلة
function galleryCell(layout: PageSettings["gallery_layout"], i: number) {
  if (layout === "wide") return "aspect-[4/3]";
  if (layout === "masonry") return i % 5 === 0 ? "col-span-2 row-span-2" : i % 3 === 1 ? "row-span-2" : "";
  return "aspect-square";
}

export const Route = createFileRoute("/photographers/$username")({
  component: PhotographerPage,
  loader: async ({ params }) => {
    // SEO meta only — يجلب اسم العرض والصورة لاستخدامها في علامات الميتا.
    try {
      const { data } = await supabase
        .from("profiles")
        .select("display_name,bio,city,cover_url,avatar_url")
        .eq("username", params.username.trim().toLowerCase())
        .eq("is_published", true)
        .maybeSingle();
      return { seo: data ?? null };
    } catch {
      return { seo: null };
    }
  },
  head: ({ params, loaderData }) => {
    const p = loaderData?.seo as any;
    const name = p?.display_name || params.username;
    const city = p?.city ? tr(" في {0}", [p.city]) : "";
    const desc = p?.bio?.slice(0, 155) || tr("استعرض أعمال وأسعار المصوّرة {0}{1} واحجز موعدك مباشرة عبر Memoria.", [name, city]);
    const rawImage = p?.cover_url || p?.avatar_url || undefined;
    const image = rawImage && rawImage.startsWith("/") ? `https://memoria-production.ahmad000haddad.workers.dev${rawImage}` : rawImage;
    const url = `https://memoria-production.ahmad000haddad.workers.dev/photographers/${params.username}`;
    const meta: Array<Record<string, string>> = [
      { title: tr("{0} — مصوّرة أعراس{1} | Memoria", [name, city]) },
      { name: "description", content: desc },
      { property: "og:title", content: tr("{0} — مصوّرة أعراس{1}", [name, city]) },
      { property: "og:description", content: desc },
      { property: "og:type", content: "profile" },
      { property: "og:url", content: url },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: tr("{0} — مصوّرة أعراس{1}", [name, city]) },
      { name: "twitter:description", content: desc },
    ];
    if (image) {
      meta.push({ property: "og:image", content: image });
      meta.push({ name: "twitter:image", content: image });
    }
    // JSON-LD: LocalBusiness / ProfessionalService — يساعد Google في عرض بطاقة غنية
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "ProfessionalService",
      name,
      description: desc,
      image: image || undefined,
      url,
      areaServed: p?.city || tr("الأردن"),
      address: p?.city
        ? { "@type": "PostalAddress", addressLocality: p.city, addressCountry: "JO" }
        : undefined,
      priceRange: "$$",
      makesOffer: {
        "@type": "Offer",
        itemOffered: { "@type": "Service", name: tr("تصوير أعراس ومناسبات") },
      },
    };
    return {
      meta,
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify(jsonLd),
        },
      ],
    };
  },
});

type Profile = {
  id: string; username: string; display_name: string;
  verification_status?: string | null; verified_at?: string | null;
  is_pro?: boolean;
  bio: string | null; city: string | null; base_location: string | null;
  phone: string | null; instagram: string | null; whatsapp: string | null;
  avatar_url: string | null; cover_url: string | null; equipment: string | null;
  cliq_alias: string | null; portfolio_urls: string[] | null;
  deposit_percent: number; travel_fee_per_km: number; free_km: number;
  is_featured?: boolean; is_demo?: boolean;
  tagline?: string | null; booking_notes?: string | null;
  page_settings?: unknown;
  bank_info?: string | null; fixed_deposit?: number | null;
  is_published?: boolean;
  created_at?: string | null;
  updated_at?: string | null;
};

type Pricing = {
  id: string; service: "photography" | "cinematic_video";
  package: "hourly" | "full_day" | "addon";
  label: string; price: number;
  per_photo_price: number | null; description: string | null;
  subtitle?: string | null; cta_label?: string | null;
};

function PhotographerPage() {
  const { username } = Route.useParams();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [pricing, setPricing] = useState<Pricing[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [unavail, setUnavail] = useState<string[]>([]);
  const [bookedSlots, setBookedSlots] = useState<{ event_date: string; start_time: string; end_time: string }[]>([]);
  const [completedCount, setCompletedCount] = useState<number>(0);
  const [responseHours, setResponseHours] = useState<number | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pickedPackageId, setPickedPackageId] = useState<string>("");
  const [deposit, setDeposit] = useState<{ cliq_alias: string | null; bank_info: string | null }>({ cliq_alias: null, bank_info: null });
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [showAllPkgs, setShowAllPkgs] = useState(false);
  const fetchDeposit = useServerFn(getPublicDepositInfo);
  const fetchProfileData = useServerFn(getPhotographerProfileData);

  const [loadFailed, setLoadFailed] = useState(false);

  // معاينة حيّة من صفحة الإعدادات (iframe من نفس الموقع فقط) — لا تُحفظ شيئاً
  const [psPreview, setPsPreview] = useState<PageSettings | null>(null);
  useEffect(() => {
    if (window.parent === window) return;
    const onMsg = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.data?.type !== "memoria:page-settings") return;
      setPsPreview(sanitizePageSettings(e.data.settings));
    };
    window.addEventListener("message", onMsg);
    window.parent.postMessage({ type: "memoria:preview-ready" }, window.location.origin);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  // ثيم الصفحة: ألوان وخطوط على <html> طوال وجود الزائرة في الصفحة
  const activePs = profile ? (psPreview ?? sanitizePageSettings(profile.page_settings)) : null;
  const activeKey = activePs ? JSON.stringify(activePs) : "";
  useEffect(() => {
    if (!activePs) return;
    return applyPageTheme(activePs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey]);

  // لغة الصفحة الافتراضية التي اختارتها المصوّرة — فقط إن لم تختر الزائرة لغة من قبل
  useEffect(() => {
    if (!profile || window.parent !== window) return;
    const want = sanitizePageSettings(profile.page_settings).default_lang;
    if (want === "auto" || want === getLang()) return;
    if (document.cookie.split("; ").some((c) => c.startsWith(LANG_COOKIE + "="))) return;
    setLang(want);
  }, [profile]);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    setLoading(true);
    setLoadFailed(false);
    (async () => {
     try {
      const normalizedUsername = username.trim().toLowerCase();
      const { data: prof, error: profErr } = await supabase
        .from("profiles")
        .select("id,username,display_name,bio,city,base_location,instagram,avatar_url,cover_url,equipment,deposit_percent,travel_fee_per_km,is_published,created_at,updated_at,portfolio_urls,free_km,is_featured,is_demo,tagline,booking_notes,fixed_deposit,verification_status,verified_at,page_settings")
        .eq("username", normalizedUsername)
        .eq("is_published", true)
        .maybeSingle();
      if (profErr) throw profErr;

      const mergedProfile = (prof as Profile | null) ?? null;
      setProfile(mergedProfile);
      if (mergedProfile) {
        const pid = mergedProfile.id;
        const { pricing: p, reviews: r, unavail: u, bookedSlots: bk, completedCount: cc, responseHours: rh, isPro } = await fetchProfileData({ data: { pid } });
        // شارة التوثيق وعروض الأسعار لباقة Pro فقط
        setProfile(isPro ? { ...mergedProfile, is_pro: true } : { ...mergedProfile, is_pro: false, verification_status: null });
        setResponseHours(rh);
        setPricing(p as Pricing[]);
        setReviews(r);
        setCompletedCount(cc);
        // ✅ إصلاح: تحليل نتيجة RPC بشكل صحيح بدون الاعتماد على اسم الدالة كـ key
        // RPC قد يُعيد string مباشرة أو object بمفاتيح متعددة
        setUnavail(((u ?? []) as any[]).map((x: any) => {
          if (typeof x === "string") return x;
          // محاولة استخراج الـ date من أي مفتاح ممكن
          if (x && typeof x === "object") {
            if (typeof x.date === "string") return x.date;
            // أخذ أول قيمة string في الـ object
            const firstStr = Object.values(x).find((v) => typeof v === "string");
            if (firstStr) return firstStr as string;
          }
          return null;
        }).filter(Boolean) as string[]);
        setBookedSlots((bk ?? []) as any);
        try {
          const dep = await fetchDeposit({ data: { username: normalizedUsername } });
          setDeposit(dep);
        } catch { /* ignore */ }
      }
     } catch (e) {
      console.error("[photographer] load failed", e);
      setLoadFailed(true);
     } finally {
      setLoading(false);
     }
    })();
  }, [username, reloadKey]);

  // Inject JSON-LD structured data when profile + reviews are loaded (helps Google).
  useEffect(() => {
    if (!profile) return;
    const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
    const ld: any = {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      "@id": `https://memoria-production.ahmad000haddad.workers.dev/photographers/${profile.username}`,
      name: profile.display_name,
      url: `https://memoria-production.ahmad000haddad.workers.dev/photographers/${profile.username}`,
      image: profile.cover_url || profile.avatar_url || undefined,
      description: profile.bio || undefined,
      address: profile.city ? { "@type": "PostalAddress", addressLocality: profile.city, addressCountry: "JO" } : undefined,
      priceRange: "$$",
      ...(reviews.length > 0
        ? {
            aggregateRating: {
              "@type": "AggregateRating",
              ratingValue: avg.toFixed(1),
              reviewCount: reviews.length,
            },
          }
        : {}),
    };
    const el = document.createElement("script");
    el.type = "application/ld+json";
    el.id = "photographer-jsonld";
    el.text = JSON.stringify(ld);
    document.querySelectorAll("#photographer-jsonld").forEach((n) => n.remove());
    document.head.appendChild(el);
    return () => { el.remove(); };
  }, [profile, reviews]);

  // Idea 8: Scroll progress bar, eased with a spring so it glides instead of stepping
  const intro = useIntro();
  const { scrollYProgress } = useScroll();
  const progressX = useSpring(scrollYProgress, { stiffness: 140, damping: 30, mass: 0.3 });

  if (loading) return <FallbackPage>{tr("جاري التحميل…")}</FallbackPage>;
  if (loadFailed) return (
    <FallbackPage>
      {tr("تعذّر تحميل صفحة المصوّرة. تحقّقي من الاتصال وحاولي مجدداً.")}{" "}
      <button onClick={() => setReloadKey((k) => k + 1)} className="underline text-gold">{tr("إعادة المحاولة")}</button>
    </FallbackPage>
  );
  if (!profile) return <FallbackPage>{tr("لا يوجد مصوّر بهذا الاسم.")}{" "}<Link to="/search" className="underline">{tr("عُد للبحث")}</Link></FallbackPage>;

  // حجز واحد باليوم: أي يوم فيه حجز قائم (أو طلب ينتظر رد المصوّرة) يُحجب كاملاً.
  const blockedDates = [...new Set([...unavail, ...bookedSlots.map((s) => s.event_date)])];
  const avgRating = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const yOffset = -80; 
      const y = el.getBoundingClientRect().top + window.scrollY + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
      el.classList.add("ring-2", "ring-gold", "bg-gold/5", "transition-all", "duration-1000");
      setTimeout(() => {
        el.classList.remove("ring-2", "ring-gold", "bg-gold/5");
      }, 1000);
    }
  };
  const pickPackage = (id: string) => { setPickedPackageId(id); setTimeout(() => scrollTo("book"), 50); };

  const ps = activePs ?? sanitizePageSettings(profile.page_settings);
  const gallerySection = (
    <>
      {/* GALLERY */}
      {ps.show_gallery && (profile.portfolio_urls?.length ?? 0) > 0 && (
        <section className="container-editorial pb-16">
          <div className="text-center mb-8">
            <div className="text-xs uppercase tracking-[0.3em] text-gold mb-2">{tr("مختارات")}</div>
            <h2 className="font-serif text-3xl">{tr("مختارات من الأعمال")}</h2>
          </div>
          <div className={GALLERY_GRID[ps.gallery_layout]}>
            {profile.portfolio_urls!.slice(0, ps.gallery_count).map((item, i) => {
              const { src: u, link } = splitPortfolioItem(item);
              const motionProps = {
                initial: intro ? { opacity: 0, y: 18 } : false,
                whileInView: { opacity: 1, y: 0 },
                viewport: { once: true, amount: 0.3 },
                transition: { duration: 0.8, delay: (i % 4) * 0.08, ease: EASE_OUT },
              } as const;
              const img = <ProgressiveImage src={u} alt={tr("{0} — معرض الأعمال {1}", [profile.display_name, i + 1])} className="w-full h-full object-cover hover:scale-105 transition" />;
              // صورة مربوطة برابط (فيديو/ألبوم) تفتح الرابط بدل العارض
              return link ? (
                <motion.a
                  key={i}
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  aria-label={tr("فتح العمل على {0}", [linkLabel(link)])}
                  className={`group relative block ${galleryCell(ps.gallery_layout, i)} bg-secondary rounded-sm overflow-hidden`}
                  {...motionProps}
                >
                  {tx(img)}
                  <span className="pointer-events-none absolute inset-0 grid place-items-center bg-black/20 transition group-hover:bg-black/35">
                    <span className="grid h-12 w-12 place-items-center rounded-full bg-white/90 text-charcoal shadow">
                      {/youtube|vimeo/i.test(linkLabel(link)) ? <Play className="h-5 w-5 fill-current" /> : <ExternalLink className="h-5 w-5" />}
                    </span>
                  </span>
                  <span className="pointer-events-none absolute bottom-2 start-2 rounded-full bg-black/60 px-2 py-0.5 text-[11px] text-white">{linkLabel(link)}</span>
                </motion.a>
              ) : (
                <motion.button
                  type="button"
                  key={i}
                  onClick={() => setLightboxIdx(i)}
                  className={`block ${galleryCell(ps.gallery_layout, i)} bg-secondary rounded-sm overflow-hidden cursor-zoom-in`}
                  {...motionProps}
                >
                  {tx(img)}
                </motion.button>
              );
            })}
          </div>
          <AnimatePresence>
          {lightboxIdx !== null && (
            <Lightbox
              images={(profile.portfolio_urls ?? []).slice(0, ps.gallery_count).map((x) => splitPortfolioItem(x).src)}
              index={lightboxIdx}
              onClose={() => setLightboxIdx(null)}
            />
          )}
          </AnimatePresence>
        </section>
      )}

    </>
  );

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      {ps.announcement && (
        <div className="relative z-30 bg-gold px-4 py-2 pt-[calc(0.5rem+3.5rem)] sm:pt-2 text-center text-sm text-gold-foreground">{ps.announcement}</div>
      )}
      {/* Idea 8: Scroll Progress Bar */}
      <motion.div
        id="scroll-progress-bar"
        className="fixed top-0 end-0 start-0 h-1 bg-gold origin-left z-50"
        style={{ scaleX: progressX }}
      />
      
      {/* إخفاء الهيدر التقليدي في الموبايل واستبداله بزر رجوع بسيط */}
      <div className="hidden sm:block">
      <Header />
      </div>

      {/* شريط التنقل العلوي للموبايل (App-like Top Bar) */}
      <div className="sm:hidden fixed top-0 inset-x-0 z-40 bg-charcoal/80 backdrop-blur-md border-b border-ivory/10 h-14 flex items-center px-4 pt-[env(safe-area-inset-top)]">
        <button
          type="button"
          aria-label={tr("رجوع")}
          onClick={() => window.history.back()}
          className="h-8 w-8 bg-ivory/10 rounded-full flex items-center justify-center text-ivory hover:bg-ivory/20"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* HERO */}
      {/* HERO — Editorial Magazine layout */}
      <section className="relative bg-charcoal text-ivory grain-overlay overflow-hidden pt-14 sm:pt-0">
        {/* Top meta strip: ISSUE / DATE / FEATURE — like a magazine masthead */}
        <div className="container-editorial pt-8 pb-4 border-b border-ivory/10 flex flex-wrap items-center gap-x-8 gap-y-2 text-[11px] uppercase tracking-[0.35em] opacity-70">
          <span>{tr("Memoria · العدد ٠١")}</span>
          <span className="hidden sm:inline">{new Date().toLocaleDateString(locale("ar-JO"), { year: "numeric", month: "long" })}</span>
          <span className="ms-auto inline-flex items-center gap-2">
            <span className="relative inline-flex h-1.5 w-1.5">
              <span aria-hidden className="absolute inset-0 rounded-full bg-gold opacity-60 animate-ping opacity-0 [animation-duration:1.6s] [animation-iteration-count:2] [animation-delay:0.8s]" />
              <span className="relative h-1.5 w-1.5 rounded-full bg-gold" />
            </span>
            {tr("ملف المصوّرة")}
          </span>
        </div>

        <div className="container-editorial grid gap-10 lg:grid-cols-12 items-stretch py-12 lg:py-16 relative">
          {/* LEFT — typography column (cols 1..5) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="order-2 lg:order-1 lg:col-span-5 flex flex-col justify-between"
          >
            <div>
              {profile.is_demo && (
                <div className="mb-4 inline-block rounded-full border border-gold/60 bg-charcoal/60 px-4 py-1.5 text-xs text-ivory backdrop-blur">
                  {tr("نسخة تجريبية للمصوّرات فقط، لتري كيف سيبدو حسابك. الحجز يعمل بشكل طبيعي، أما التحويل فغير متاح.")}
                </div>
              )}
              <div className="text-[11px] uppercase tracking-[0.5em] text-gold mb-4">
                {profile.tagline || "WEDDING PHOTOGRAPHY"}
              </div>
              {profile.avatar_url && (
                <span className="relative mb-5 inline-block">
                  <motion.img
                    src={profile.avatar_url}
                    alt={tx(profile.display_name)}
                    className="h-24 w-24 sm:h-28 sm:w-28 rounded-full object-cover border-2 border-transparent shadow-elegant"
                    initial={intro ? { opacity: 0, scale: 0.92 } : false}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.9, ease: EASE_OUT }}
                  />
                  {/* the gold ring draws itself around the portrait, from the top */}
                  <svg aria-hidden viewBox="0 0 100 100" className="pointer-events-none absolute inset-0 h-full w-full -rotate-90 text-gold/60">
                    <motion.circle
                      cx="50" cy="50" r="49" fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke"
                      initial={intro ? { pathLength: 0 } : false}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 1.6, delay: 0.3, ease: EASE_DRAW }}
                    />
                  </svg>
                </span>
              )}
              <h1 className="display-serif text-[clamp(3rem,8vw,7rem)] mb-6">
                <RevealWords lines={[profile.display_name]} delay={0.35} step={0.14} />
              </h1>
              <div className="flex flex-wrap items-center gap-2 mb-6">
                {profile.verification_status === "verified" && <VerifiedBadge />}
                {profile.is_featured && (
                  <span className="inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.25em] bg-gold/15 text-gold px-3 py-1.5 rounded-full border border-gold/30">
                    <Star className="h-3 w-3 fill-gold" />{" "}{tr("اختيار المحرّر")}
                  </span>
                )}
                {/* ⚡ سرعة الرد الحقيقية (وسيط آخر 180 يوماً، من 3 طلبات فأكثر) */}
                {responseHours != null && (
                  <span className="inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.25em] bg-emerald-500/15 text-emerald-400 px-3 py-1.5 rounded-full border border-emerald-500/30" title={tr("الوقت المعتاد لرد المصوّرة على طلبات الحجز")}>
                    <span className="text-emerald-400">⚡</span>{" "}{responseHours < 1 ? tr("تردّ خلال أقل من ساعة") : tr("تردّ خلال ~{0} ساعة", [Math.round(responseHours)])}
                  </span>
                )}
              </div>
              {profile.bio && (
                <p className="max-w-md text-base sm:text-lg leading-[1.8] opacity-85 whitespace-pre-line mb-8">
                  {tx(profile.bio)}
                </p>
              )}
              <div className="flex gap-3 flex-wrap">
                <motion.button
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => scrollTo("book")}
                  className="hidden sm:inline-flex group relative overflow-hidden bg-ivory text-charcoal px-8 py-3.5 rounded-sm font-medium transition before:absolute before:inset-0 before:-translate-x-full hover:before:translate-x-full before:bg-gradient-to-r before:from-transparent before:via-gold/40 before:to-transparent before:transition-transform before:duration-700"
                >
                  <span className="relative">{tr("احجزي الآن")}</span>
                </motion.button>
                <motion.button
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => scrollTo("packages")}
                  className="w-full sm:w-auto border border-ivory/40 text-ivory px-8 py-3.5 rounded-sm hover:bg-ivory/10 transition"
                >
                  {tr("الباقات")}
                </motion.button>
              </div>
            </div>

            {/* Magazine-style stats row */}
            {ps.show_stats && <div className="mt-12 grid grid-cols-3 gap-4 border-t border-ivory/10 pt-6">
              <Stat label={tr("التقييم")} value={reviews.length ? <CountTo onMount to={avgRating} decimals={1} locale="en" delay={0.6} /> : "—"} sub={reviews.length ? tr("{0} مراجعة", [reviews.length]) : tr("جديد")} />
              <Stat label={tr("الموقع")} value={profile.city || "—"} sub={profile.base_location || tr("الأردن")} />
              <Stat label={tr("الباقات")} value={<CountTo onMount to={pricing.filter((p) => p.package !== "addon").length} locale="en" delay={0.7} duration={1} />} sub={tr("باقة احترافية")} />
            </div>}
          </motion.div>

          {/* RIGHT — full-bleed cover (cols 6..12) with subtle scale-in */}
          <motion.div
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="order-1 lg:order-2 lg:col-span-7 relative min-h-[420px] lg:min-h-[640px] rounded-sm overflow-hidden bg-gradient-royal"
          >
            {(profile.cover_url || profile.avatar_url) && (
              <ProgressiveImage
                src={profile.cover_url || profile.avatar_url!}
                alt={tx(profile.display_name)}
                className="absolute inset-0 h-full w-full object-cover"
              />
            )}
            {/* Subtle gradient for legibility of caption */}
            <div className="absolute inset-0 bg-gradient-to-tr from-charcoal/40 via-transparent to-transparent" />

            {/* Floating editorial caption */}
            <div className="absolute bottom-4 end-4 sm:bottom-6 sm:end-6 max-w-[260px]">
              <div className="bg-ivory/95 text-charcoal backdrop-blur-sm border border-border rounded-sm p-4 shadow-elegant">
                <div className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground mb-2">
                  {tr("مختارة من المعرض")}
                </div>
                <div className="font-serif text-base leading-snug">
                  {ps.hero_quote || tr("«كل صورة قصة، وكل قصة تستحق الفخامة»")}
                </div>
                {profile.city && (
                  <div className="mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" /> {tx(profile.city)}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {ps.section_order === "gallery_first" && gallerySection}

      {/* PACKAGES */}
      <section id="packages" className="container-editorial py-16">
        {/* TRUST BADGES — placed above packages so it informs the booking decision */}
        {ps.show_trust_badges && <TrustBadges
          profile={profile}
          completedCount={completedCount}
          unavailCount={blockedDates.length}
          responseHours={responseHours}
        />}
        <div className="text-center mb-10">
          <div className="text-xs uppercase tracking-[0.3em] text-gold mb-2">{tr("الباقات")}</div>
          <h2 className="font-serif text-3xl sm:text-4xl">{tr("بطاقة الأسعار")}</h2>
        </div>
        {pricing.length === 0 ? (
          <p className="text-center text-muted-foreground">{tr("لم تُحدَّد الباقات بعد.")}</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 relative">
            {pricing.filter((p) => p.package !== "addon").map((p, idx, arr) => {
              const isPopular = arr.length >= 3 && idx === 1;
              // على الهاتف نعرض أول ٣ باقات فقط حتى تضغط «عرض كل الباقات»
              const collapsed = !showAllPkgs && idx >= 3;
              const features = parseFeatures(p.description);
              return (
                <RiseIn key={p.id} index={idx} className={`h-full ${collapsed ? "hidden sm:block" : ""}`}>
                <div className={`relative flex h-full flex-col rounded-sm border bg-card p-6 shadow-soft transition hover:-translate-y-0.5 hover:shadow-elegant ${isPopular ? 'border-gold border-2 ring-1 ring-gold/20 shadow-[0_0_20px_rgba(201,162,39,0.15)]' : 'border-border'}`}>
                  {isPopular && (
                    <span className="absolute -top-3 end-1/2 -translate-x-1/2 bg-gradient-gold text-charcoal px-3 py-1 rounded-sm text-[11px] font-bold uppercase tracking-wider">
                      {tr("الباقة الأكثر طلباً")}
                    </span>
                  )}
                  <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">{p.service === "cinematic_video" ? tr("فيديو سينمائي") : tr("تصوير فوتوغرافي")}</div>
                  <h3 className="font-serif text-2xl mb-1">{tx(p.label)}</h3>
                  {p.subtitle && <p className="text-sm text-muted-foreground">{tx(p.subtitle)}</p>}
                  <div className="font-serif text-3xl text-gold my-4">{Number(p.price).toLocaleString(locale("ar-JO"))} <span className="text-sm">{tr("د.أ")}</span></div>
                  {features.length > 0 && (
                    <ul className="mb-6 space-y-2.5 border-t border-border pt-4 text-sm text-muted-foreground">
                      {features.map((ft, i) => (
                        <li key={i} className={`flex items-start gap-2.5 leading-relaxed ${ft.kind === "exclusive" ? "text-foreground font-medium" : ""}`}>
                          {ft.kind === "exclusive" ? <Star className="mt-0.5 h-4 w-4 shrink-0 fill-gold text-gold" aria-label={tr("ميزة حصرية")} />
                            : ft.kind === "fast" ? <Zap className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-label={tr("تسليم سريع")} />
                            : <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-gold/70" aria-hidden />}
                          <span>{emphasizeNumbers(ft.text)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <button onClick={() => pickPackage(p.id)} className={`mt-auto w-full py-2 rounded-sm text-sm transition-transform duration-150 ease-out active:scale-[0.97] ${isPopular ? 'bg-gold text-charcoal font-medium hover:bg-gold/90' : 'bg-charcoal text-ivory hover:opacity-90'}`}>{p.cta_label?.trim() || tr("احجزي هذه الباقة")}</button>
                  {pickedPackageId === p.id && <DrawFrame key={`pick-${p.id}`} duration={1.2} />}
                </div>
                </RiseIn>
              );
            })}
          </div>
        )}
        
        {/* High Demand Hint */}
        {completedCount >= 3 && (
          <div className="mt-8 flex justify-center">
            <span className="inline-flex items-center gap-2 text-xs text-amber-700 bg-amber-50 px-4 py-2 rounded-sm border border-amber-200">
              <span className="animate-pulse">🔥</span> <strong>{tr("طلب عالي:")}</strong>{" "}{tr("تم حجز هذه المصوّرة مرات عديدة مؤخراً. سارعي بتأكيد حجزكِ!")}
            </span>
          </div>
        )}
        {!showAllPkgs && pricing.filter((p) => p.package !== "addon").length > 3 && (
          <button
            type="button"
            onClick={() => setShowAllPkgs(true)}
            className="sm:hidden mt-4 w-full min-h-12 rounded-full border border-border text-sm hover:bg-secondary"
          >{tr("عرض كل الباقات ({0})", [pricing.filter((p) => p.package !== "addon").length])}</button>
        )}
      </section>

      {ps.section_order === "packages_first" && gallerySection}

      {/* BOOKING + DEPOSIT */}
      <section id="book" className="bg-secondary/40 py-16">
        <div className="container-editorial grid gap-8 lg:grid-cols-[1.2fr_1fr]">
          <SimpleBookingForm profile={profile} pricing={pricing} blockedDates={blockedDates} bookedSlots={bookedSlots} pickedPackageId={pickedPackageId} />
          <DepositCard profile={profile} cliqAlias={deposit.cliq_alias} bankInfo={deposit.bank_info} />
        </div>
      </section>

      {/* NOTES */}
      {ps.show_booking_notes && profile.booking_notes && (
        <section className="container-editorial py-12">
          <div className="rounded-sm border border-border bg-card p-6 max-w-2xl mx-auto">
            <h3 className="font-serif text-xl mb-3">{tr("ملاحظات مهمة")}</h3>
            <div className="text-sm text-muted-foreground leading-loose whitespace-pre-line">{tx(profile.booking_notes)}</div>
          </div>
        </section>
      )}

      {/* REVIEWS */}
      {ps.show_reviews && reviews.length > 0 && (
        <section className="container-editorial pb-12">
          <h2 className="font-serif text-2xl mb-2 text-center">{tr("آراء العملاء")}</h2>
          <div className="flex justify-center mb-4">
            <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.2em] bg-gold/10 text-gold px-3 py-1 rounded-full border border-gold/30">
              <CheckCircle2 className="h-3 w-3" />{" "}{tr("تقييمات من حجوزات مكتملة فقط")}
            </span>
          </div>
          <div className="grid sm:grid-cols-2 gap-3 max-w-3xl mx-auto">
            {reviews.slice(0, 6).map((r) => (
              <div key={r.id} className="rounded-sm border border-border bg-card p-4">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-sm">{tx(r.client_name)}</div>
                  <div className="flex">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`h-3.5 w-3.5 ${i < r.rating ? "fill-gold text-gold" : "text-muted-foreground/40"}`} />)}</div>
                </div>
                {r.comment && <p className="text-sm text-muted-foreground mt-2">{tx(r.comment)}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* CONTACT FOOTER */}
      <section className="container-editorial pb-8 sm:pb-16 text-center">
        <div className="text-xs uppercase tracking-[0.3em] text-gold mb-3">{tr("للاستفسار والتواصل")}</div>
        <div className="flex justify-center gap-3">
          {profile.instagram && (
            <a href={`https://instagram.com/${profile.instagram}`} target="_blank" rel="noreferrer" aria-label={tr("إنستغرام")} className="h-12 w-12 grid place-items-center rounded-full border border-border hover:bg-secondary"><Instagram className="h-5 w-5" /></a>
          )}
          <button
            type="button"
            aria-label={tr("مشاركة الملف")}
            onClick={() => {
              const url = typeof window !== "undefined" ? window.location.href : "";
              if (navigator.share) navigator.share({ title: profile.display_name, url }).catch(() => {});
              else { navigator.clipboard.writeText(url); toast.success(tr("نُسخ الرابط")); }
            }}
            className="h-12 w-12 grid place-items-center rounded-full border border-border hover:bg-secondary"
          ><Share2 className="h-5 w-5" /></button>
        </div>
      </section>

      <Footer />

      {/* شريط حجز ثابت على الموبايل — يختفي عندما يكون نموذج الحجز ظاهراً */}
      <StickyBookBar name={profile.display_name} onBook={() => scrollTo("book")} />
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="group">
      <div className="text-[11px] uppercase tracking-[0.3em] text-gold/80 mb-1 flex items-center gap-1">
        {(label === "الموقع" || label === tr("الموقع")) && <MapPin className="h-3 w-3 group-hover:animate-bounce" />}
        {tx(label)}
      </div>
      <div className="font-serif text-2xl leading-none">{tx(value)}</div>
      {sub && <div className="text-[11px] opacity-60 mt-1 truncate">{tx(sub)}</div>}
    </div>
  );
}

function ProgressiveImage({ src, alt, className }: { src: string, alt?: string, className?: string }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Idea 10: Skeleton Crossfade */}
      <div className={`absolute inset-0 bg-secondary/80 animate-pulse transition-opacity duration-700 ${loaded ? "opacity-0" : "opacity-100"}`} />
      <img
        src={src}
        alt={tx(alt)}
        className={`w-full h-full object-cover transition-all duration-700 ease-in-out ${loaded ? "opacity-100 blur-0 scale-100" : "opacity-0 blur-md scale-105"}`}
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
}

function TrustBadges({ profile, completedCount, unavailCount, responseHours }: { profile: Profile; completedCount: number; unavailCount: number; responseHours: number | null }) {
  const joined = profile.created_at ? new Date(profile.created_at) : null;
  const joinedLabel = joined
    ? joined.toLocaleDateString(locale("ar-JO"), { month: "long", year: "numeric" })
    : "—";
  const depositLabel = profile.fixed_deposit
    ? tr("{0} د.أ", [Number(profile.fixed_deposit).toLocaleString(locale("ar-JO"))])
    : `${profile.deposit_percent || 25}%`;
  const items = [
    { icon: CalendarCheck, label: tr("عضوة منذ"), value: joinedLabel },
    { icon: Award, label: tr("حجوزات مكتملة"), value: completedCount > 0 ? String(completedCount) : tr("جديدة") },
    { icon: Shield, label: tr("العربون"), value: depositLabel },
    responseHours != null
      ? { icon: Clock, label: tr("تردّ عادةً خلال"), value: responseHours < 1 ? tr("أقل من ساعة") : tr("{0} ساعة", [Math.round(responseHours)]) }
      : { icon: Clock, label: tr("تواريخ مشغولة"), value: String(unavailCount) },
  ];
  return (
    <div className="mb-10 grid grid-cols-2 md:grid-cols-4 gap-3">
      {items.map((it) => (
        <div key={it.label} className="rounded-sm border border-border bg-card p-4 flex items-center gap-3">
          <div className="h-9 w-9 grid place-items-center rounded-sm bg-secondary text-gold shrink-0">
            <it.icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{tx(it.label)}</div>
            <div className="font-serif text-base truncate">{tx(it.value)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

const formatPhone = (v: string) => {
  const clean = v.replace(/\D/g, '').slice(0, 10);
  if (clean.length > 7) return clean.slice(0, 3) + ' ' + clean.slice(3, 6) + ' ' + clean.slice(6);
  if (clean.length > 3) return clean.slice(0, 3) + ' ' + clean.slice(3);
  return clean;
};

const getAddonEmoji = (name: string) => {
  if (name.includes('ألبوم') || name.includes('البوم')) return '📖';
  if (name.includes('درون') || name.includes('طيارة')) return '🚁';
  if (name.includes('مطبوع') || name.includes('طباعة')) return '🖼️';
  if (name.includes('فيديو') || name.includes('تصوير')) return '🎥';
  if (name.includes('ساعة') || name.includes('اضافي') || name.includes('وقت')) return '⏱️';
  return '✨';
};

const MY_BOOKINGS_KEY = "memoria.my-bookings";

function SavedBookingsBanner() {
  const [items, setItems] = useState<{ token: string; photographer?: string; date?: string }[]>([]);
  useEffect(() => {
    try { setItems(JSON.parse(window.localStorage.getItem(MY_BOOKINGS_KEY) || "[]")); } catch { /* ignore */ }
  }, []);
  if (items.length === 0) return null;
  return (
    <div className="mb-4 rounded-sm border border-emerald-600/30 bg-emerald-600/5 px-3 py-2 text-xs space-y-1">
      <div className="font-medium text-foreground">{tr("لديكِ حجوزات سابقة من هذا الجهاز:")}</div>
      {items.slice(0, 3).map((x) => (
        <Link key={x.token} to="/track/$token" params={{ token: x.token }} className="block underline underline-offset-2 text-emerald-700 dark:text-emerald-400">
          {tr("تتبّع حجزك")}{x.photographer ? tr("مع {0}", [x.photographer]) : ""}{x.date ? ` — ${x.date}` : ""}
        </Link>
      ))}
    </div>
  );
}

function SimpleBookingForm({ profile, pricing, blockedDates, bookedSlots, pickedPackageId }: { profile: Profile; pricing: Pricing[]; blockedDates: string[]; bookedSlots: { event_date: string; start_time: string; end_time: string }[]; pickedPackageId?: string }) {
  const storageKey = `memoria.booking-draft.${profile.username}`;
  const initial = {
    client_name: "", client_phone: "", client_email: "", event_date: "", start_time: "", end_time: "",
    package_id: "", venue_address: "", remaining_note: "", client_notes: "",
    privacy_level: "public" as "public" | "private_only",
  };
  const [f, setF] = useState(initial);
  const [addonQty, setAddonQty] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ token: string; verify: VerifyInfo | null } | null>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [pkgListOpen, setPkgListOpen] = useState(false);
  const [consent, setConsent] = useState(false);
  const [restoredDraft, setRestoredDraft] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [copied, setCopied] = useState(false);
  const askConfirm = useConfirm();
  // اقتراح سعر: لا يُنشأ حجز ولا يُحجز الموعد قبل موافقة المصوّرة
  const offerFn = useServerFn(submitPriceOffer);
  const [offerOpen, setOfferOpen] = useState(false);
  const [offerPrice, setOfferPrice] = useState("");
  const [offerSending, setOfferSending] = useState(false);
  const [offerSent, setOfferSent] = useState<string | null>(null);

  // A sent request survives refresh/leaving the page, so the bride can always copy her tracking link again
  const successKey = `memoria.booking-success.${profile.username}`;
  const saveSuccess = (v: { token: string; verify: VerifyInfo | null } | null) => {
    setSuccess(v);
    try { v ? window.localStorage.setItem(successKey, JSON.stringify(v)) : window.localStorage.removeItem(successKey); } catch { /* ignore */ }
  };

  // Restore draft from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const done = window.localStorage.getItem(successKey);
      if (done) { const v = JSON.parse(done); if (v?.token) { setSuccess(v); return; } }
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (draft?.f) setF((prev) => ({ ...prev, ...draft.f }));
      if (draft?.addonQty) setAddonQty(draft.addonQty);
      if (draft?.step) setStep(draft.step);
      if (typeof draft?.consent === "boolean") setConsent(draft.consent);
      if (draft?.f?.event_date || draft?.f?.package_id || draft?.f?.client_name) setRestoredDraft(true);
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist draft on change (skip when success — we clear instead)
  useEffect(() => {
    if (typeof window === "undefined" || success) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify({ f, addonQty, step, consent }));
    } catch { /* ignore */ }
  }, [f, addonQty, step, consent, success, storageKey]);

  const clearDraft = () => {
    setF(initial); setAddonQty({}); setStep(1); setConsent(false); setRestoredDraft(false);
    try { window.localStorage.removeItem(storageKey); } catch { /* ignore */ }
    toast.success(tr("تم مسح المسودة"));
  };
  const navigate = useNavigate();
  const submitFn = useServerFn(submitBookingRequest);
  const getByTokenFn = useServerFn(getBookingByToken);
  const mainPackages = pricing.filter((p) => p.package !== "addon");
  const addonPackages = pricing.filter((p) => p.package === "addon");
  const selected = pricing.find((p) => p.id === f.package_id);
  const selectedAddons = addonPackages
    .map((a) => ({ rule: a, qty: addonQty[a.id] || 0 }))
    .filter((x) => x.qty > 0);
  const isBlocked = !!f.event_date && blockedDates.includes(f.event_date);
  const daySlots = bookedSlots.filter((s) => s.event_date === f.event_date);
  const toMin = (t: string) => { const [h, m] = t.split(":").map(Number); return (h || 0) * 60 + (m || 0); };
  const hasConflict = !!(f.event_date && f.start_time && f.end_time) && daySlots.some((s) => {
    const a1 = toMin(f.start_time), a2 = toMin(f.end_time);
    const b1 = toMin(s.start_time), b2 = toMin(s.end_time);
    return a1 < b2 && b1 < a2;
  });

  // هل يتّسع وقت الباقة في اليوم المختار؟ (نوافذ فارغة بين 08:00 و 24:00)
  const pkgHours = (pkg: Pricing) => {
    if (pkg.package === "full_day") return 13;
    if (pkg.package !== "hourly") return 0;
    const m = /(\d+)\s*ساعة|(\d+)\s*ساعات|\((\d+)\s*ساع/.exec(pkg.label) || /(\d+)\s*hours?/i.exec(pkg.label);
    return m ? Number(m[1] || m[2] || m[3]) : 4;
  };
  const packageFits = (pkg: Pricing) => {
    const need = pkgHours(pkg) * 60;
    if (!f.event_date || !need || daySlots.length === 0) return true;
    const busy = daySlots.map((x) => [toMin(x.start_time), toMin(x.end_time) || 1440] as const).sort((a, b) => a[0] - b[0]);
    let cursor = 480, longest = 0;
    for (const [b1, b2] of busy) { longest = Math.max(longest, b1 - cursor); cursor = Math.max(cursor, b2); }
    longest = Math.max(longest, 1440 - cursor);
    return longest >= need;
  };

  const blockedDateObjs = blockedDates.map((d) => {
    const [y, m, day] = d.split("-").map(Number);
    return new Date(y, m - 1, day);
  });
  const selectedDateObj = f.event_date
    ? (() => { const [y, m, day] = f.event_date.split("-").map(Number); return new Date(y, m - 1, day); })()
    : undefined;
  const daysUntil = selectedDateObj ? Math.floor((selectedDateObj.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null;

  // تعبئة تلقائية للأوقات والملاحظات حسب نوع الباقة
  const onSelectPackage = (id: string) => {
    const pkg = pricing.find((p) => p.id === id);
    if (!pkg) return setF({ ...f, package_id: id });
    let start = f.start_time, end = f.end_time;
    if (pkg.package === "full_day") { start = start || "10:00"; end = end || "23:00"; }
    else if (pkg.package === "hourly") {
      const m = /(\d+)\s*ساعة|(\d+)\s*ساعات|\((\d+)\s*ساع/.exec(pkg.label) || /(\d+)\s*hours?/i.exec(pkg.label);
      const hours = m ? Number(m[1] || m[2] || m[3]) : 4;
      start = start || "18:00";
      const endHour = (18 + hours) % 24;
      end = end || `${String(endHour).padStart(2, "0")}:00`;
    }
    const note = tr("الباقة: {0} — {1} د.أ{2}", [pkg.label, Number(pkg.price).toLocaleString(locale("ar-JO")), pkg.description ? `\n${pkg.description}` : ""]);
    setF({ ...f, package_id: id, start_time: start, end_time: end, client_notes: f.client_notes ? f.client_notes : note });
  };

  // عند اختيار الباقة من زر "احجزي هذه الباقة" خارج النموذج
  useEffect(() => {
    if (pickedPackageId && pickedPackageId !== f.package_id) onSelectPackage(pickedPackageId);
    setPkgListOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickedPackageId]);

  const basePrice = selected ? Number(selected.price) : 0;
  const addonsTotal = selectedAddons.reduce((s, x) => s + Number(x.rule.price) * x.qty, 0);
  const total = basePrice + addonsTotal;
  const deposit = total > 0
    ? (profile.fixed_deposit ?? Math.round(total * (Number(profile.deposit_percent || 25) / 100)))
    : 0;

  const submit = async () => {
    if (!f.client_name || !f.client_phone || !f.client_email || !f.event_date || !selected) {
      return toast.error(tr("الرجاء تعبئة الاسم والهاتف والإيميل والتاريخ واختيار الباقة"));
    }
    if (!normalizePhone(f.client_phone)) return toast.error(PHONE_HINT);
    if (!isEmail(f.client_email)) return toast.error(EMAIL_HINT);
    if (!consent) {
      return toast.error(tr("الرجاء الموافقة على سياسة الخصوصية والشروط"));
    }
    const start = f.start_time || "12:00";
    const end = f.end_time || "18:00";
    if (toMin(end) <= toMin(start)) {
      return toast.error(tr("وقت الانتهاء يجب أن يكون بعد وقت البداية"));
    }
    if (isBlocked) return toast.error(tr("هذا اليوم غير متاح، الرجاء اختيار يوم آخر"));
    if (hasConflict) return toast.error(tr("هذا الوقت محجوز، اختاري وقتاً مختلفاً"));
    setSubmitting(true);
    hapticVibrate("light");
    try {
      const notes = [f.client_notes, f.remaining_note ? tr("الرصيد المتبقي: {0}", [f.remaining_note]) : ""].filter(Boolean).join("\n");
      const items = [
        { rule_id: selected.id, qty: 1 },
        ...selectedAddons.map((x) => ({ rule_id: x.rule.id, qty: x.qty })),
      ];
      const res = await submitFn({
        data: {
          photographer_id: profile.id,
          client_name: f.client_name,
          client_email: f.client_email.trim(),
          client_phone: f.client_phone,
          event_date: f.event_date,
          start_time: start,
          end_time: end,
          venue_address: f.venue_address || null,
          items,
          client_notes: notes || null,
          privacy_level: f.privacy_level,
        },
      });
      saveSuccess({ token: res.tracking_token, verify: (res as any).verify ?? null });
      // احفظي رابط التتبع على الجهاز حتى لا يضيع إذا أُغلقت الصفحة
      try {
        const list = JSON.parse(window.localStorage.getItem(MY_BOOKINGS_KEY) || "[]");
        const next = [{ token: res.tracking_token, photographer: profile.display_name, date: f.event_date }, ...list.filter((x: any) => x?.token !== res.tracking_token)].slice(0, 10);
        window.localStorage.setItem(MY_BOOKINGS_KEY, JSON.stringify(next));
      } catch { /* ignore */ }
      hapticVibrate("success");
      
      // Idea 1: Confetti on Booking Submit
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#C9A227', '#E5E7EB', '#111827', '#FFFFFF']
      });
      
      try { window.localStorage.removeItem(storageKey); } catch { /* ignore */ }
    } catch (e: any) {
      hapticVibrate("error");
      toast.error(e.message || tr("فشل إرسال الطلب"));
    } finally {
      setSubmitting(false);
    }
  };

  const sendOffer = async () => {
    if (!selected) return;
    const listed = Number(selected.price);
    const price = Number(offerPrice);
    const minPrice = Math.ceil(listed * 0.5);
    if (!f.client_name.trim() || !f.client_phone || !f.client_email || !f.event_date || !f.start_time || !f.end_time) {
      return toast.error(tr("املئي الاسم والهاتف والإيميل والتاريخ ووقت البداية والنهاية أولاً"));
    }
    if (!normalizePhone(f.client_phone)) return toast.error(PHONE_HINT);
    if (!isEmail(f.client_email)) return toast.error(EMAIL_HINT);
    if (!Number.isFinite(price) || price < minPrice || price >= listed) {
      return toast.error(tr("اقترحي سعراً بين {0} و{1} د.أ", [minPrice.toLocaleString(locale("ar-JO")), (listed - 1).toLocaleString(locale("ar-JO"))]));
    }
    if (toMin(f.end_time) <= toMin(f.start_time)) return toast.error(tr("وقت الانتهاء يجب أن يكون بعد وقت البداية"));
    if (isBlocked) return toast.error(tr("هذا اليوم غير متاح، الرجاء اختيار يوم آخر"));
    if (hasConflict) return toast.error(tr("هذا الوقت محجوز، اختاري وقتاً مختلفاً"));
    setOfferSending(true);
    try {
      const res = await offerFn({
        data: {
          photographer_id: profile.id, rule_id: selected.id, offered_price: price,
          client_name: f.client_name, client_email: f.client_email.trim(), client_phone: f.client_phone,
          event_date: f.event_date, start_time: f.start_time, end_time: f.end_time,
          venue_address: f.venue_address || null, client_notes: f.client_notes || null,
        },
      });
      setOfferSent(res.token);
      hapticVibrate("success");
    } catch (e: any) {
      hapticVibrate("error");
      toast.error(e.message || tr("فشل إرسال العرض"));
    } finally {
      setOfferSending(false);
    }
  };

  // Idea 4: Dynamic Page Title — must stay above the early return below, or
  // React throws "rendered fewer hooks" the moment the booking succeeds.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const originalTitle = document.title;
    const handleVisibilityChange = () => {
      if (document.hidden && !success && (f.event_date || f.package_id)) {
        document.title = tr("عُودي لإكمال حجزك! 💍");
      } else {
        document.title = originalTitle;
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [f, success]);

  if (offerSent) {
    return (
      <div className="bg-card border border-border rounded-sm p-6 sm:p-8 shadow-soft text-center">
        <div className="mb-3 flex justify-center"><CheckCircle2 className="h-14 w-14 text-emerald-600" /></div>
        <h2 className="font-serif text-2xl mb-2">{tr("تم إرسال عرضكِ للمصوّرة")}</h2>
        <p className="text-muted-foreground mb-5">{tr("تم إرسال عرضكِ للمصوّرة. لن يُحجز الموعد إلا بعد موافقتها، وسنراسلكِ على بريدكِ وواتساب.")}</p>
        <Link to="/offer/$token" params={{ token: offerSent }} className="block bg-charcoal text-ivory py-3 rounded-sm hover:opacity-90">{tr("متابعة حالة العرض")}</Link>
        <button onClick={() => { setOfferSent(null); setOfferOpen(false); setOfferPrice(""); }} className="mt-4 text-xs text-muted-foreground underline underline-offset-2">{tr("رجوع للنموذج")}</button>
      </div>
    );
  }

  if (success) {
    const trackUrl = `/track/${success.token}`;
    const fullUrl = typeof window !== "undefined" ? `${window.location.origin}${trackUrl}` : trackUrl;
    const bookingRef = success.token.slice(0, 8).toUpperCase();
    return (
      <div className="bg-card border border-border rounded-sm p-6 sm:p-8 shadow-soft text-center">
        <div className="mb-3 flex justify-center"><DrawIcon duration={1.1}><CheckCircle2 className="h-14 w-14 text-emerald-600" /></DrawIcon></div>
        <h2 className="font-serif text-3xl mb-2">{success.verify ? tr("بقيت خطوة واحدة!") : tr("تم إرسال طلبك!")}</h2>
        <p className="text-muted-foreground mb-5">
          {success.verify ? tr("أكّدي طلبك ليصل إلى") + profile.display_name + "." : tr("تم إخطار {0} وسيتم التواصل معكِ قريبًا.", [profile.display_name])}
        </p>
        <div className="relative mb-5 rounded-sm border-2 border-transparent bg-gold/10 p-4 text-start">
          <DrawFrame delay={0.4} />
          <div className="font-semibold mb-1">{tr("🔗 رابط تتبّع حجزك — احفظيه الآن")}</div>
          <p className="text-xs text-muted-foreground mb-3 leading-relaxed">{tr("هذا الرابط هو طريقتك الوحيدة لمتابعة الحجز ورفع إثبات العربون. انسخيه وأرسليه لنفسك على واتساب. حفظناه أيضاً على هذا الجهاز.")}</p>
          <div className="font-mono text-[11px] break-all rounded-sm bg-background border border-border px-2 py-1.5 mb-3 select-all" dir="ltr">{tx(fullUrl)}</div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => { navigator.clipboard.writeText(fullUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
              className="inline-flex items-center gap-2 rounded-sm bg-charcoal text-ivory px-4 py-2 text-sm">
              {copied ? <><CheckCircle2 className="h-4 w-4" />{" "}{tr("تم النسخ")}</> : <><ClipboardCopy className="h-4 w-4" />{" "}{tr("نسخ الرابط")}</>}
            </button>
            <a href={`https://wa.me/?text=${encodeURIComponent(tr("رابط تتبّع حجزي في ميموريا:") + fullUrl)}`} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-sm border border-border px-4 py-2 text-sm hover:bg-secondary">
              <MessageCircle className="h-4 w-4" />{" "}{tr("أرسليه لنفسك على واتساب")}
            </a>
          </div>
        </div>
        {success.verify && (
          <div className="mb-5">
            <VerifyBookingPanel
              token={success.token}
              verify={success.verify}
              onVerified={() => saveSuccess({ token: success.token, verify: null })}
              onRecheck={async () => {
                const r: any = await getByTokenFn({ data: { token: success.token } });
                return !!r?.phone_verified;
              }}
            />
          </div>
        )}
        <div className="grid grid-cols-2 gap-3 mb-5 text-start">
          <div className="rounded-sm border border-border bg-secondary/40 p-3">
            <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{tr("رقم الحجز")}</div>
            <div className="font-mono text-lg font-semibold mt-1">#{tx(bookingRef)}</div>
          </div>
          <div className="rounded-sm border border-border bg-secondary/40 p-3">
            <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{tr("الرد المتوقّع")}</div>
            <div className="font-serif text-lg mt-1">{tr("خلال 24 ساعة")}</div>
          </div>
        </div>
        <div className="bg-gold/5 border border-gold/30 rounded-sm p-4 mb-5 text-start">
          <div className="text-xs uppercase tracking-[0.2em] text-gold mb-1">{tr("الخطوة التالية")}</div>
          {profile.is_demo
            ? <p className="text-sm">{tr("هذا حساب تجريبي، لذلك لا يوجد تحويل للعربون. يمكنك فتح صفحة تتبع الحجز لترى كيف تبدو.")}</p>
            : <p className="text-sm">{tr("حوّلي العربون بقيمة")}{" "}<span className="font-semibold">{tr("{0} د.أ", [deposit.toLocaleString(locale("ar-JO"))])}</span>{tr("، ثم ارفعي إثبات التحويل من صفحة تتبع الحجز.")}</p>}
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <button onClick={() => navigate({ to: trackUrl })}
                  className="flex-1 bg-charcoal text-ivory py-3 rounded-sm hover:opacity-90 inline-flex items-center justify-center gap-2">
            <Send className="h-4 w-4" />{" "}{tr("اذهبي لصفحة تتبع الحجز")}
          </button>

        </div>
        <button onClick={async () => { if (await askConfirm({ title: tr("إرسال طلب حجز جديد؟"), description: tr("تأكدي أنكِ حفظتِ رابط التتبّع. سيبقى محفوظاً أيضاً في قائمة حجوزاتك على هذا الجهاز."), confirmText: tr("طلب جديد"), cancelText: tr("رجوع") })) saveSuccess(null); }}
          className="mt-4 text-xs text-muted-foreground underline underline-offset-2">{tr("إرسال طلب حجز جديد")}</button>
      </div>
    );
  }

  const stepValid: Record<1 | 2 | 3, boolean> = {
    1: !!f.event_date && !!selected && !isBlocked && !hasConflict,
    2: true,
    3: !!f.client_name.trim() && !!normalizePhone(f.client_phone) && isEmail(f.client_email) && consent,
  };
  
  const goNext = () => {
    if (!stepValid[step]) {
      const msg = step === 1 ? tr("يجب اختيار التاريخ والباقة قبل المتابعة للخطوة التالية.") :
                  step === 3 ? tr("يرجى تعبئة جميع الحقول الإلزامية والموافقة على الشروط.") : tr("يرجى إكمال الحقول المطلوبة.");
      setFormError(msg);
      toast.error(msg);
      return;
    }
    setFormError(null);
    setStep((s) => (s === 3 ? 3 : ((s + 1) as 1 | 2 | 3)));
    // Idea 6: Auto-save Draft Toast
    toast(tr("تم حفظ مسودتك 📝"), { position: "bottom-center" });
  };
  const goBack = () => {
    setFormError(null);
    setStep((s) => (s === 1 ? 1 : ((s - 1) as 1 | 2 | 3)));
    toast(tr("تم حفظ مسودتك 📝"), { position: "bottom-center" });
  };
  const stepLabels = [tr("التاريخ والباقة"), tr("الموقع والإضافات"), tr("البيانات والتأكيد")];

  return (
    <div className="bg-card border border-border rounded-sm p-6 sm:p-8 shadow-soft">
      <div className="text-xs uppercase tracking-[0.3em] text-gold mb-2">Book in simple steps</div>
      <h2 className="font-serif text-3xl mb-4">{tr("احجزي بخطوات بسيطة")}</h2>
      <SavedBookingsBanner />
      {restoredDraft && !success && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-sm border border-gold/30 bg-gold/5 px-3 py-2 text-xs">
          <span className="text-foreground">{tr("تم استعادة مسودتك السابقة تلقائيًا.")}</span>
          <button type="button" onClick={clearDraft} className="text-muted-foreground hover:text-destructive underline underline-offset-2">
            {tr("بدء من جديد")}
          </button>
        </div>
      )}

      {/* the error eases open instead of shoving the form down in one frame */}
      <AnimatePresence initial={false}>
      {formError && (
        <motion.div key="form-error" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }} className="overflow-hidden">
        <div role="alert" aria-live="assertive" className="mb-4 rounded-sm border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive flex items-start gap-2">
          <span className="mt-0.5 text-base leading-none">⚠️</span>
          <span>{tx(formError)}</span>
        </div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Stepper */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          {[1, 2, 3].map((n) => (
            <div key={n} className="flex-1 flex items-center gap-2">
              <div className={`h-7 w-7 grid place-items-center rounded-full text-xs font-semibold border transition-colors duration-500 ${step >= n ? "bg-charcoal text-ivory border-charcoal" : "bg-background text-muted-foreground border-border"}`}>{tx(n)}</div>
              <div className={`h-1 flex-1 rounded-full transition-colors duration-700 ${step > n ? "bg-charcoal" : step === n ? "bg-gold/60" : "bg-border"}`} />
            </div>
          ))}
        </div>
        <div className="flex justify-between text-[11px] text-muted-foreground">
          {stepLabels.map((l, i) => (
            <span key={l} className={step === i + 1 ? "text-foreground font-medium" : ""}>{tx(l)}</span>
          ))}
        </div>
      </div>

      {step === 1 && (
      <motion.div key="step-1" initial={{ opacity: 0, x: -28 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.55, ease: EASE_OUT }} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <label className="text-sm text-muted-foreground">{tr("التاريخ")}</label>
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={`w-full mt-1 inline-flex items-center justify-between gap-2 border rounded-sm px-3 py-2 bg-background text-sm text-start ${isBlocked ? "border-destructive text-destructive" : "border-border"}`}
              >
                <span>{selectedDateObj ? format(selectedDateObj, "EEEE d MMMM yyyy", { locale: ar }) : tr("اختاري اليوم")}</span>
                <CalendarIcon className="h-4 w-4 opacity-60" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDateObj}
                onSelect={(d) => {
                  if (!d) return;
                  const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
                  setF({ ...f, event_date: iso });
                }}
                disabled={[{ before: new Date() }, ...blockedDateObjs]}
                modifiers={{ blocked: blockedDateObjs }}
                modifiersClassNames={{ blocked: "line-through text-destructive/60 bg-destructive/5" }}
                locale={ar}
                // Full Arabic day names overflow the 7 narrow columns
                formatters={{ formatWeekdayName: (d) => [tr("أحد"), tr("إثن"), tr("ثلا"), tr("أرب"), tr("خمي"), tr("جمع"), tr("سبت")][d.getDay()] }}
                className="pointer-events-auto"
              />
              <div className="border-t border-border p-2 text-[11px] text-muted-foreground flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm bg-destructive/20 line-through">×</span>{" "}{tr("أيام محجوزة/محجوبة")}</span>
                </div>
                {/* Idea 5: Busy Month Hint */}
                {blockedDates.filter(d => new Date(d).getMonth() === (selectedDateObj?.getMonth() ?? new Date().getMonth())).length >= 15 && (
                  <div className="text-amber-700 bg-amber-50 p-1.5 rounded-sm border border-amber-200">
                    🔥 <strong>{tr("هذا الشهر شبه ممتلئ!")}</strong>{" "}{tr("سارعي بتأكيد موعدكِ قبل نفاد الأيام المتاحة.")}
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>
          {daysUntil !== null && daysUntil < 7 && !isBlocked && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-sm p-2">
              💡 <strong>{tr("تاريخ قريب!")}</strong>{" "}{tr("ننصحكِ بإرسال الطلب الآن والتواصل مع المصوّرة فوراً عبر الواتساب لتأكيد التفرّغ.")}
            </motion.div>
          )}
        </div>
        {/* الباقات تُعرض بالتفصيل في قسم الباقات فقط؛ هنا اختيار مختصر */}
        <div className="sm:col-span-2">
          <label className="text-sm text-muted-foreground">{tr("الباقة")}</label>
          {selected && !pkgListOpen ? (
            <div className="mt-1 flex items-center justify-between gap-3 rounded-sm border border-gold bg-gold/5 px-3 py-2.5">
              <span className="min-w-0 text-sm">
                <Check className="me-1.5 inline h-4 w-4 text-gold" />
                <span className="font-medium">{tx(selected.label)}</span>
                <span className="text-muted-foreground"> · {Number(selected.price).toLocaleString(locale("ar-JO"))} {tr("د.أ")}</span>
              </span>
              <button type="button" onClick={() => setPkgListOpen(true)} className="shrink-0 text-xs underline underline-offset-4 hover:text-gold">{tr("تغيير")}</button>
            </div>
          ) : (
            <div role="radiogroup" className="mt-1 divide-y divide-border rounded-sm border border-border">
              {mainPackages.map((r) => {
                const on = f.package_id === r.id;
                const fits = packageFits(r);
                return (
                  <button key={r.id} type="button" role="radio" aria-checked={on}
                    onClick={() => { onSelectPackage(r.id); setPkgListOpen(false); }}
                    className={`flex w-full items-center justify-between gap-3 px-3 py-2.5 text-start text-sm transition-colors ${on ? "bg-gold/5" : "hover:bg-secondary"}`}>
                    <span className="flex min-w-0 items-center gap-2">
                      <span className={`grid h-4 w-4 shrink-0 place-items-center rounded-full border ${on ? "border-gold bg-gold" : "border-border"}`}>{on && <span className="h-1.5 w-1.5 rounded-full bg-background" />}</span>
                      <span className="truncate">{tx(r.label)}</span>
                      {!fits && <span className="shrink-0 text-[11px] text-destructive">{tr("لا يتّسع وقتها في هذا اليوم")}</span>}
                    </span>
                    <span className="shrink-0 tabular-nums">{Number(r.price).toLocaleString(locale("ar-JO"))} <span className="text-xs text-muted-foreground">{tr("د.أ")}</span></span>
                  </button>
                );
              })}
            </div>
          )}
          <button type="button" onClick={() => document.getElementById("packages")?.scrollIntoView({ behavior: "smooth" })} className="mt-1.5 text-[11px] text-muted-foreground underline underline-offset-4 hover:text-foreground">{tr("تفاصيل كل باقة")}</button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={tr("من")} type="time" v={f.start_time} on={(v) => setF({ ...f, start_time: v })} />
          <Field label={tr("إلى")} type="time" v={f.end_time} on={(v) => setF({ ...f, end_time: v })} />
        </div>
        {isBlocked && <p className="text-sm text-destructive sm:col-span-2">{tr("⚠️ هذا اليوم غير متاح")}</p>}
        {hasConflict && <p className="text-sm text-destructive sm:col-span-2">{tr("⚠️ يتعارض مع فترة محجوزة")}</p>}
      </motion.div>
      )}

      {step === 2 && (
      <motion.div key="step-2" initial={{ opacity: 0, x: -28 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.55, ease: EASE_OUT }} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <Field label={tr("الموقع / القاعة")} v={f.venue_address} on={(v) => setF({ ...f, venue_address: v })} />
        </div>
        {addonPackages.length > 0 && (
          <div className="sm:col-span-2">
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground">{tr("إضافات اختيارية")}</label>
              <span className="text-[11px] bg-secondary text-muted-foreground px-2 py-0.5 rounded-full">{tr("يتم الاتفاق على تفاصيلها لاحقاً")}</span>
            </div>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {addonPackages.map((a) => {
                const qty = addonQty[a.id] || 0;
                const active = qty > 0;
                return (
                  <div key={a.id} className={`rounded-sm border p-3 text-sm transition ${active ? "border-gold bg-gold/5" : "border-border bg-background"}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{tx(a.label)}</div>
                        <div className="text-xs text-muted-foreground">{tr("{0} د.أ", [Number(a.price).toLocaleString(locale("ar-JO"))])}</div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button type="button" onClick={() => setAddonQty({ ...addonQty, [a.id]: Math.max(0, qty - 1) })}
                                className="w-7 h-7 grid place-items-center border border-border rounded-sm hover:bg-secondary">−</button>
                        <span className="w-6 text-center">{tx(qty)}</span>
                        <button type="button" onClick={() => setAddonQty({ ...addonQty, [a.id]: qty + 1 })}
                                className="w-7 h-7 grid place-items-center border border-border rounded-sm hover:bg-secondary">+</button>
                      </div>
                    </div>
                    {a.description && <div className="text-xs text-muted-foreground mt-1 whitespace-pre-line">{tx(a.description)}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <div className="sm:col-span-2">
          <Field label={tr("الرصيد المتبقي (اختياري)")} v={f.remaining_note} on={(v) => setF({ ...f, remaining_note: v })} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="client-notes" className="text-sm text-muted-foreground">{tr("معلومات إضافية")}</label>
          <textarea id="client-notes" value={f.client_notes} onChange={(e) => setF({ ...f, client_notes: e.target.value })} rows={3} className="w-full mt-1 border border-border rounded-sm px-3 py-2 bg-background" />
        </div>
        <div className="sm:col-span-2">
          <label className="text-sm text-muted-foreground">{tr("مستوى الخصوصية")}</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
            {[
              { v: "public", t: tr("صور قابلة للنشر"), d: tr("يحق للمصوّرة استخدام لقطات للترويج") },
              { v: "private_only", t: tr("خصوصية تامة"), d: tr("فريق نسائي فقط — لا مشاركة مع أي طرف ثالث") },
            ].map((o) => (
              <button key={o.v} type="button" onClick={() => setF({ ...f, privacy_level: o.v as any })}
                className={`text-start rounded-sm border p-3 text-sm transition ${f.privacy_level === o.v ? "border-gold bg-gold/5" : "border-border hover:bg-secondary"}`}>
                <div className="font-medium">{tx(o.t)}</div>
                <div className="text-xs text-muted-foreground mt-1">{tx(o.d)}</div>
              </button>
            ))}
          </div>
        </div>
      </motion.div>
      )}

      {step === 3 && (
      <motion.div key="step-3" initial={{ opacity: 0, x: -28 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.55, ease: EASE_OUT }} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label={tr("الاسم")} v={f.client_name} on={(v) => setF({ ...f, client_name: v })} />
        <div>
          <Field label={tr("رقم الجوال (واتساب)")} type="tel" v={f.client_phone} on={(v) => setF({ ...f, client_phone: v })} />
          {f.client_phone.length >= 4 && !normalizePhone(f.client_phone) && <p className="mt-1 text-xs text-destructive">{tx(PHONE_HINT)}</p>}
        </div>
        <div className="sm:col-span-2">
          <Field label={tr("الإيميل")} type="email" v={f.client_email} on={(v) => setF({ ...f, client_email: v })} />
        </div>
        {selected && (
          <motion.div 
            key={f.event_date + f.package_id + Object.values(addonQty).join("")}
            initial={{ scale: 1, backgroundColor: "var(--secondary)" }}
            animate={{ scale: [1, 1.02, 1], backgroundColor: ["var(--secondary)", "rgba(201,162,39,0.1)", "var(--secondary)"] }}
            transition={{ duration: 0.5 }}
            className="sm:col-span-2 rounded-sm bg-secondary/60 border border-border p-3 text-sm space-y-1.5"
          >
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1">{tr("ملخّص الطلب")}</div>
            <div className="flex justify-between text-muted-foreground"><span>{tr("التاريخ")}</span><span>{selectedDateObj ? format(selectedDateObj, "d MMMM yyyy", { locale: ar }) : "—"}</span></div>
            <div className="flex justify-between"><span>{tx(selected.label)}</span><span>{tr("{0} د.أ", [basePrice.toLocaleString(locale("ar-JO"))])}</span></div>
            {selectedAddons.map((x) => (
              <div key={x.rule.id} className="flex justify-between text-muted-foreground">
                <span>{tx(x.rule.label)} × {tx(x.qty)}</span>
                <span>{tr("{0} د.أ", [(Number(x.rule.price) * x.qty).toLocaleString(locale("ar-JO"))])}</span>
              </div>
            ))}
            <div className="flex justify-between border-t border-border pt-1.5 mt-1"><span className="font-semibold">{tr("المجموع")}</span><span className="font-semibold">{tr("{0} د.أ", [total.toLocaleString(locale("ar-JO"))])}</span></div>
            <div className="flex justify-between text-gold"><span>{tr("العربون المطلوب")}</span><span className="font-semibold">{tr("{0} د.أ", [deposit.toLocaleString(locale("ar-JO"))])}</span></div>
          </motion.div>
        )}
        <label className="sm:col-span-2 flex items-start gap-2 text-xs text-muted-foreground leading-relaxed cursor-pointer">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4 accent-gold" />
          <span>
            {tr("أوافق على")}{" "}<Link to="/privacy" className="text-gold underline">{tr("سياسة الخصوصية")}</Link>{" "}{tr("و")}
            <Link to="/terms" className="text-gold underline">{" "}{tr("الشروط والأحكام")}</Link>{tr("، وأقرّ بأن بياناتي ستُستخدم لمعالجة هذا الحجز فقط.")}
          </span>
        </label>
      </motion.div>
      )}

      {/* Step navigation */}
      <div className="mt-6 flex items-center gap-2">
        {step > 1 && (
          <button type="button" onClick={goBack} className="px-4 py-3 rounded-sm border border-border hover:bg-secondary inline-flex items-center gap-1 text-sm">
            <ChevronRight className="h-4 w-4" />{" "}{tr("السابق")}
          </button>
        )}
        {step < 3 ? (
          <button type="button" onClick={goNext} aria-disabled={!stepValid[step]} className={`flex-1 bg-charcoal text-ivory py-3 rounded-sm hover:opacity-90 ${stepValid[step] ? "" : "opacity-50"} inline-flex items-center justify-center gap-1 text-sm`}>
            {tr("التالي")}{" "}<ChevronLeft className="h-4 w-4" />
          </button>
        ) : (
          <button onClick={submit} disabled={submitting} className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-sm inline-flex items-center justify-center gap-2 disabled:opacity-60 text-sm transition-all duration-300">
            {submitting ? (
              <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />{" "}{tr("جاري الإرسال…")}
              </motion.div>
            ) : (
              <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex items-center gap-2">
                <Send className="h-4 w-4" />{" "}{tr("إرسال طلب الحجز")}
              </motion.div>
            )}
          </button>
        )}
      </div>
      
      {selected && selected.package !== "addon" && profile.is_pro !== false && (
        <div className="mt-4 border-t border-border pt-4">
          {!offerOpen ? (
            <button type="button" onClick={() => setOfferOpen(true)} className="w-full text-sm text-muted-foreground border border-dashed border-border rounded-sm py-2.5 hover:bg-secondary">
              {tr("اقترحي سعراً مختلفاً")}
            </button>
          ) : (
            <div className="rounded-sm border border-border bg-secondary/40 p-4 space-y-3 text-sm">
              <div className="font-medium">{tr("اقترحي سعراً")}</div>
              <p className="text-xs text-muted-foreground leading-relaxed">{tr("السعر المعلن لباقة «{0}»: {1} د.أ. أقل سعر يمكن اقتراحه: {2} د.أ. نستخدم الاسم والهاتف والإيميل والتاريخ والوقت التي ملأتِها. لن يُحجز الموعد إلا بعد موافقة المصوّرة.", [selected.label, Number(selected.price).toLocaleString(locale("ar-JO")), Math.ceil(Number(selected.price) * 0.5).toLocaleString(locale("ar-JO"))])}</p>
              <Field label={tr("السعر المقترح (د.أ)")} type="number" v={offerPrice} on={setOfferPrice} />
              <div className="flex gap-2">
                <button type="button" onClick={sendOffer} disabled={offerSending} className="flex-1 bg-charcoal text-ivory py-2.5 rounded-sm disabled:opacity-60 inline-flex items-center justify-center gap-2">
                  {offerSending ? <><Loader2 className="h-4 w-4 animate-spin" />{" "}{tr("جاري الإرسال…")}</> : tr("إرسال العرض")}
                </button>
                <button type="button" onClick={() => setOfferOpen(false)} className="px-4 rounded-sm border border-border hover:bg-secondary">{tr("إلغاء")}</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Idea 3: Late Night Hint */}
      {step === 3 && (new Date().getHours() >= 0 && new Date().getHours() <= 7) && (
        <div className="mt-4 text-xs text-indigo-800 bg-indigo-50 border border-indigo-200 p-2.5 rounded-sm flex items-start gap-2">
          <span className="text-base leading-none mt-0.5">🌙</span>
          <span>{tr("المصوّرة قد تكون نائمة الآن، سيصلها إشعارك فور استيقاظها.")}</span>
        </div>
      )}
      
      {daySlots.length > 0 && !isBlocked && step === 1 && (
        <div className="mt-3 rounded-sm border border-amber-200 bg-amber-50 p-3 text-sm">
          <div className="font-medium text-amber-900 mb-1">{tr("فترات محجوزة في هذا اليوم:")}</div>
          <ul className="text-xs text-amber-800 space-y-0.5">
            {daySlots.map((s, i) => <li key={i}>{tr("• من {0} إلى {1}", [s.start_time?.slice(0,5), s.end_time?.slice(0,5)])}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

function DepositCard({ profile, cliqAlias, bankInfo }: { profile: Profile; cliqAlias: string | null; bankInfo: string | null }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    if (!cliqAlias) return;
    navigator.clipboard.writeText(cliqAlias);
    setCopied(true);
    hapticVibrate();
    setTimeout(() => setCopied(false), 2000);
  };

  if (profile.is_demo) {
    return (
      <div className="bg-charcoal text-ivory rounded-sm p-6 sm:p-8 h-fit lg:sticky lg:top-24">
        <div className="text-xs uppercase tracking-[0.3em] text-gold mb-2">{tr("نسخة تجريبية")}</div>
        <h3 className="font-serif text-2xl mb-3">{tr("التحويل غير متاح")}</h3>
        <p className="text-sm text-ivory/80">{tr("هذا الحساب للعرض فقط. في حساب مصوّرة حقيقي تظهر هنا معلومات العربون وطريقة التحويل. جرّبي الحجز كما هو، وسيعمل بشكل طبيعي.")}</p>
      </div>
    );
  }

  return (
    <div className="bg-charcoal text-ivory rounded-sm p-6 sm:p-8 h-fit lg:sticky lg:top-24">
      <div className="text-xs uppercase tracking-[0.3em] text-gold mb-2">{tr("العربون")}</div>
      <h3 className="font-serif text-2xl mb-5">{tr("معلومات العربون")}</h3>
      <div className="space-y-4 text-sm">
        {profile.fixed_deposit ? (
          <Row label={tr("مبلغ العربون")} value={tr("{0} د.أ", [Number(profile.fixed_deposit).toLocaleString(locale("ar-JO"))])} />
        ) : (
          <Row label={tr("نسبة العربون")} value={`${profile.deposit_percent}%`} />
        )}
        {cliqAlias && (
          <div className="bg-ivory/10 rounded-sm p-3 group">
            <div className="text-[11px] uppercase tracking-[0.2em] text-ivory/60 mb-1 flex items-center justify-between">
              <span>CliQ Alias</span>
              <span className="text-[9px] opacity-0 group-hover:opacity-100 transition-opacity">
                {copied ? tr("تم النسخ بنجاح") : tr("الدفع لحساب المصوّرة مباشرة")}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <div className="font-mono text-lg truncate">{tx(cliqAlias)}</div>
              <button 
                onClick={handleCopy} 
                className={`p-2 rounded-sm transition-all duration-300 ${copied ? "bg-green-500/20 text-green-400" : "hover:bg-ivory/10"}`}
                aria-label={tr("نسخ")}
              >
                <AnimatePresence mode="wait">
                  {copied ? (
                    <motion.div key="check" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ type: "spring", stiffness: 400, damping: 25 }}>
                      <Check className="h-4 w-4" />
                    </motion.div>
                  ) : (
                    <motion.div key="copy" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ type: "spring", stiffness: 400, damping: 25 }}>
                      <Copy className="h-4 w-4" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>
            </div>
          </div>
        )}
        {bankInfo && (
          <div className="bg-ivory/10 rounded-sm p-3">
            <div className="text-[11px] uppercase tracking-[0.2em] text-ivory/60 mb-1">{tr("تحويل بنكي")}</div>
            <div className="whitespace-pre-line">{tx(bankInfo)}</div>
          </div>
        )}
        {!cliqAlias && !bankInfo && (
          <div className="bg-ivory/10 rounded-sm p-3 text-xs leading-relaxed">
            {tr("ستظهر معلومات الدفع كاملة في صفحة تتبّع الحجز فور إرسال طلبك.")}
          </div>
        )}
      </div>
      <p className="text-[11px] text-ivory/60 mt-5 leading-relaxed">
        <Shield className="h-3 w-3 inline-block me-1 -mt-0.5 opacity-70" />
        {tr("يُدفع هذا العربون مباشرة لحساب المصوّرة الشخصي لتثبيت حجزكِ فوراً.")}
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between border-b border-ivory/10 pb-2"><span className="opacity-70">{tx(label)}</span><span className="font-medium">{tx(value)}</span></div>;
}

function Field({ label, v, on, type = "text" }: { label: string; v: string; on: (v: string) => void; type?: string }) {
  const auto = type === "email" ? "email" : type === "tel" ? "tel" : label === "الاسم" ? "name" : "off";
  return <label className="block"><span className="text-sm text-muted-foreground">{tx(label)}</span><input type={type} autoComplete={auto} dir={type === "text" ? undefined : "ltr"} value={v} onChange={(e) => on(e.target.value)} className="w-full mt-1 border border-border rounded-sm px-3 py-2 bg-background" /></label>;
}

function FallbackPage({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container-editorial py-24 text-center text-muted-foreground">{children}</div>
      <Footer />
    </div>
  );
}


function StickyBookBar({ name, onBook }: { name: string; onBook: () => void }) {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const el = document.getElementById("book");
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setHidden(e.isIntersecting), { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div
      aria-hidden={hidden}
      className={`sm:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/95 backdrop-blur-sm px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgba(0,0,0,0.08)] transition-transform duration-300 ${hidden ? "translate-y-full" : "translate-y-0"}`}
    >
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[11px] text-muted-foreground">{tr("احجزي مع")}</div>
          <div className="font-serif text-sm truncate">{tx(name)}</div>
        </div>
        <button onClick={onBook} className="rounded-full bg-charcoal px-6 py-3 text-sm font-medium text-ivory transition-transform active:scale-95 dark:bg-gold dark:text-charcoal">
          {tr("احجزي موعدك")}
        </button>
      </div>
    </div>
  );
}
