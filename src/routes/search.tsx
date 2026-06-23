import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, MapPin, Star, X, SlidersHorizontal } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { GridSkeleton } from "@/components/ui/loading";
import { EmptyState } from "@/components/ui/empty-state";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { staggerContainer, fadeUp, cardHover } from "@/lib/animations";
import {
  searchPhotographers,
  listPublishedCities,
  type SearchResultItem,
  type SearchSort,
} from "@/lib/search.functions";

export const Route = createFileRoute("/search")({
  component: SearchPage,
  head: () => ({
    meta: [
      { title: "ابحث عن مصوّر عرسك | EliteCapture" },
      {
        name: "description",
        content:
          "اعثري على مصوّر عرسك المثالي في الأردن. فلترة بالمدينة والسعر والتاريخ المتاح وتقييمات حقيقية من العرائس.",
      },
    ],
  }),
});

function SearchPage() {
  const [q, setQ] = useState("");
  const [city, setCity] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [date, setDate] = useState("");
  const [sort, setSort] = useState<SearchSort>("featured");
  // ✅ إضافة: فلتر التقييم الأدنى
  const [minRating, setMinRating] = useState<number>(0);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const navigate = useNavigate();

  const runSearch = useServerFn(searchPhotographers);
  const runCities = useServerFn(listPublishedCities);

  const citiesQ = useQuery({
    queryKey: ["search-cities"],
    queryFn: () => runCities({}),
    staleTime: 5 * 60_000,
  });

  // Debounce text input
  const [debouncedQ, setDebouncedQ] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 250);
    return () => clearTimeout(t);
  }, [q]);

  const resultsQ = useQuery({
    queryKey: ["search", debouncedQ, city, minPrice, maxPrice, date, sort],
    queryFn: () =>
      runSearch({
        data: {
          q: debouncedQ || undefined,
          city: city || undefined,
          min_price: minPrice ? Number(minPrice) : null,
          max_price: maxPrice ? Number(maxPrice) : null,
          available_date: date || null,
          sort,
        },
      }),
    placeholderData: (prev) => prev,
  });

  const results: SearchResultItem[] = resultsQ.data ?? [];

  // ✅ تطبيق فلتر التقييم client-side بعد جلب النتائج
  const displayResults = minRating > 0
    ? results.filter((r) => r.avg_rating >= minRating)
    : results;

  const hasFilters = useMemo(
    () => !!(city || minPrice || maxPrice || date || debouncedQ || minRating > 0),
    [city, minPrice, maxPrice, date, debouncedQ, minRating],
  );

  const clearAll = () => {
    setQ("");
    setCity("");
    setMinPrice("");
    setMaxPrice("");
    setDate("");
    setSort("featured");
    setMinRating(0);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <section className="container-editorial py-10 md:py-12">
        <div className="text-center mb-6 md:mb-8">
          <div className="text-xs uppercase tracking-[0.3em] text-gold mb-2">دليل المصوّرين</div>
          <h1 className="font-serif text-3xl md:text-4xl">اعثري على مصوّرة عرسك</h1>
          <p className="text-sm text-muted-foreground mt-2">
            {results.length > 0
              ? `${displayResults.length} مصوّرة متاحة${hasFilters ? " ضمن فلترك" : ""}`
              : "أدخلي مدينتك أو ميزانيتك أو تاريخ حفلك لنُريك المصوّرات المتاحات."}
          </p>
        </div>

        {/* Filters */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const direct = q.trim().replace(/^@/, "");
            if (direct && !/\s/.test(direct))
              navigate({ to: "/photographers/$username", params: { username: direct.toLowerCase() } });
          }}
          className="rounded-md border border-border bg-card p-4 md:p-5 mb-6 md:mb-8 shadow-soft"
        >
          <div className="grid gap-3 md:grid-cols-12">
            <div className="md:col-span-4 relative">
              <Search className="absolute top-1/2 -translate-y-1/2 start-3 h-4 w-4 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="اسم المصوّرة، @المستخدم، أو وصف…"
                autoCapitalize="none"
                autoCorrect="off"
                autoComplete="off"
                spellCheck={false}
                className="w-full rounded-sm border border-input bg-background ps-9 pe-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/60"
              />
            </div>

            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="md:col-span-2 rounded-sm border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/60"
            >
              <option value="">كل المدن</option>
              {(citiesQ.data ?? []).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              placeholder="السعر من"
              className="md:col-span-2 rounded-sm border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/60"
            />
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              placeholder="إلى"
              className="md:col-span-2 rounded-sm border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/60"
            />

            <input
              type="date"
              value={date}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setDate(e.target.value)}
              className="md:col-span-2 rounded-sm border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/60"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 mt-3">
            <label className="text-xs text-muted-foreground">ترتيب:</label>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SearchSort)}
              className="rounded-sm border border-input bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-gold/60"
            >
              <option value="featured">المميّزات أولاً</option>
              <option value="rating">الأعلى تقييماً</option>
              <option value="price_asc">السعر: الأقل أولاً</option>
              <option value="price_desc">السعر: الأعلى أولاً</option>
            </select>
            {hasFilters && (
              <button
                type="button"
                onClick={clearAll}
                className="ms-auto text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
              >
                <X className="h-3 w-3" /> مسح الفلتر
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              className={`${hasFilters ? "" : "ms-auto"} text-xs inline-flex items-center gap-1 px-2 py-1 rounded-sm border border-border hover:bg-secondary transition`}
            >
              <SlidersHorizontal className="h-3 w-3" />
              {showAdvanced ? "إخفاء الفلاتر المتقدّمة" : "فلاتر متقدّمة"}
            </button>
          </div>

          <AnimatePresence initial={false}>
            {showAdvanced && (
              <motion.div
                key="advanced"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden"
              >
                <div className="mt-3 pt-3 border-t border-border flex flex-wrap items-center gap-2">
                  <label className="text-xs text-muted-foreground">الحد الأدنى للتقييم:</label>
                  {[0, 3, 4, 4.5].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setMinRating(r)}
                      className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-sm border transition ${minRating === r ? "bg-charcoal text-ivory border-charcoal" : "border-border bg-card hover:bg-secondary"}`}
                    >
                      {r === 0 ? "الكل" : (<><Star className="h-3 w-3 fill-gold text-gold" />{r}+</>)}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </form>

        {/* Results */}
        {resultsQ.isError ? (
          <div className="col-span-full text-center py-16 text-sm text-destructive">
            تعذّر تحميل النتائج. تحقّق من اتصالك وحاول مجدداً.
          </div>
        ) : resultsQ.isLoading ? (
          <GridSkeleton items={6} />
        ) : displayResults.length === 0 ? (
          <EmptyState
            icon={Search}
            title="لا توجد نتائج"
            description="لم نعثر على مصوّرات تطابق فلترك الحالي. جرّبي توسيع النطاق السعري، إزالة المدينة، أو تغيير التاريخ."
            action={hasFilters ? (
              <button onClick={clearAll} className="inline-flex items-center gap-2 bg-charcoal text-ivory px-5 py-2 rounded-sm hover:opacity-90 text-sm">
                <X className="h-4 w-4" /> مسح كل الفلاتر
              </button>
            ) : undefined}
          />
        ) : (
          <motion.div
            className="columns-1 sm:columns-2 lg:columns-3 gap-4"
            key={`${debouncedQ}|${city}|${minPrice}|${maxPrice}|${date}|${sort}|${minRating}`}
          >
            {displayResults.map((p, idx) => (
              <BentoPhotographerCard key={p.username} p={p} idx={idx} />
            ))}
          </motion.div>
        )}
      </section>
      <Footer />
    </div>
  );
}

function BentoPhotographerCard({ p, idx }: { p: SearchResultItem; idx: number }) {
  void idx;
  const aspectClass = "aspect-[4/5]";
  return (
    <motion.article
      variants={fadeUp}
      whileHover={{ y: -6 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="h-full"
    >
      <Link
        to="/photographers/$username"
        params={{ username: p.username }}
        className="group relative block overflow-hidden rounded-sm border border-border bg-card shadow-soft lift-on-hover"
      >
        {/* Cover */}
        <div className={`relative ${aspectClass} bg-gradient-royal overflow-hidden`}>
          {p.cover_url ? (
            <img
              src={p.cover_url}
              alt={p.display_name}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.06]"
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center text-ivory/60 font-serif text-2xl">
              {p.display_name?.[0] ?? "·"}
            </div>
          )}

          {/* Editorial gradient overlay */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent opacity-90 transition-opacity duration-500 group-hover:opacity-100" />

          {/* Top row — badge + price chip */}
          <div className="absolute top-3 inset-x-3 flex items-start justify-between gap-2 z-10">
            {p.is_featured ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-gold text-charcoal px-2.5 py-1 text-[10px] uppercase tracking-[0.15em] font-medium shadow-soft">
                <Star className="h-3 w-3 fill-current" /> مميّزة
              </span>
            ) : <span />}
            {p.min_price != null && (
              <span className="rounded-full bg-background/85 backdrop-blur-sm text-foreground px-3 py-1 text-[11px] font-medium border border-border/60">
                من {p.min_price} د.أ
              </span>
            )}
          </div>

          {/* Bottom editorial caption inside the image */}
          <div className="absolute inset-x-0 bottom-0 p-5 z-10 text-ivory">
            <div className="text-[10px] uppercase tracking-[0.3em] opacity-80 mb-1">
              {p.city ? (
                <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {p.city}</span>
              ) : "EliteCapture"}
            </div>
            <h3 className="font-serif text-2xl leading-tight transition-transform duration-500 group-hover:-translate-y-0.5">
              {p.display_name}
            </h3>
            <div className="mt-2 flex items-center justify-between text-[11px]">
              <span className="opacity-80">@{p.username}</span>
              {p.review_count > 0 ? (
                <span className="inline-flex items-center gap-1">
                  <Star className="h-3 w-3 fill-gold text-gold" />
                  <span className="font-medium">{p.avg_rating}</span>
                  <span className="opacity-70">({p.review_count})</span>
                </span>
              ) : (
                <span className="opacity-60">جديد</span>
              )}
            </div>

            {/* Gold hairline that grows on hover */}
            <div className="mt-4 h-px w-10 bg-gold transition-all duration-500 group-hover:w-full" />
          </div>
        </div>
      </Link>
    </motion.article>
  );
}
