import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Search, MapPin } from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/search")({
  component: SearchPage,
});

type Photographer = {
  username: string;
  display_name: string;
  city: string | null;
  bio: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  is_featured?: boolean;
};

function SearchPage() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Photographer[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    setLoading(true);
    const run = async () => {
      let query = supabase
        .from("profiles")
        .select("username,display_name,city,bio,avatar_url,cover_url,is_featured")
        .eq("is_published", true)
        .order("is_featured", { ascending: false })
        .limit(24);
      if (q.trim()) {
        query = query.or(`username.ilike.%${q}%,display_name.ilike.%${q}%,city.ilike.%${q}%`);
      }
      const { data } = await query;
      if (active) {
        setResults((data ?? []) as Photographer[]);
        setLoading(false);
      }
    };
    const t = setTimeout(run, 200);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [q]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <section className="container-editorial py-12">
        <div className="text-center mb-8">
          <div className="text-xs uppercase tracking-[0.3em] text-gold mb-2">دليل المصوّرين</div>
          <h1 className="font-serif text-4xl">اعثر على مصوّر عرسك</h1>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            const direct = q.trim().replace(/^@/, "");
            if (direct) navigate({ to: "/photographers/$username", params: { username: direct } });
          }}
          className="max-w-xl mx-auto relative mb-10"
        >
          <Search className="absolute top-1/2 -translate-y-1/2 start-4 h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث باسم المصوّر أو اسم المستخدم أو المدينة…"
            className="w-full rounded-sm border border-input bg-card ps-11 pe-4 py-3.5 text-base focus:outline-none focus:ring-2 focus:ring-gold/60"
          />
        </form>

        {loading ? (
          <p className="text-center text-muted-foreground">جاري التحميل…</p>
        ) : results.length === 0 ? (
          <p className="text-center text-muted-foreground">لا توجد نتائج بعد. جرّب إدخال اسم مستخدم مباشر.</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((p) => (
              <Link
                key={p.username}
                to="/photographers/$username"
                params={{ username: p.username }}
                className="group rounded-sm overflow-hidden border border-border bg-card shadow-soft hover:shadow-elegant transition"
              >
                <div className="aspect-[4/3] bg-gradient-royal overflow-hidden">
                  {p.cover_url && <img src={p.cover_url} alt={p.display_name} className="h-full w-full object-cover group-hover:scale-105 transition" />}
                </div>
                <div className="p-5">
                  <div className="font-serif text-xl mb-1 flex items-center gap-2">
                    {p.display_name}
                    {p.is_featured && (
                      <span className="text-[10px] uppercase tracking-wider bg-gold/15 text-gold px-2 py-0.5 rounded-sm border border-gold/30">مميّز</span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mb-2">@{p.username}</div>
                  {p.city && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" /> {p.city}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
      <Footer />
    </div>
  );
}
