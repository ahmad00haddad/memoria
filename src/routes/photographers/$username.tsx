import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Instagram, MessageCircle, Copy, Share2, Star, CheckCircle2, Send, ChevronRight, ChevronLeft, Shield, Clock, CalendarCheck, Award, ClipboardCopy } from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { ar } from "date-fns/locale";
import { format } from "date-fns";
import { useServerFn } from "@tanstack/react-start";
import { submitBookingRequest, getPublicDepositInfo } from "@/lib/booking.functions";
import { Lightbox } from "@/components/Lightbox";
// ✅ إضافة: تحسين الصور (WebP + responsive) عبر Cloudflare Images أو Supabase Transform
import { optimizedImageUrl, responsiveSrcSet } from "@/lib/gallery.functions";
import { motion } from "framer-motion";
import { MapPin } from "lucide-react";

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
    const city = p?.city ? ` في ${p.city}` : "";
    const desc = p?.bio?.slice(0, 155) || `استعرض أعمال وأسعار المصوّرة ${name}${city} واحجز موعدك مباشرة عبر Memoria.`;
    const image = p?.cover_url || p?.avatar_url || undefined;
    const url = `https://memoria-jo.lovable.app/photographers/${params.username}`;
    const meta: Array<Record<string, string>> = [
      { title: `${name} — مصوّرة أعراس${city} | Memoria` },
      { name: "description", content: desc },
      { property: "og:title", content: `${name} — مصوّرة أعراس${city}` },
      { property: "og:description", content: desc },
      { property: "og:type", content: "profile" },
      { property: "og:url", content: url },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: `${name} — مصوّرة أعراس${city}` },
      { name: "twitter:description", content: desc },
    ];
    if (image) {
      meta.push({ property: "og:image", content: image });
      meta.push({ name: "twitter:image", content: image });
    }
    return { meta, links: [{ rel: "canonical", href: url }] };
  },
});

type Profile = {
  id: string; username: string; display_name: string;
  bio: string | null; city: string | null; base_location: string | null;
  phone: string | null; instagram: string | null; whatsapp: string | null;
  avatar_url: string | null; cover_url: string | null; equipment: string | null;
  cliq_alias: string | null; portfolio_urls: string[] | null;
  deposit_percent: number; travel_fee_per_km: number; free_km: number;
  is_featured?: boolean;
  tagline?: string | null; booking_notes?: string | null;
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
};

