import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Instagram, MapPin, Phone, MessageCircle, ArrowLeft } from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/photographers/$username")({
  component: PhotographerPage,
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
  const [loading, setLoading] = useState(true);

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
        const { data: p } = await supabase.from("pricing_rules").select("*").eq("photographer_id", (prof as Profile).id);
        setPricing((p ?? []) as Pricing[]);
      }
      setLoading(false);
    })();
  }, [username]);

  if (loading) return <FallbackPage>جاري التحميل…</FallbackPage>;
  if (!profile) return <FallbackPage>لا يوجد مصوّر بهذا الاسم. <Link to="/search" className="underline">عُد للبحث</Link></FallbackPage>;

  const photoPricing = pricing.filter((p) => p.service === "photography");
  const videoPricing = pricing.filter((p) => p.service === "cinematic_video");

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
              <h1 className="font-serif text-3xl sm:text-4xl">{profile.display_name}</h1>
              <div className="text-sm text-muted-foreground mb-3">@{profile.username}</div>
              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                {profile.city && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {profile.city}</span>}
                {profile.instagram && <a href={`https://instagram.com/${profile.instagram}`} className="inline-flex items-center gap-1 hover:text-gold"><Instagram className="h-3.5 w-3.5" /> {profile.instagram}</a>}
                {profile.whatsapp && <span className="inline-flex items-center gap-1"><MessageCircle className="h-3.5 w-3.5" /> {profile.whatsapp}</span>}
                {profile.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> {profile.phone}</span>}
              </div>
            </div>
            <Link
              to="/photographers/$username"
              params={{ username: profile.username }}
              className="inline-flex items-center gap-2 bg-charcoal text-ivory px-5 py-3 rounded-sm shadow-soft hover:opacity-90 self-end"
            >
              احجز موعدًا <ArrowLeft className="h-4 w-4" />
            </Link>
          </div>
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
        </div>

        <aside className="rounded-sm border border-border bg-card p-6 h-fit lg:sticky lg:top-24 shadow-soft">
          <div className="text-xs uppercase tracking-[0.25em] text-gold mb-2">حجز سريع</div>
          <h3 className="font-serif text-2xl mb-4">جاهز للحجز؟</h3>
          <p className="text-sm text-muted-foreground mb-5">
            استخدم النموذج التفصيلي لإدخال الموقع والوقت ونوع التصوير، ويظهر السعر النهائي مباشرة.
          </p>
          <button className="w-full bg-charcoal text-ivory py-3 rounded-sm shadow-soft cursor-not-allowed opacity-80" disabled>
            نموذج الحجز قادم قريبًا
          </button>
          <p className="text-[11px] text-muted-foreground mt-3 text-center">يتم الآن تجهيز التقويم والدفع بالعربون.</p>
        </aside>
      </section>

      <Footer />
    </div>
  );
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
