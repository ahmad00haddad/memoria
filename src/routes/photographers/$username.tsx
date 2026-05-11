import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Instagram, MapPin, Phone, MessageCircle, ArrowLeft, Star, Upload, Copy, Share2 } from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  id: string;
  username: string;
  display_name: string;
  bio: string | null;
  city: string | null;
  base_location: string | null;
  phone: string | null;
  instagram: string | null;
  whatsapp: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  equipment: string | null;
  cliq_alias: string | null;
  portfolio_urls: string[] | null;
  deposit_percent: number;
  travel_fee_per_km: number;
  free_km: number;
  is_featured?: boolean;
};

type Pricing = {
  id: string;
  service: "photography" | "cinematic_video";
  package: "hourly" | "full_day" | "addon";
  label: string;
  price: number;
  per_photo_price: number | null;
  description: string | null;
};

function PhotographerPage() {
  const { username } = Route.useParams();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [pricing, setPricing] = useState<Pricing[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [unavail, setUnavail] = useState<string[]>([]);
  const [bookedDates, setBookedDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBooking, setShowBooking] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: prof } = await supabase
        .from("profiles")
        .select("*")
        .eq("username", username)
        .eq("is_published", true)
        .maybeSingle();
      setProfile(prof as Profile | null);
      if (prof) {
        const pid = (prof as Profile).id;
        const [{ data: p }, { data: r }, { data: u }, { data: bk }] = await Promise.all([
          supabase.from("pricing_rules").select("*").eq("photographer_id", pid),
          supabase.from("reviews").select("*").eq("photographer_id", pid).eq("is_published", true).order("created_at", { ascending: false }),
          supabase.from("photographer_unavailability").select("date").eq("photographer_id", pid),
          supabase.from("bookings").select("event_date").eq("photographer_id", pid).in("status", ["confirmed", "pending_deposit"]),
        ]);
        setPricing((p ?? []) as Pricing[]);
        setReviews(r ?? []);
        setUnavail((u ?? []).map((x: any) => x.date));
        setBookedDates((bk ?? []).map((x: any) => x.event_date));
      }
      setLoading(false);
    })();
  }, [username]);

  if (loading) return <FallbackPage>جاري التحميل…</FallbackPage>;
  if (!profile) return <FallbackPage>لا يوجد مصوّر بهذا الاسم. <Link to="/search" className="underline">عُد للبحث</Link></FallbackPage>;

  const photoPricing = pricing.filter((p) => p.service === "photography");
  const videoPricing = pricing.filter((p) => p.service === "cinematic_video");
  const blockedDates = [...new Set([...unavail, ...bookedDates])];
  const avgRating = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <section className="relative">
        <div className="h-56 sm:h-72 bg-gradient-royal overflow-hidden">
          {profile.cover_url && <img src={profile.cover_url} alt="" className="h-full w-full object-cover" />}
        </div>
        <div className="container-editorial -mt-16 relative">
          <div className="bg-card border border-border rounded-sm shadow-elegant p-6 sm:p-8 grid gap-6 md:grid-cols-[auto_1fr_auto] items-start">
            <div className="h-24 w-24 rounded-full bg-secondary border-4 border-card overflow-hidden -mt-16">
              {profile.avatar_url ? <img src={profile.avatar_url} alt={profile.display_name} className="h-full w-full object-cover" /> : null}
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.25em] text-gold mb-1">مصوّر أعراس</div>
              <h1 className="font-serif text-3xl sm:text-4xl flex items-center gap-3">
                {profile.display_name}
                {profile.is_featured && (
                  <span className="text-[10px] uppercase tracking-wider bg-gold/15 text-gold px-2 py-1 rounded-sm border border-gold/30">⭐ مصوّر مميّز</span>
                )}
              </h1>
              <div className="text-sm text-muted-foreground mb-3">@{profile.username}</div>
              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                {profile.city && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {profile.city}</span>}
                {profile.instagram && <a href={`https://instagram.com/${profile.instagram}`} className="inline-flex items-center gap-1 hover:text-gold"><Instagram className="h-3.5 w-3.5" /> {profile.instagram}</a>}
                {profile.whatsapp && <span className="inline-flex items-center gap-1"><MessageCircle className="h-3.5 w-3.5" /> {profile.whatsapp}</span>}
                {profile.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> {profile.phone}</span>}
              </div>
            </div>
            <div className="flex gap-2 self-end">
              <button
                onClick={() => {
                  const url = typeof window !== "undefined" ? window.location.href : "";
                  const text = `شاهد ملف المصوّر ${profile.display_name} على EliteCapture`;
                  if (navigator.share) navigator.share({ title: profile.display_name, text, url }).catch(() => {});
                  else { navigator.clipboard.writeText(url); toast.success("نُسخ الرابط"); }
                }}
                className="inline-flex items-center gap-1 border border-border px-3 py-3 rounded-sm hover:bg-secondary"
                aria-label="مشاركة"
              >
                <Share2 className="h-4 w-4" />
              </button>
              {profile.whatsapp && (
                <a
                  href={`https://wa.me/${profile.whatsapp.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(`مرحبًا، شاهدت ملفك على EliteCapture وأرغب بالاستفسار.`)}`}
                  target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1 border border-border px-3 py-3 rounded-sm hover:bg-secondary"
                  aria-label="واتساب"
                >
                  <MessageCircle className="h-4 w-4 text-green-600" />
                </a>
              )}
              <button onClick={() => setShowBooking(true)} className="inline-flex items-center gap-2 bg-charcoal text-ivory px-5 py-3 rounded-sm shadow-soft hover:opacity-90">
                احجز موعدًا <ArrowLeft className="h-4 w-4" />
              </button>
            </div>
          </div>
          {reviews.length > 0 && (
            <div className="mt-3 text-sm flex items-center gap-2"><Star className="h-4 w-4 fill-gold text-gold" /> <span className="font-semibold">{avgRating.toFixed(1)}</span><span className="text-muted-foreground">({reviews.length} مراجعة)</span></div>
          )}
        </div>
      </section>

      <section className="container-editorial py-12 grid gap-10 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-10">
          <div>
            <h2 className="font-serif text-2xl mb-3">نبذة</h2>
            <p className="text-muted-foreground leading-loose">{profile.bio || "لم يضف هذا المصوّر نبذة بعد."}</p>
          </div>
          {profile.equipment && (
            <div>
              <h2 className="font-serif text-2xl mb-3">المعدّات</h2>
              <p className="text-muted-foreground leading-loose whitespace-pre-line">{profile.equipment}</p>
            </div>
          )}
          <div className="grid gap-6 sm:grid-cols-2">
            <PriceColumn title="تصوير فوتوغرافي" items={photoPricing} />
            <PriceColumn title="فيديو سينمائي" items={videoPricing} />
          </div>

          {(profile.portfolio_urls?.length ?? 0) > 0 && (
            <div>
              <h2 className="font-serif text-2xl mb-3">معرض الأعمال</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {profile.portfolio_urls!.map((u, i) => (
                  <a key={i} href={u} target="_blank" rel="noreferrer" className="block aspect-square bg-secondary rounded-sm overflow-hidden">
                    <img src={u} alt="" className="w-full h-full object-cover hover:scale-105 transition" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {reviews.length > 0 && (
            <div>
              <h2 className="font-serif text-2xl mb-3">آراء العملاء</h2>
              <div className="space-y-3">
                {reviews.map((r) => (
                  <div key={r.id} className="rounded-sm border border-border bg-card p-4">
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-sm">{r.client_name}</div>
                      <div className="flex">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`h-3.5 w-3.5 ${i < r.rating ? "fill-gold text-gold" : "text-muted-foreground/40"}`} />)}</div>
                    </div>
                    {r.comment && <p className="text-sm text-muted-foreground mt-2">{r.comment}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <aside className="rounded-sm border border-border bg-card p-6 h-fit lg:sticky lg:top-24 shadow-soft">
          <div className="text-xs uppercase tracking-[0.25em] text-gold mb-2">حجز سريع</div>
          <h3 className="font-serif text-2xl mb-4">جاهز للحجز؟</h3>
          <p className="text-sm text-muted-foreground mb-5">
            استخدم النموذج التفصيلي لإدخال الموقع والوقت ونوع التصوير، ويظهر السعر النهائي مباشرة.
          </p>
          <button onClick={() => setShowBooking(true)} className="w-full bg-charcoal text-ivory py-3 rounded-sm shadow-soft hover:opacity-90">
            افتح نموذج الحجز
          </button>
          <p className="text-[11px] text-muted-foreground mt-3 text-center">السعر يُحسب فورًا · العربون عبر CliQ</p>
        </aside>
      </section>

      {showBooking && <BookingModal profile={profile} pricing={pricing} blockedDates={blockedDates} onClose={() => setShowBooking(false)} />}

      <Footer />
    </div>
  );
}

function BookingModal({ profile, pricing, blockedDates, onClose }: { profile: Profile; pricing: Pricing[]; blockedDates: string[]; onClose: () => void }) {
  const [step, setStep] = useState<"form" | "deposit" | "done">("form");
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [f, setF] = useState({
    client_name: "", client_email: "", client_phone: "", service: "photography" as "photography" | "cinematic_video",
    package_id: "", event_date: "", start_time: "12:00", end_time: "18:00",
    venue_name: "", venue_address: "", distance_km: 0, edited_photos_count: 50,
    client_notes: "", contract_agreed: false,
  });
  const proofRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const filteredRules = pricing.filter((p) => p.service === f.service);
  const selected = filteredRules.find((r) => r.id === f.package_id);

  const calc = useMemo(() => {
    const base = Number(selected?.price ?? 0);
    const extraPhotoFee = selected?.per_photo_price && selected.per_photo_price > 0 ? Number(selected.per_photo_price) * Number(f.edited_photos_count || 0) : 0;
    const km = Number(f.distance_km || 0);
    const billableKm = Math.max(0, km - Number(profile.free_km || 0));
    const travel = billableKm * Number(profile.travel_fee_per_km || 0);
    const total = base + extraPhotoFee + travel;
    const deposit = total * (Number(profile.deposit_percent || 25) / 100);
    return { base, extraPhotoFee, travel, total: Math.round(total), deposit: Math.round(deposit) };
  }, [selected, f.distance_km, f.edited_photos_count, profile]);

  const isBlocked = f.event_date && blockedDates.includes(f.event_date);

  const submit = async () => {
    if (!f.client_name || !f.client_email || !f.event_date || !selected) return toast.error("اكملي الحقول المطلوبة");
    if (isBlocked) return toast.error("هذا اليوم غير متاح");
    if (!f.contract_agreed) return toast.error("يجب الموافقة على شروط الحجز");
    setSubmitting(true);
    const { data, error } = await supabase.from("bookings").insert({
      photographer_id: profile.id,
      client_name: f.client_name, client_email: f.client_email, client_phone: f.client_phone,
      service: f.service, event_date: f.event_date, start_time: f.start_time, end_time: f.end_time,
      venue_name: f.venue_name, venue_address: f.venue_address,
      base_price: calc.base + calc.extraPhotoFee, travel_fee: calc.travel, total_price: calc.total,
      deposit_amount: calc.deposit, edited_photos_count: f.edited_photos_count,
      client_notes: f.client_notes, contract_agreed: true, status: "pending_deposit",
      addons: selected ? [{ rule_id: selected.id, label: selected.label }] : [],
    }).select("id").maybeSingle();
    setSubmitting(false);
    if (error || !data) return toast.error(error?.message || "فشل الحجز");
    setCreatedId(data.id);
    setStep("deposit");
    toast.success("تم إنشاء الحجز. ارفعي إثبات العربون لتأكيده.");
  };

  const uploadProof = async (file: File) => {
    if (!createdId) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${createdId}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("deposit-proofs").upload(path, file);
      if (error) throw error;
      await supabase.from("bookings").update({ deposit_proof_url: path }).eq("id", createdId);
      setStep("done");
    } catch (e: any) { toast.error(e.message); }
    finally { setUploading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 grid place-items-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-card w-full max-w-2xl rounded-sm shadow-elegant max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h2 className="font-serif text-2xl">حجز جديد — {profile.display_name}</h2>
          <button onClick={onClose} className="text-2xl leading-none">×</button>
        </div>

        {step === "form" && (
          <div className="p-6 space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <Inp label="الاسم *" v={f.client_name} on={(v) => setF({ ...f, client_name: v })} />
              <Inp label="البريد *" type="email" v={f.client_email} on={(v) => setF({ ...f, client_email: v })} />
              <Inp label="الهاتف" v={f.client_phone} on={(v) => setF({ ...f, client_phone: v })} />
              <div>
                <label className="text-sm">نوع الخدمة</label>
                <select value={f.service} onChange={(e) => setF({ ...f, service: e.target.value as any, package_id: "" })} className="w-full mt-1 border border-border rounded-sm px-3 py-2 bg-background">
                  <option value="photography">تصوير فوتوغرافي</option>
                  <option value="cinematic_video">فيديو سينمائي</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm">الباقة</label>
                <select value={f.package_id} onChange={(e) => setF({ ...f, package_id: e.target.value })} className="w-full mt-1 border border-border rounded-sm px-3 py-2 bg-background">
                  <option value="">— اختاري —</option>
                  {filteredRules.map((r) => <option key={r.id} value={r.id}>{r.label} — {r.price} د.أ</option>)}
                </select>
              </div>
              <Inp label="تاريخ العرس *" type="date" v={f.event_date} on={(v) => setF({ ...f, event_date: v })} />
              <Inp label="عدد الصور المعدّلة" type="number" v={String(f.edited_photos_count)} on={(v) => setF({ ...f, edited_photos_count: Number(v) })} />
              <Inp label="من" type="time" v={f.start_time} on={(v) => setF({ ...f, start_time: v })} />
              <Inp label="إلى" type="time" v={f.end_time} on={(v) => setF({ ...f, end_time: v })} />
              <Inp label="اسم القاعة/المكان" v={f.venue_name} on={(v) => setF({ ...f, venue_name: v })} />
              <Inp label="المسافة من عمّان (كم)" type="number" v={String(f.distance_km)} on={(v) => setF({ ...f, distance_km: Number(v) })} />
              <div className="sm:col-span-2">
                <label className="text-sm">العنوان</label>
                <input value={f.venue_address} onChange={(e) => setF({ ...f, venue_address: e.target.value })} className="w-full mt-1 border border-border rounded-sm px-3 py-2 bg-background" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm">ملاحظات</label>
                <textarea value={f.client_notes} onChange={(e) => setF({ ...f, client_notes: e.target.value })} rows={3} className="w-full mt-1 border border-border rounded-sm px-3 py-2 bg-background" />
              </div>
            </div>

            {isBlocked && <p className="text-sm text-destructive">⚠️ هذا اليوم غير متاح. الرجاء اختيار يوم آخر.</p>}

            <div className="bg-secondary rounded-sm p-4 space-y-1 text-sm">
              <div className="flex justify-between"><span>الباقة</span><span>{calc.base} د.أ</span></div>
              {calc.extraPhotoFee > 0 && <div className="flex justify-between"><span>صور إضافية</span><span>{calc.extraPhotoFee} د.أ</span></div>}
              <div className="flex justify-between"><span>رسوم تنقّل ({Math.max(0, f.distance_km - profile.free_km)} كم)</span><span>{calc.travel} د.أ</span></div>
              <div className="flex justify-between font-serif text-lg pt-2 border-t border-border"><span>الإجمالي</span><span>{calc.total} د.أ</span></div>
              <div className="flex justify-between text-gold"><span>العربون ({profile.deposit_percent}%)</span><span>{calc.deposit} د.أ</span></div>
            </div>

            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" checked={f.contract_agreed} onChange={(e) => setF({ ...f, contract_agreed: e.target.checked })} className="mt-1" />
              <span>أوافق على شروط الحجز: العربون غير مسترد عند الإلغاء قبل أقل من ٧ أيام، السعر النهائي يشمل التعديلات الأساسية.</span>
            </label>

            <button onClick={submit} disabled={submitting || !!isBlocked} className="w-full bg-charcoal text-ivory py-3 rounded-sm hover:opacity-90 disabled:opacity-60">
              {submitting ? "جاري الإرسال…" : "تأكيد الحجز والانتقال للعربون"}
            </button>
          </div>
        )}

        {step === "deposit" && (
          <div className="p-6 space-y-4">
            <h3 className="font-serif text-xl">ادفعي العربون لتأكيد الحجز</h3>
            <p className="text-sm text-muted-foreground">حوّلي <strong>{calc.deposit} د.أ</strong> عبر CliQ ثم ارفعي صورة الإثبات.</p>
            {profile.cliq_alias ? (
              <div className="bg-secondary rounded-sm p-4 flex items-center justify-between">
                <div><div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">CliQ Alias</div><div className="font-mono text-lg">{profile.cliq_alias}</div></div>
                <button onClick={() => { navigator.clipboard.writeText(profile.cliq_alias!); toast.success("تم النسخ"); }} className="p-2 hover:bg-card rounded-sm"><Copy className="h-4 w-4" /></button>
              </div>
            ) : <p className="text-sm text-destructive">المصوّر لم يضِف CliQ alias بعد. تواصلي معه مباشرة.</p>}

            <input ref={proofRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => e.target.files?.[0] && uploadProof(e.target.files[0])} />
            <button onClick={() => proofRef.current?.click()} disabled={uploading} className="w-full inline-flex items-center justify-center gap-2 bg-charcoal text-ivory py-3 rounded-sm hover:opacity-90 disabled:opacity-60">
              <Upload className="h-4 w-4" /> {uploading ? "جاري الرفع…" : "رفع إثبات التحويل"}
            </button>
          </div>
        )}

        {step === "done" && (
          <div className="p-8 text-center space-y-3">
            <div className="text-5xl">✓</div>
            <h3 className="font-serif text-2xl">تم استلام الحجز</h3>
            <p className="text-muted-foreground text-sm">سيتم تأكيد العربون من قبل المصوّر خلال ٢٤ ساعة. ستصلك رسالة على بريدك.</p>
            <button onClick={onClose} className="bg-charcoal text-ivory px-6 py-2 rounded-sm">إغلاق</button>
          </div>
        )}
      </div>
    </div>
  );
}

function Inp({ label, v, on, type = "text" }: { label: string; v: string; on: (v: string) => void; type?: string }) {
  return <div><label className="text-sm">{label}</label><input type={type} value={v} onChange={(e) => on(e.target.value)} className="w-full mt-1 border border-border rounded-sm px-3 py-2 bg-background" /></div>;
}

function PriceColumn({ title, items }: { title: string; items: Pricing[] }) {
  return (
    <div className="rounded-sm border border-border bg-card p-5">
      <h3 className="font-serif text-xl mb-4">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">لم تُحدَّد الأسعار بعد.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((p) => (
            <li key={p.id} className="flex items-baseline justify-between border-b border-border/60 pb-2 last:border-0">
              <div>
                <div className="text-sm">{p.label}</div>
                {p.description && <div className="text-xs text-muted-foreground">{p.description}</div>}
              </div>
              <div className="font-serif text-lg whitespace-nowrap">{Number(p.price).toLocaleString("ar-JO")} <span className="text-xs">د.أ</span></div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
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