function PhotographerPage() {
  const { username } = Route.useParams();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [pricing, setPricing] = useState<Pricing[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [unavail, setUnavail] = useState<string[]>([]);
  const [bookedSlots, setBookedSlots] = useState<{ event_date: string; start_time: string; end_time: string }[]>([]);
  const [completedCount, setCompletedCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [pickedPackageId, setPickedPackageId] = useState<string>("");
  const [deposit, setDeposit] = useState<{ cliq_alias: string | null; bank_info: string | null }>({ cliq_alias: null, bank_info: null });
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const fetchDeposit = useServerFn(getPublicDepositInfo);

  useEffect(() => {
    (async () => {
      const normalizedUsername = username.trim().toLowerCase();
      const { data: prof } = await supabase
        .from("profiles")
        .select("id,username,display_name,bio,city,base_location,instagram,avatar_url,cover_url,equipment,deposit_percent,travel_fee_per_km,is_published,created_at,updated_at,portfolio_urls,free_km,is_featured,tagline,booking_notes,fixed_deposit")
        .eq("username", normalizedUsername)
        .eq("is_published", true)
        .maybeSingle();

      const mergedProfile = (prof as Profile | null) ?? null;
      setProfile(mergedProfile);
      if (mergedProfile) {
        const pid = mergedProfile.id;
        const [{ data: p }, { data: r }, { data: u }, { data: bk }, { count: cc }] = await Promise.all([
          supabase.from("pricing_rules").select("*").eq("photographer_id", pid),
          supabase.from("reviews").select("*").eq("photographer_id", pid).eq("is_published", true).order("created_at", { ascending: false }),
          supabase.rpc("get_photographer_busy_dates", { _pid: pid }),
          supabase.from("bookings").select("event_date,start_time,end_time").eq("photographer_id", pid).is("deleted_at", null).in("status", ["confirmed", "pending_deposit"]),
          supabase.from("bookings").select("id", { count: "exact", head: true }).eq("photographer_id", pid).eq("status", "completed").is("deleted_at", null),
        ]);
        setPricing((p ?? []) as Pricing[]);
        setReviews(r ?? []);
        setCompletedCount(cc ?? 0);
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
        } catch {}
      }
      setLoading(false);
    })();
  }, [username]);

  // Inject JSON-LD structured data when profile + reviews are loaded (helps Google).
  useEffect(() => {
    if (!profile) return;
    const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
    const ld: any = {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      "@id": `https://memoria-jo.lovable.app/photographers/${profile.username}`,
      name: profile.display_name,
      url: `https://memoria-jo.lovable.app/photographers/${profile.username}`,
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

  if (loading) return <FallbackPage>جاري التحميل…</FallbackPage>;
  if (!profile) return <FallbackPage>لا يوجد مصوّر بهذا الاسم. <Link to="/search" className="underline">عُد للبحث</Link></FallbackPage>;

  // اليوم يُحجَب فقط لو كان في عدم التوفر (Google/يدوي). الحجوزات الفردية لا تحجب اليوم كاملاً
  // بل تُعرض كفترات مشغولة بالساعات حتى يمكن حجز جلسة أخرى في نفس اليوم.
  const blockedDates = [...new Set(unavail)];
  const avgRating = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  const pickPackage = (id: string) => { setPickedPackageId(id); setTimeout(() => scrollTo("book"), 50); };

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      <Header />

      {/* HERO */}
      {/* HERO — Editorial Magazine layout */}
      <section className="relative bg-charcoal text-ivory grain-overlay overflow-hidden">
        {/* Top meta strip: ISSUE / DATE / FEATURE — like a magazine masthead */}
        <div className="container-editorial pt-8 pb-4 border-b border-ivory/10 flex flex-wrap items-center gap-x-8 gap-y-2 text-[10px] uppercase tracking-[0.35em] opacity-70">
          <span>Memoria · العدد ٠١</span>
          <span className="hidden sm:inline">{new Date().toLocaleDateString("ar-JO", { year: "numeric", month: "long" })}</span>
          <span className="ms-auto inline-flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-gold inline-block animate-pulse" />
            ملف المصوّرة
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
              <div className="text-[10px] uppercase tracking-[0.5em] text-gold mb-4">
                {profile.tagline || "WEDDING PHOTOGRAPHY"}
              </div>
              <h1 className="display-serif text-[clamp(3rem,8vw,7rem)] mb-6">
                {profile.display_name}
              </h1>
              {profile.is_featured && (
                <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.25em] bg-gold/15 text-gold px-3 py-1.5 rounded-full border border-gold/30 mb-6">
                  <Star className="h-3 w-3 fill-gold" /> اختيار المحرّر
                </span>
              )}
              {profile.bio && (
                <p className="max-w-md text-base sm:text-lg leading-[1.8] opacity-85 whitespace-pre-line mb-8">
                  {profile.bio}
                </p>
              )}
              <div className="flex gap-3 flex-wrap">
                <motion.button
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => scrollTo("book")}
                  className="group relative overflow-hidden bg-ivory text-charcoal px-8 py-3.5 rounded-sm font-medium transition before:absolute before:inset-0 before:-translate-x-full hover:before:translate-x-full before:bg-gradient-to-r before:from-transparent before:via-gold/40 before:to-transparent before:transition-transform before:duration-700"
                >
                  <span className="relative">احجزي الآن</span>
                </motion.button>
                <motion.button
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => scrollTo("packages")}
                  className="border border-ivory/40 text-ivory px-8 py-3.5 rounded-sm hover:bg-ivory/10 transition"
                >
                  الباقات
                </motion.button>
              </div>
            </div>

            {/* Magazine-style stats row */}
            <div className="mt-12 grid grid-cols-3 gap-4 border-t border-ivory/10 pt-6">
              <Stat label="التقييم" value={reviews.length ? avgRating.toFixed(1) : "—"} sub={reviews.length ? `${reviews.length} مراجعة` : "جديد"} />
              <Stat label="الموقع" value={profile.city || "—"} sub={profile.base_location || "الأردن"} />
              <Stat label="الباقات" value={String(pricing.filter((p) => p.package !== "addon").length)} sub="باقة احترافية" />
            </div>
          </motion.div>

          {/* RIGHT — full-bleed cover (cols 6..12) with subtle scale-in */}
          <motion.div
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="order-1 lg:order-2 lg:col-span-7 relative min-h-[420px] lg:min-h-[640px] rounded-sm overflow-hidden bg-gradient-royal"
          >
            {profile.cover_url && (
              <img
                src={profile.cover_url}
                alt={profile.display_name}
                className="absolute inset-0 h-full w-full object-cover"
              />
            )}
            {/* Subtle gradient for legibility of caption */}
            <div className="absolute inset-0 bg-gradient-to-tr from-charcoal/40 via-transparent to-transparent" />

            {/* Floating editorial caption */}
            <div className="absolute bottom-4 end-4 sm:bottom-6 sm:end-6 max-w-[260px]">
              <div className="bg-ivory/95 text-charcoal backdrop-blur-sm border border-border rounded-sm p-4 shadow-elegant">
                <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-2">
                  مختارة من المعرض
                </div>
                <div className="font-serif text-base leading-snug">
                  «كل صورة قصة، وكل قصة تستحق الفخامة»
                </div>
                {profile.city && (
                  <div className="mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" /> {profile.city}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* PACKAGES */}
      <section id="packages" className="container-editorial py-16">
        {/* TRUST BADGES — placed above packages so it informs the booking decision */}
        <TrustBadges
          profile={profile}
          completedCount={completedCount}
          unavailCount={blockedDates.length}
        />
        <div className="text-center mb-10">
          <div className="text-xs uppercase tracking-[0.3em] text-gold mb-2">الباقات</div>
          <h2 className="font-serif text-3xl sm:text-4xl">بطاقة الأسعار</h2>
        </div>
        {pricing.length === 0 ? (
          <p className="text-center text-muted-foreground">لم تُحدَّد الباقات بعد.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pricing.filter((p) => p.package !== "addon").map((p) => (
              <div key={p.id} className="relative rounded-sm border border-border bg-card p-6 shadow-soft transition hover:-translate-y-0.5 hover:shadow-elegant">
                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">{p.service === "cinematic_video" ? "فيديو سينمائي" : "تصوير فوتوغرافي"}</div>
                <h3 className="font-serif text-2xl mb-1">{p.label}</h3>
                {p.description && <p className="text-sm text-muted-foreground mb-4 whitespace-pre-line">{p.description}</p>}
                <div className="font-serif text-3xl text-gold mb-4">{Number(p.price).toLocaleString("ar-JO")} <span className="text-sm">د.أ</span></div>
                <button onClick={() => pickPackage(p.id)} className="w-full bg-charcoal text-ivory py-2 rounded-sm hover:opacity-90 text-sm">احجزي هذه الباقة</button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* GALLERY */}
      {(profile.portfolio_urls?.length ?? 0) > 0 && (
        <section className="container-editorial pb-16">
          <div className="text-center mb-8">
            <div className="text-xs uppercase tracking-[0.3em] text-gold mb-2">مختارات</div>
            <h2 className="font-serif text-3xl">مختارات من الأعمال</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {profile.portfolio_urls!.slice(0, 12).map((u, i) => (
              <button type="button" key={i} onClick={() => setLightboxIdx(i)} className="block aspect-square bg-secondary rounded-sm overflow-hidden cursor-zoom-in">
                <img src={u} alt={`${profile.display_name} — معرض الأعمال ${i + 1}`} className="w-full h-full object-cover hover:scale-105 transition" loading="lazy" decoding="async" />
              </button>
            ))}
          </div>
          {lightboxIdx !== null && (
            <Lightbox
              images={(profile.portfolio_urls ?? []).slice(0, 12)}
              index={lightboxIdx}
              onClose={() => setLightboxIdx(null)}
            />
          )}
        </section>
      )}

      {/* BOOKING + DEPOSIT */}
      <section id="book" className="bg-secondary/40 py-16">
        <div className="container-editorial grid gap-8 lg:grid-cols-[1.2fr_1fr]">
          <SimpleBookingForm profile={profile} pricing={pricing} blockedDates={blockedDates} bookedSlots={bookedSlots} pickedPackageId={pickedPackageId} />
          <DepositCard profile={profile} cliqAlias={deposit.cliq_alias} bankInfo={deposit.bank_info} />
        </div>
      </section>

      {/* NOTES */}
      {profile.booking_notes && (
        <section className="container-editorial py-12">
          <div className="rounded-sm border border-border bg-card p-6 max-w-2xl mx-auto">
            <h3 className="font-serif text-xl mb-3">ملاحظات مهمة</h3>
            <div className="text-sm text-muted-foreground leading-loose whitespace-pre-line">{profile.booking_notes}</div>
          </div>
        </section>
      )}

      {/* REVIEWS */}
      {reviews.length > 0 && (
        <section className="container-editorial pb-12">
          <h2 className="font-serif text-2xl mb-2 text-center">آراء العملاء</h2>
          <div className="flex justify-center mb-4">
            <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] bg-gold/10 text-gold px-3 py-1 rounded-full border border-gold/30">
              <CheckCircle2 className="h-3 w-3" /> تقييمات من حجوزات مكتملة فقط
            </span>
          </div>
          <div className="grid sm:grid-cols-2 gap-3 max-w-3xl mx-auto">
            {reviews.slice(0, 6).map((r) => (
              <div key={r.id} className="rounded-sm border border-border bg-card p-4">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-sm">{r.client_name}</div>
                  <div className="flex">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`h-3.5 w-3.5 ${i < r.rating ? "fill-gold text-gold" : "text-muted-foreground/40"}`} />)}</div>
                </div>
                {r.comment && <p className="text-sm text-muted-foreground mt-2">{r.comment}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* CONTACT FOOTER */}
      <section className="container-editorial pb-16 text-center">
        <div className="text-xs uppercase tracking-[0.3em] text-gold mb-3">للاستفسار والتواصل</div>
        <div className="flex justify-center gap-3">
          {profile.instagram && (
            <a href={`https://instagram.com/${profile.instagram}`} target="_blank" rel="noreferrer" className="h-12 w-12 grid place-items-center rounded-full border border-border hover:bg-secondary"><Instagram className="h-5 w-5" /></a>
          )}
          {profile.whatsapp && (
            <a href={`https://wa.me/${profile.whatsapp.replace(/[^0-9]/g, "")}`} target="_blank" rel="noreferrer" className="h-12 w-12 grid place-items-center rounded-full border border-border hover:bg-secondary"><MessageCircle className="h-5 w-5 text-green-600" /></a>
          )}
          <button
            onClick={() => {
              const url = typeof window !== "undefined" ? window.location.href : "";
              if (navigator.share) navigator.share({ title: profile.display_name, url }).catch(() => {});
              else { navigator.clipboard.writeText(url); toast.success("نُسخ الرابط"); }
            }}
            className="h-12 w-12 grid place-items-center rounded-full border border-border hover:bg-secondary"
          ><Share2 className="h-5 w-5" /></button>
        </div>
      </section>

      <Footer />

      {/* Sticky mobile booking CTA — only shows on small screens */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/95 backdrop-blur-sm px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-elegant">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">احجزي مع</div>
            <div className="font-serif text-sm truncate">{profile.display_name}</div>
          </div>
          {profile.whatsapp && (
            <a
              href={`https://wa.me/${profile.whatsapp.replace(/[^0-9]/g, "")}`}
              target="_blank"
              rel="noreferrer"
              className="h-10 w-10 grid place-items-center rounded-sm border border-border"
              aria-label="واتساب"
            >
              <MessageCircle className="h-4 w-4 text-green-600" />
            </a>
          )}
          <button
            onClick={() => scrollTo("book")}
            className="bg-charcoal text-ivory px-5 py-2.5 rounded-sm text-sm font-medium"
          >
            احجزي الآن
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.3em] text-gold/80 mb-1">{label}</div>
      <div className="font-serif text-2xl leading-none">{value}</div>
      {sub && <div className="text-[11px] opacity-60 mt-1 truncate">{sub}</div>}
    </div>
  );
}

function TrustBadges({ profile, completedCount, unavailCount }: { profile: Profile; completedCount: number; unavailCount: number }) {
  const joined = profile.created_at ? new Date(profile.created_at) : null;
  const joinedLabel = joined
    ? joined.toLocaleDateString("ar-JO", { month: "long", year: "numeric" })
    : "—";
  const depositLabel = profile.fixed_deposit
    ? `${Number(profile.fixed_deposit).toLocaleString("ar-JO")} د.أ`
    : `${profile.deposit_percent || 25}%`;
  const items = [
    { icon: CalendarCheck, label: "عضوة منذ", value: joinedLabel },
    { icon: Award, label: "حجوزات مكتملة", value: completedCount > 0 ? String(completedCount) : "جديدة" },
    { icon: Shield, label: "العربون", value: depositLabel },
    { icon: Clock, label: "تواريخ مشغولة", value: String(unavailCount) },
  ];
  return (
    <div className="mb-10 grid grid-cols-2 md:grid-cols-4 gap-3">
      {items.map((it) => (
        <div key={it.label} className="rounded-sm border border-border bg-card p-4 flex items-center gap-3">
          <div className="h-9 w-9 grid place-items-center rounded-sm bg-secondary text-gold shrink-0">
            <it.icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{it.label}</div>
            <div className="font-serif text-base truncate">{it.value}</div>
          </div>
        </div>
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
  const [success, setSuccess] = useState<{ token: string } | null>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [consent, setConsent] = useState(false);
  const [restoredDraft, setRestoredDraft] = useState(false);

  // Restore draft from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (draft?.f) setF((prev) => ({ ...prev, ...draft.f }));
      if (draft?.addonQty) setAddonQty(draft.addonQty);
      if (draft?.step) setStep(draft.step);
      if (typeof draft?.consent === "boolean") setConsent(draft.consent);
      setRestoredDraft(true);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist draft on change (skip when success — we clear instead)
  useEffect(() => {
    if (typeof window === "undefined" || success) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify({ f, addonQty, step, consent }));
    } catch {}
  }, [f, addonQty, step, consent, success, storageKey]);

  const clearDraft = () => {
    setF(initial); setAddonQty({}); setStep(1); setConsent(false);
    try { window.localStorage.removeItem(storageKey); } catch {}
    toast.success("تم مسح المسودة");
  };
  const navigate = useNavigate();
  const submitFn = useServerFn(submitBookingRequest);
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

  const blockedDateObjs = blockedDates.map((d) => {
    const [y, m, day] = d.split("-").map(Number);
    return new Date(y, m - 1, day);
  });
  const selectedDateObj = f.event_date
    ? (() => { const [y, m, day] = f.event_date.split("-").map(Number); return new Date(y, m - 1, day); })()
    : undefined;

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
    const note = `الباقة: ${pkg.label} — ${Number(pkg.price).toLocaleString("ar-JO")} د.أ${pkg.description ? `\n${pkg.description}` : ""}`;
    setF({ ...f, package_id: id, start_time: start, end_time: end, client_notes: f.client_notes ? f.client_notes : note });
  };

  // عند اختيار الباقة من زر "احجزي هذه الباقة" خارج النموذج
  useEffect(() => {
    if (pickedPackageId && pickedPackageId !== f.package_id) onSelectPackage(pickedPackageId);
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
      return toast.error("الرجاء تعبئة الاسم والهاتف والإيميل والتاريخ واختيار الباقة");
    }
    if (!consent) {
      return toast.error("الرجاء الموافقة على سياسة الخصوصية والشروط");
    }
    const start = f.start_time || "12:00";
    const end = f.end_time || "18:00";
    if (toMin(end) <= toMin(start)) {
      return toast.error("وقت الانتهاء يجب أن يكون بعد وقت البداية");
    }
    if (isBlocked) return toast.error("هذا اليوم غير متاح، الرجاء اختيار يوم آخر");
    if (hasConflict) return toast.error("هذا الوقت محجوز، اختاري وقتاً مختلفاً");
    setSubmitting(true);
    try {
      const notes = [f.client_notes, f.remaining_note ? `الرصيد المتبقي: ${f.remaining_note}` : ""].filter(Boolean).join("\n");
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
      setSuccess({ token: res.tracking_token });
      try { window.localStorage.removeItem(storageKey); } catch {}
    } catch (e: any) {
      toast.error(e.message || "فشل إرسال الطلب");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    const trackUrl = `/track/${success.token}`;
    const fullUrl = typeof window !== "undefined" ? `${window.location.origin}${trackUrl}` : trackUrl;
    const bookingRef = success.token.slice(0, 8).toUpperCase();
    return (
      <div className="bg-card border border-border rounded-sm p-6 sm:p-8 shadow-soft text-center">
        <CheckCircle2 className="h-14 w-14 text-emerald-600 mx-auto mb-3" />
        <h2 className="font-serif text-3xl mb-2">تم إرسال طلبك!</h2>
        <p className="text-muted-foreground mb-5">تم إخطار {profile.display_name} وسيتم التواصل معكِ قريبًا.</p>
        <div className="grid grid-cols-2 gap-3 mb-5 text-start">
          <div className="rounded-sm border border-border bg-secondary/40 p-3">
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">رقم الحجز</div>
            <div className="font-mono text-lg font-semibold mt-1">#{bookingRef}</div>
          </div>
          <div className="rounded-sm border border-border bg-secondary/40 p-3">
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">الرد المتوقّع</div>
            <div className="font-serif text-lg mt-1">خلال 24 ساعة</div>
          </div>
        </div>
        <div className="bg-gold/5 border border-gold/30 rounded-sm p-4 mb-5 text-start">
          <div className="text-xs uppercase tracking-[0.2em] text-gold mb-1">الخطوة التالية</div>
          <p className="text-sm">حوّلي العربون بقيمة <span className="font-semibold">{deposit.toLocaleString("ar-JO")} د.أ</span>، ثم ارفعي إثبات التحويل من صفحة تتبع الحجز.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <button onClick={() => navigate({ to: trackUrl })}
                  className="flex-1 bg-charcoal text-ivory py-3 rounded-sm hover:opacity-90 inline-flex items-center justify-center gap-2">
            <Send className="h-4 w-4" /> اذهبي لصفحة تتبع الحجز
          </button>
          <button
            onClick={() => { navigator.clipboard.writeText(fullUrl); toast.success("نُسخ رابط التتبّع"); }}
            className="sm:w-auto border border-border py-3 px-4 rounded-sm hover:bg-secondary inline-flex items-center justify-center gap-2 text-sm"
          >
            <ClipboardCopy className="h-4 w-4" /> نسخ الرابط
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
          ⚠️ احفظي رابط التتبّع — هو وسيلة وصولك الوحيدة للحجز:
          <br/>
          <span className="font-mono text-[11px] break-all">{fullUrl}</span>
        </p>
      </div>
    );
  }

  const stepValid: Record<1 | 2 | 3, boolean> = {
    1: !!f.event_date && !!selected && !isBlocked && !hasConflict,
    2: true,
    3: !!f.client_name && !!f.client_phone && !!f.client_email && consent,
  };
  const goNext = () => {
    if (!stepValid[step]) {
      if (step === 1) toast.error("اختاري التاريخ والباقة قبل المتابعة");
      return;
    }
    setStep((s) => (s === 3 ? 3 : ((s + 1) as 1 | 2 | 3)));
  };
  const goBack = () => setStep((s) => (s === 1 ? 1 : ((s - 1) as 1 | 2 | 3)));
  const stepLabels = ["التاريخ والباقة", "الموقع والإضافات", "البيانات والتأكيد"];

  return (
    <div className="bg-card border border-border rounded-sm p-6 sm:p-8 shadow-soft">
      <div className="text-xs uppercase tracking-[0.3em] text-gold mb-2">Book in simple steps</div>
      <h2 className="font-serif text-3xl mb-4">احجزي بخطوات بسيطة</h2>
      {restoredDraft && !success && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-sm border border-gold/30 bg-gold/5 px-3 py-2 text-xs">
          <span className="text-foreground">تم استعادة مسودتك السابقة تلقائيًا.</span>
          <button type="button" onClick={clearDraft} className="text-muted-foreground hover:text-destructive underline underline-offset-2">
            بدء من جديد
          </button>
        </div>
      )}

      {/* Stepper */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          {[1, 2, 3].map((n) => (
            <div key={n} className="flex-1 flex items-center gap-2">
              <div className={`h-7 w-7 grid place-items-center rounded-full text-xs font-semibold border ${step >= n ? "bg-charcoal text-ivory border-charcoal" : "bg-background text-muted-foreground border-border"}`}>{n}</div>
              <div className={`h-1 flex-1 rounded-full ${step > n ? "bg-charcoal" : step === n ? "bg-gold/60" : "bg-border"}`} />
            </div>
          ))}
        </div>
        <div className="flex justify-between text-[11px] text-muted-foreground">
          {stepLabels.map((l, i) => (
            <span key={l} className={step === i + 1 ? "text-foreground font-medium" : ""}>{l}</span>
          ))}
        </div>
      </div>

      {step === 1 && (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <label className="text-sm text-muted-foreground">التاريخ</label>
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={`w-full mt-1 inline-flex items-center justify-between gap-2 border rounded-sm px-3 py-2 bg-background text-sm text-start ${isBlocked ? "border-destructive text-destructive" : "border-border"}`}
              >
                <span>{selectedDateObj ? format(selectedDateObj, "EEEE d MMMM yyyy", { locale: ar }) : "اختاري اليوم"}</span>
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
                className="pointer-events-auto"
              />
              <div className="border-t border-border p-2 text-[11px] text-muted-foreground flex items-center gap-3">
                <span className="inline-flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm bg-destructive/20 line-through">×</span> أيام محجوزة/محجوبة</span>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="من" type="time" v={f.start_time} on={(v) => setF({ ...f, start_time: v })} />
          <Field label="إلى" type="time" v={f.end_time} on={(v) => setF({ ...f, end_time: v })} />
        </div>
        <div className="sm:col-span-2">
          <label className="text-sm text-muted-foreground">الباقة الأساسية</label>
          <select value={f.package_id} onChange={(e) => onSelectPackage(e.target.value)} className="w-full mt-1 border border-border rounded-sm px-3 py-2 bg-background">
            <option value="">— اختاري الباقة —</option>
            {mainPackages.map((r) => <option key={r.id} value={r.id}>{r.label} — {r.price} د.أ</option>)}
          </select>
          {selected?.description && <div className="text-xs text-muted-foreground mt-2 whitespace-pre-line">{selected.description}</div>}
        </div>
        {isBlocked && <p className="text-sm text-destructive sm:col-span-2">⚠️ هذا اليوم غير متاح</p>}
        {hasConflict && <p className="text-sm text-destructive sm:col-span-2">⚠️ يتعارض مع فترة محجوزة</p>}
      </div>
      )}

      {step === 2 && (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <Field label="الموقع / القاعة" v={f.venue_address} on={(v) => setF({ ...f, venue_address: v })} />
        </div>
        {addonPackages.length > 0 && (
          <div className="sm:col-span-2">
            <label className="text-sm text-muted-foreground">إضافات اختيارية</label>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {addonPackages.map((a) => {
                const qty = addonQty[a.id] || 0;
                const active = qty > 0;
                return (
                  <div key={a.id} className={`rounded-sm border p-3 text-sm transition ${active ? "border-gold bg-gold/5" : "border-border bg-background"}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{a.label}</div>
                        <div className="text-xs text-muted-foreground">{Number(a.price).toLocaleString("ar-JO")} د.أ</div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button type="button" onClick={() => setAddonQty({ ...addonQty, [a.id]: Math.max(0, qty - 1) })}
                                className="w-7 h-7 grid place-items-center border border-border rounded-sm hover:bg-secondary">−</button>
                        <span className="w-6 text-center">{qty}</span>
                        <button type="button" onClick={() => setAddonQty({ ...addonQty, [a.id]: qty + 1 })}
                                className="w-7 h-7 grid place-items-center border border-border rounded-sm hover:bg-secondary">+</button>
                      </div>
                    </div>
                    {a.description && <div className="text-xs text-muted-foreground mt-1 whitespace-pre-line">{a.description}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <div className="sm:col-span-2">
          <Field label="الرصيد المتبقي (اختياري)" v={f.remaining_note} on={(v) => setF({ ...f, remaining_note: v })} />
        </div>
        <div className="sm:col-span-2">
          <label className="text-sm text-muted-foreground">معلومات إضافية</label>
          <textarea value={f.client_notes} onChange={(e) => setF({ ...f, client_notes: e.target.value })} rows={3} className="w-full mt-1 border border-border rounded-sm px-3 py-2 bg-background" />
        </div>
        <div className="sm:col-span-2">
          <label className="text-sm text-muted-foreground">مستوى الخصوصية</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
            {[
              { v: "public", t: "صور قابلة للنشر", d: "يحق للمصوّرة استخدام لقطات للترويج" },
              { v: "private_only", t: "خصوصية تامة", d: "فريق نسائي فقط — لا مشاركة مع أي طرف ثالث" },
            ].map((o) => (
              <button key={o.v} type="button" onClick={() => setF({ ...f, privacy_level: o.v as any })}
                className={`text-start rounded-sm border p-3 text-sm transition ${f.privacy_level === o.v ? "border-gold bg-gold/5" : "border-border hover:bg-secondary"}`}>
                <div className="font-medium">{o.t}</div>
                <div className="text-xs text-muted-foreground mt-1">{o.d}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
      )}

      {step === 3 && (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="الاسم" v={f.client_name} on={(v) => setF({ ...f, client_name: v })} />
        <Field label="الهاتف" v={f.client_phone} on={(v) => setF({ ...f, client_phone: v })} />
        <div className="sm:col-span-2">
          <Field label="الإيميل" type="email" v={f.client_email} on={(v) => setF({ ...f, client_email: v })} />
        </div>
        {selected && (
          <div className="sm:col-span-2 rounded-sm bg-secondary/60 border border-border p-3 text-sm space-y-1.5">
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1">ملخّص الطلب</div>
            <div className="flex justify-between text-muted-foreground"><span>التاريخ</span><span>{selectedDateObj ? format(selectedDateObj, "d MMMM yyyy", { locale: ar }) : "—"}</span></div>
            <div className="flex justify-between"><span>{selected.label}</span><span>{basePrice.toLocaleString("ar-JO")} د.أ</span></div>
            {selectedAddons.map((x) => (
              <div key={x.rule.id} className="flex justify-between text-muted-foreground">
                <span>{x.rule.label} × {x.qty}</span>
                <span>{(Number(x.rule.price) * x.qty).toLocaleString("ar-JO")} د.أ</span>
              </div>
            ))}
            <div className="flex justify-between border-t border-border pt-1.5 mt-1"><span className="font-semibold">المجموع</span><span className="font-semibold">{total.toLocaleString("ar-JO")} د.أ</span></div>
            <div className="flex justify-between text-gold"><span>العربون المطلوب</span><span className="font-semibold">{deposit.toLocaleString("ar-JO")} د.أ</span></div>
          </div>
        )}
        <label className="sm:col-span-2 flex items-start gap-2 text-xs text-muted-foreground leading-relaxed cursor-pointer">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4 accent-gold" />
          <span>
            أوافق على <Link to="/privacy" className="text-gold underline">سياسة الخصوصية</Link> و
            <Link to="/terms" className="text-gold underline"> الشروط والأحكام</Link>، وأقرّ بأن بياناتي ستُستخدم لمعالجة هذا الحجز فقط.
          </span>
        </label>
      </div>
      )}

      {/* Step navigation */}
      <div className="mt-6 flex items-center gap-2">
        {step > 1 && (
          <button type="button" onClick={goBack} className="px-4 py-3 rounded-sm border border-border hover:bg-secondary inline-flex items-center gap-1 text-sm">
            <ChevronRight className="h-4 w-4" /> السابق
          </button>
        )}
        {step < 3 ? (
          <button type="button" onClick={goNext} disabled={!stepValid[step]} className="flex-1 bg-charcoal text-ivory py-3 rounded-sm hover:opacity-90 disabled:opacity-50 inline-flex items-center justify-center gap-1 text-sm">
            التالي <ChevronLeft className="h-4 w-4" />
          </button>
        ) : (
          <button onClick={submit} disabled={submitting || !consent} className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-sm inline-flex items-center justify-center gap-2 disabled:opacity-60 text-sm">
            <Send className="h-4 w-4" /> {submitting ? "جاري الإرسال…" : "إرسال طلب الحجز"}
          </button>
        )}
      </div>
      {daySlots.length > 0 && !isBlocked && step === 1 && (
        <div className="mt-3 rounded-sm border border-amber-200 bg-amber-50 p-3 text-sm">
          <div className="font-medium text-amber-900 mb-1">فترات محجوزة في هذا اليوم:</div>
          <ul className="text-xs text-amber-800 space-y-0.5">
            {daySlots.map((s, i) => <li key={i}>• من {s.start_time?.slice(0,5)} إلى {s.end_time?.slice(0,5)}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

function DepositCard({ profile, cliqAlias, bankInfo }: { profile: Profile; cliqAlias: string | null; bankInfo: string | null }) {
  return (
    <div className="bg-charcoal text-ivory rounded-sm p-6 sm:p-8 h-fit lg:sticky lg:top-24">
      <div className="text-xs uppercase tracking-[0.3em] text-gold mb-2">العربون</div>
      <h3 className="font-serif text-2xl mb-5">معلومات العربون</h3>
      <div className="space-y-4 text-sm">
        {profile.fixed_deposit ? (
          <Row label="مبلغ العربون" value={`${Number(profile.fixed_deposit).toLocaleString("ar-JO")} د.أ`} />
        ) : (
          <Row label="نسبة العربون" value={`${profile.deposit_percent}%`} />
        )}
        {cliqAlias && (
          <div className="bg-ivory/10 rounded-sm p-3">
            <div className="text-[10px] uppercase tracking-[0.2em] text-ivory/60 mb-1">CliQ Alias</div>
            <div className="flex items-center justify-between gap-2">
              <div className="font-mono text-lg">{cliqAlias}</div>
              <button onClick={() => { navigator.clipboard.writeText(cliqAlias); toast.success("تم النسخ"); }} className="p-2 hover:bg-ivory/10 rounded-sm"><Copy className="h-4 w-4" /></button>
            </div>
          </div>
        )}
        {bankInfo && (
          <div className="bg-ivory/10 rounded-sm p-3">
            <div className="text-[10px] uppercase tracking-[0.2em] text-ivory/60 mb-1">تحويل بنكي</div>
            <div className="whitespace-pre-line">{bankInfo}</div>
          </div>
        )}
        {!cliqAlias && !bankInfo && (
          <div className="bg-ivory/10 rounded-sm p-3 text-xs leading-relaxed">
            ستظهر معلومات الدفع كاملة في صفحة تتبّع الحجز فور إرسال طلبك.
          </div>
        )}
      </div>
      <p className="text-[11px] text-ivory/60 mt-5 leading-relaxed">
        بعد التحويل ارفعي صورة إثبات الدفع من صفحة تتبّع الحجز الخاصة بكِ — يصل التأكيد تلقائيًا للمصوّرة.
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between border-b border-ivory/10 pb-2"><span className="opacity-70">{label}</span><span className="font-medium">{value}</span></div>;
}

function Field({ label, v, on, type = "text" }: { label: string; v: string; on: (v: string) => void; type?: string }) {
  return <div><label className="text-sm text-muted-foreground">{label}</label><input type={type} value={v} onChange={(e) => on(e.target.value)} className="w-full mt-1 border border-border rounded-sm px-3 py-2 bg-background" /></div>;
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
