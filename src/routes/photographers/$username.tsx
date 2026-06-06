import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Instagram, MessageCircle, Copy, Share2, Star } from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { ar } from "date-fns/locale";
import { format } from "date-fns";

export const Route = createFileRoute("/photographers/$username")({
  component: PhotographerPage,
  head: ({ params }) => ({
    meta: [
      { title: `${params.username} — احجز جلسة تصوير | EliteCapture` },
      { name: "description", content: `استعرض أعمال وأسعار المصوّر @${params.username} واحجز موعدك مباشرة.` },
      { property: "og:title", content: `${params.username} — مصوّر أعراس` },
      { property: "og:type", content: "profile" },
    ],
  }),
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
  const [loading, setLoading] = useState(true);
  const [pickedPackageId, setPickedPackageId] = useState<string>("");

  useEffect(() => {
    (async () => {
      const { data: prof } = await supabase
        .from("profiles")
        .select("id,username,display_name,bio,city,base_location,phone,cliq_alias,instagram,whatsapp,avatar_url,cover_url,equipment,deposit_percent,travel_fee_per_km,free_km,is_published,is_featured,portfolio_urls,tagline,booking_notes,bank_info,fixed_deposit,created_at,updated_at")
        .eq("username", username).eq("is_published", true).maybeSingle();
      setProfile(prof as Profile | null);
      if (prof) {
        const pid = (prof as Profile).id;
        const [{ data: p }, { data: r }, { data: u }, { data: bk }] = await Promise.all([
          supabase.from("pricing_rules").select("*").eq("photographer_id", pid),
          supabase.from("reviews").select("*").eq("photographer_id", pid).eq("is_published", true).order("created_at", { ascending: false }),
          supabase.from("photographer_unavailability").select("date").eq("photographer_id", pid),
          supabase.from("bookings").select("event_date,start_time,end_time").eq("photographer_id", pid).in("status", ["confirmed", "pending_deposit"]),
        ]);
        setPricing((p ?? []) as Pricing[]);
        setReviews(r ?? []);
        setUnavail((u ?? []).map((x: any) => x.date));
        setBookedSlots((bk ?? []) as any);
      }
      setLoading(false);
    })();
  }, [username]);

  if (loading) return <FallbackPage>جاري التحميل…</FallbackPage>;
  if (!profile) return <FallbackPage>لا يوجد مصوّر بهذا الاسم. <Link to="/search" className="underline">عُد للبحث</Link></FallbackPage>;

  // اليوم يُحجَب فقط لو كان في عدم التوفر (Google/يدوي). الحجوزات الفردية لا تحجب اليوم كاملاً
  // بل تُعرض كفترات مشغولة بالساعات حتى يمكن حجز جلسة أخرى في نفس اليوم.
  const blockedDates = [...new Set(unavail)];
  const avgRating = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  const pickPackage = (id: string) => { setPickedPackageId(id); setTimeout(() => scrollTo("book"), 50); };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* HERO */}
      <section className="relative">
        <div className="relative h-[70vh] min-h-[480px] bg-gradient-royal overflow-hidden">
          {profile.cover_url && <img src={profile.cover_url} alt="" className="absolute inset-0 h-full w-full object-cover" />}
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative h-full container-editorial flex flex-col justify-center text-ivory">
            <div className="text-xs uppercase tracking-[0.4em] mb-3 opacity-80">{profile.tagline || "PHOTOGRAPHY"}</div>
            <h1 className="font-serif text-5xl sm:text-7xl mb-4 flex items-center gap-3 flex-wrap">
              {profile.display_name}
              {profile.is_featured && <span className="text-[10px] uppercase tracking-wider bg-gold/20 text-gold px-2 py-1 rounded-sm border border-gold/40">⭐ مميّز</span>}
            </h1>
            {profile.bio && <p className="max-w-xl text-base sm:text-lg opacity-90 leading-relaxed mb-8 whitespace-pre-line">{profile.bio}</p>}
            <div className="flex gap-3 flex-wrap">
              <button onClick={() => scrollTo("book")} className="bg-ivory text-charcoal px-8 py-3 rounded-sm font-medium hover:opacity-90">احجزي الآن</button>
              <button onClick={() => scrollTo("packages")} className="border border-ivory/60 text-ivory px-8 py-3 rounded-sm hover:bg-white/10">الباقات</button>
            </div>
            {reviews.length > 0 && (
              <div className="mt-6 text-sm flex items-center gap-2 opacity-90">
                <Star className="h-4 w-4 fill-gold text-gold" />
                <span className="font-semibold">{avgRating.toFixed(1)}</span>
                <span>({reviews.length} مراجعة)</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* PACKAGES */}
      <section id="packages" className="container-editorial py-16">
        <div className="text-center mb-10">
          <div className="text-xs uppercase tracking-[0.3em] text-gold mb-2">Package Prices</div>
          <h2 className="font-serif text-3xl sm:text-4xl">بطاقة الأسعار</h2>
        </div>
        {pricing.length === 0 ? (
          <p className="text-center text-muted-foreground">لم تُحدَّد الباقات بعد.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pricing.map((p, i) => (
              <div key={p.id} className={`relative rounded-sm border bg-card p-6 shadow-soft transition hover:-translate-y-0.5 hover:shadow-elegant ${i === 1 ? "border-gold/60" : "border-border"}`}>
                {i === 1 && <div className="absolute -top-3 right-4 bg-gold text-charcoal text-[10px] uppercase tracking-wider px-3 py-1 rounded-sm">الأكثر طلبًا</div>}
                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">{p.service === "cinematic_video" ? "Cinematic Video" : "Photography"}</div>
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
            <div className="text-xs uppercase tracking-[0.3em] text-gold mb-2">Selected Photos</div>
            <h2 className="font-serif text-3xl">مختارات من الأعمال</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {profile.portfolio_urls!.slice(0, 12).map((u, i) => (
              <a key={i} href={u} target="_blank" rel="noreferrer" className="block aspect-square bg-secondary rounded-sm overflow-hidden">
                <img src={u} alt="" className="w-full h-full object-cover hover:scale-105 transition" loading="lazy" />
              </a>
            ))}
          </div>
        </section>
      )}

      {/* BOOKING + DEPOSIT */}
      <section id="book" className="bg-secondary/40 py-16">
        <div className="container-editorial grid gap-8 lg:grid-cols-[1.2fr_1fr]">
          <SimpleBookingForm profile={profile} pricing={pricing} blockedDates={blockedDates} bookedSlots={bookedSlots} pickedPackageId={pickedPackageId} />
          <DepositCard profile={profile} />
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
          <h2 className="font-serif text-2xl mb-4 text-center">آراء العملاء</h2>
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
    </div>
  );
}

function SimpleBookingForm({ profile, pricing, blockedDates, bookedSlots, pickedPackageId }: { profile: Profile; pricing: Pricing[]; blockedDates: string[]; bookedSlots: { event_date: string; start_time: string; end_time: string }[]; pickedPackageId?: string }) {
  const [f, setF] = useState({
    client_name: "", client_phone: "", event_date: "", start_time: "", end_time: "",
    package_id: "", venue_address: "", remaining_note: "", client_notes: "",
    privacy_level: "public" as "public" | "private_only",
  });
  const [submitting, setSubmitting] = useState(false);
  const selected = pricing.find((p) => p.id === f.package_id);
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

  const total = selected ? Number(selected.price) : 0;
  const deposit = selected ? (profile.fixed_deposit ?? Math.round(total * (Number(profile.deposit_percent || 25) / 100))) : 0;

  const submit = async () => {
    if (!f.client_name || !f.client_phone || !f.event_date || !selected) {
      return toast.error("الرجاء تعبئة الاسم والهاتف والتاريخ واختيار الباقة");
    }
    if (isBlocked) return toast.error("هذا اليوم غير متاح، الرجاء اختيار يوم آخر");
    if (hasConflict) return toast.error("هذا الوقت محجوز، اختاري وقتاً مختلفاً");
    setSubmitting(true);

    await supabase.from("bookings").insert({
      photographer_id: profile.id,
      client_name: f.client_name,
      client_email: `${f.client_phone.replace(/\D/g, "") || "guest"}@whatsapp.local`,
      client_phone: f.client_phone,
      service: selected.service, event_date: f.event_date,
      start_time: f.start_time || "12:00", end_time: f.end_time || "18:00",
      venue_name: "", venue_address: f.venue_address,
      base_price: total, travel_fee: 0, total_price: total,
      deposit_amount: deposit, edited_photos_count: 0,
      privacy_level: f.privacy_level,
      photographer_can_publish: f.privacy_level === "public",
      client_notes: [f.client_notes, f.remaining_note ? `الرصيد المتبقي: ${f.remaining_note}` : ""].filter(Boolean).join("\n"),
      contract_agreed: true, status: "pending_deposit",
      addons: [{ rule_id: selected.id, label: selected.label }],
    });

    const msg = [
      `مرحبًا ${profile.display_name}،`,
      `أرغب بالحجز:`,
      `الاسم: ${f.client_name}`,
      `الهاتف: ${f.client_phone}`,
      `التاريخ: ${f.event_date}`,
      f.start_time && `من: ${f.start_time}`,
      f.end_time && `إلى: ${f.end_time}`,
      `الباقة: ${selected.label} (${total} د.أ)`,
      f.venue_address && `الموقع: ${f.venue_address}`,
      f.remaining_note && `الرصيد المتبقي: ${f.remaining_note}`,
      f.client_notes && `ملاحظات: ${f.client_notes}`,
      `سأحوّل العربون ${deposit} د.أ.`,
    ].filter(Boolean).join("\n");

    setSubmitting(false);
    const phone = (profile.whatsapp || profile.phone || "").replace(/[^0-9]/g, "");
    if (phone) {
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank");
      toast.success("تم إرسال طلبك");
    } else {
      toast.success("تم إرسال الطلب بنجاح");
    }
  };

  return (
    <div className="bg-card border border-border rounded-sm p-6 sm:p-8 shadow-soft">
      <div className="text-xs uppercase tracking-[0.3em] text-gold mb-2">Book in simple steps</div>
      <h2 className="font-serif text-3xl mb-6">احجزي بخطوات بسيطة</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="الاسم" v={f.client_name} on={(v) => setF({ ...f, client_name: v })} />
        <Field label="الهاتف" v={f.client_phone} on={(v) => setF({ ...f, client_phone: v })} />
        <div className="sm:col-span-1">
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
          <label className="text-sm text-muted-foreground">الباقة</label>
          <select value={f.package_id} onChange={(e) => onSelectPackage(e.target.value)} className="w-full mt-1 border border-border rounded-sm px-3 py-2 bg-background">
            <option value="">— اختاري الباقة —</option>
            {pricing.map((r) => <option key={r.id} value={r.id}>{r.label} — {r.price} د.أ</option>)}
          </select>
          {selected && (
            <div className="mt-3 rounded-sm bg-secondary/60 border border-border p-3 text-sm space-y-1">
              {selected.description && <div className="text-muted-foreground whitespace-pre-line">{selected.description}</div>}
              <div className="flex justify-between"><span>المجموع</span><span className="font-semibold">{total.toLocaleString("ar-JO")} د.أ</span></div>
              <div className="flex justify-between text-gold"><span>العربون المطلوب</span><span className="font-semibold">{deposit.toLocaleString("ar-JO")} د.أ</span></div>
              <div className="text-xs text-muted-foreground pt-1">تم تعبئة الأوقات تلقائياً — يمكنكِ تعديلها.</div>
            </div>
          )}
        </div>
        <div className="sm:col-span-2">
          <Field label="الموقع / القاعة" v={f.venue_address} on={(v) => setF({ ...f, venue_address: v })} />
        </div>
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
      {isBlocked && <p className="text-sm text-destructive mt-3">⚠️ هذا اليوم غير متاح</p>}
      {daySlots.length > 0 && !isBlocked && (
        <div className="mt-3 rounded-sm border border-amber-200 bg-amber-50 p-3 text-sm">
          <div className="font-medium text-amber-900 mb-1">فترات محجوزة في هذا اليوم:</div>
          <ul className="text-xs text-amber-800 space-y-0.5">
            {daySlots.map((s, i) => <li key={i}>• من {s.start_time?.slice(0,5)} إلى {s.end_time?.slice(0,5)}</li>)}
          </ul>
          <div className="text-xs text-amber-700 mt-1">اختاري وقتاً خارج هذه الفترات.</div>
        </div>
      )}
      {hasConflict && <p className="text-sm text-destructive mt-3">⚠️ يتعارض مع فترة محجوزة</p>}
      <button onClick={submit} disabled={submitting} className="w-full mt-5 bg-green-600 hover:bg-green-700 text-white py-3 rounded-sm inline-flex items-center justify-center gap-2 disabled:opacity-60">
        <MessageCircle className="h-4 w-4" /> {submitting ? "جاري الإرسال…" : "إرسال الطلب عبر واتساب"}
      </button>
    </div>
  );
}

function DepositCard({ profile }: { profile: Profile }) {
  return (
    <div className="bg-charcoal text-ivory rounded-sm p-6 sm:p-8 h-fit lg:sticky lg:top-24">
      <div className="text-xs uppercase tracking-[0.3em] text-gold mb-2">Deposit Information</div>
      <h3 className="font-serif text-2xl mb-5">معلومات العربون</h3>
      <div className="space-y-4 text-sm">
        {profile.fixed_deposit ? (
          <Row label="مبلغ العربون" value={`${Number(profile.fixed_deposit).toLocaleString("ar-JO")} د.أ`} />
        ) : (
          <Row label="نسبة العربون" value={`${profile.deposit_percent}%`} />
        )}
        {profile.cliq_alias && (
          <div className="bg-ivory/10 rounded-sm p-3">
            <div className="text-[10px] uppercase tracking-[0.2em] text-ivory/60 mb-1">CliQ Alias</div>
            <div className="flex items-center justify-between gap-2">
              <div className="font-mono text-lg">{profile.cliq_alias}</div>
              <button onClick={() => { navigator.clipboard.writeText(profile.cliq_alias!); toast.success("تم النسخ"); }} className="p-2 hover:bg-ivory/10 rounded-sm"><Copy className="h-4 w-4" /></button>
            </div>
          </div>
        )}
        {profile.bank_info && (
          <div className="bg-ivory/10 rounded-sm p-3">
            <div className="text-[10px] uppercase tracking-[0.2em] text-ivory/60 mb-1">تحويل بنكي</div>
            <div className="whitespace-pre-line">{profile.bank_info}</div>
          </div>
        )}
      </div>
      <p className="text-[11px] text-ivory/60 mt-5 leading-relaxed">
        بعد التحويل أرسلي إثبات الدفع عبر واتساب لتأكيد الحجز.
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
