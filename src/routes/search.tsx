import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, MapPin, Star, X, SlidersHorizontal, BadgeCheck, Heart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { GridSkeleton } from "@/components/ui/loading";
import { SkeletonCard } from "@/components/ui/SkeletonCard";
import { EmptyState } from "@/components/ui/empty-state";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PullToRefresh } from "@/components/ui/pull-to-refresh";
import {
  searchPhotographers,
  listPublishedCities,
  type SearchResultItem,
  type SearchSort,
} from "@/lib/search.functions";
import { Drawer } from "vaul";

export const Route = createFileRoute("/search")({
  component: SearchPage,
  head: () => ({
    meta: [
      { title: "ابحث عن مصوّر عرسك | Memoria" },
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
  // ✅ فلتر "موثّقة" — يعرض فقط المصوّرات المميّزات (اجتزن مراجعة الأدمن)
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const navigate = useNavigate();

  const runSearch = useServerFn(searchPhotographers);
  const runCities = useServerFn(listPublishedCities);
  const queryClient = useQueryClient();

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
  const displayResults = results
    .filter((r) => (minRating > 0 ? r.avg_rating >= minRating : true))
    .filter((r) => (verifiedOnly ? r.verification_status === "verified" : true));

  const hasFilters = useMemo(
    () => !!(city || minPrice || maxPrice || date || debouncedQ || minRating > 0 || verifiedOnly),
    [city, minPrice, maxPrice, date, debouncedQ, minRating, verifiedOnly],
  );

  const clearAll = () => {
    setQ("");
    setCity("");
    setMinPrice("");
    setMaxPrice("");
    setDate("");
    setSort("featured");
    setMinRating(0);
    setVerifiedOnly(false);
  };

  return (
    <PullToRefresh onRefresh={async () => {
      await queryClient.invalidateQueries({ queryKey: ["search"] });
    }}>
      <div className="min-h-screen bg-background sm:pb-0 pb-20">
        <div className="hidden sm:block">
          <Header />
        </div>
        
        <section className="container-editorial py-6 sm:py-10 md:py-12">
          {/* Mobile Large Title */}
          <div className="sm:hidden mb-6 px-2">
            <h1 className="font-serif text-3xl font-bold">البحث</h1>
          </div>

          <div className="hidden sm:block text-center mb-6 md:mb-8">
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
          className="sm:rounded-md sm:border sm:border-border bg-card p-3 sm:p-4 md:p-5 mb-4 sm:mb-6 md:mb-8 sm:shadow-soft sticky top-0 z-30 sm:relative sm:top-auto sm:z-auto border-b border-border sm:border-b-0 -mx-4 sm:mx-0 px-4 sm:px-4"
        >
      <fieldset className="grid gap-3 md:grid-cols-12" aria-label="فلاتر البحث الأساسية">
            <div className="md:col-span-4 relative flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute top-1/2 -translate-y-1/2 start-3 h-4 w-4 text-muted-foreground" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="اسم المصوّرة، @المستخدم…"
                  autoCapitalize="none"
                  autoCorrect="off"
                  autoComplete="off"
                  spellCheck={false}
                  className="w-full sm:rounded-sm rounded-full sm:border border-transparent sm:border-input bg-secondary/50 sm:bg-background ps-9 pe-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/60"
                  aria-label="كلمات مفتاحية للبحث"
                />
              </div>
              
              {/* Mobile filter drawer trigger inside search row */}
              <div className="sm:hidden">
                <Drawer.Root>
                  <Drawer.Trigger asChild>
                    <button type="button" className="flex items-center justify-center w-10 h-10 rounded-full bg-secondary/50 text-foreground touch-card">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/></svg>
                    </button>
                  </Drawer.Trigger>
                  <Drawer.Portal>
                    <Drawer.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-md z-40 transition-all duration-300" />
                    <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl bg-background border-t border-border pb-safe">
                      <div className="mx-auto w-12 h-1.5 rounded-full bg-border mt-3 mb-4" />
                      <div className="px-4 pb-6 space-y-4 max-h-[80vh] overflow-y-auto">
                        <h2 className="text-base font-semibold mb-2">الفلاتر المتقدمة</h2>
                        <div className="space-y-2">
                          <label className="text-xs text-muted-foreground">التاريخ</label>
                          <input
                            type="date"
                            value={date}
                            min={new Date().toISOString().slice(0, 10)}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full rounded-sm border border-input bg-background px-3 py-2.5 text-sm"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs text-muted-foreground">السعر</label>
                          <div className="flex gap-2">
                            <input
                              type="number"
                              inputMode="numeric"
                              min={0}
                              value={minPrice}
                              onChange={(e) => setMinPrice(e.target.value)}
                              placeholder="من"
                              className="w-1/2 rounded-sm border border-input bg-background px-3 py-2.5 text-sm"
                            />
                            <input
                              type="number"
                              inputMode="numeric"
                              min={0}
                              value={maxPrice}
                              onChange={(e) => setMaxPrice(e.target.value)}
                              placeholder="إلى"
                              className="w-1/2 rounded-sm border border-input bg-background px-3 py-2.5 text-sm"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs text-muted-foreground">الترتيب</label>
                          <select value={sort} onChange={(e) => setSort(e.target.value as any)} className="w-full rounded-sm border border-input bg-background px-3 py-2.5 text-sm">
                            <option value="featured">الأبرز</option>
                            <option value="price_asc">الأقل سعراً</option>
                            <option value="price_desc">الأعلى سعراً</option>
                            <option value="newest">الأحدث</option>
                          </select>
                        </div>
                      </div>
                    </Drawer.Content>
                  </Drawer.Portal>
                </Drawer.Root>
              </div>
            </div>

            <div className="hidden sm:block md:col-span-2">
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full rounded-sm border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/60"
                aria-label="المدينة"
              >
                <option value="">كل المدن</option>
                {(citiesQ.data ?? []).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="hidden sm:block md:col-span-2">
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                placeholder="السعر من"
                className="w-full rounded-sm border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/60"
                aria-label="الحد الأدنى للسعر"
              />
            </div>
            <div className="hidden sm:block md:col-span-2">
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                placeholder="إلى"
                className="w-full rounded-sm border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/60"
                aria-label="الحد الأعلى للسعر"
              />
            </div>

            <div className="hidden sm:block md:col-span-2">
              <input
                type="date"
                value={date}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-sm border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/60"
                aria-label="تاريخ المناسبة"
              />
            </div>
          </fieldset>

          {/* Unified Mobile Quick Filters */}
          <div className="sm:hidden mt-4 -mx-4 px-4 overflow-x-auto pb-2 no-scrollbar">
            <div className="flex gap-2 w-max items-center">
              <button
                type="button"
                onClick={() => { setVerifiedOnly(true); setCity(""); setMinRating(0); }}
                className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-colors flex items-center gap-1 touch-card ${
                  verifiedOnly ? "bg-charcoal text-ivory font-medium" : "bg-secondary/50 text-foreground border border-border"
                }`}
              >
                <BadgeCheck className="h-3.5 w-3.5" />
                موثّقة
              </button>
              <button
                type="button"
                onClick={() => { setMinRating(4.5); setCity(""); setVerifiedOnly(false); }}
                className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-colors flex items-center gap-1 touch-card ${
                  minRating === 4.5 ? "bg-charcoal text-ivory font-medium" : "bg-secondary/50 text-foreground border border-border"
                }`}
              >
                <Star className="h-3.5 w-3.5" />
                أعلى تقييم
              </button>
              <div className="w-px h-5 bg-border mx-1" />
              <button
                type="button"
                onClick={() => setCity("")}
                className={`px-4 py-1.5 rounded-full text-xs whitespace-nowrap transition-colors touch-card ${!city ? "bg-foreground text-background font-medium" : "bg-secondary/50 text-foreground border border-border"}`}
              >
                كل المدن
              </button>
              {(citiesQ.data ?? []).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCity(c)}
                  className={`px-4 py-1.5 rounded-full text-xs whitespace-nowrap transition-colors touch-card ${city === c ? "bg-foreground text-background font-medium" : "bg-secondary/50 text-foreground border border-border"}`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="hidden sm:flex flex-wrap items-center gap-3 mt-3">
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
                  <span className="mx-2 h-4 w-px bg-border" />
                  <button
                    type="button"
                    onClick={() => setVerifiedOnly((v) => !v)}
                    className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-sm border transition ${verifiedOnly ? "bg-charcoal text-ivory border-charcoal" : "border-border bg-card hover:bg-secondary"}`}
                  >
                    <BadgeCheck className="h-3 w-3" /> موثّقة فقط
                  </button>
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
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="break-inside-avoid mb-4">
                <SkeletonCard aspectRatio={i % 3 === 0 ? "4/5" : "3/4"} />
              </div>
            ))}
          </div>
        ) : displayResults.length === 0 ? (
          <div className="space-y-4">
            <EmptyState
              icon={Search}
              title="لا توجد نتائج"
              description="لم نعثر على مصوّرات تطابق فلترك الحالي. جرّبي اقتراحاتنا التالية:"
              action={
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {date && (
                    <button onClick={() => setDate("")} className="text-xs border border-border bg-card px-3 py-1.5 rounded-sm hover:bg-secondary">
                      إزالة التاريخ
                    </button>
                  )}
                  {city && (
                    <button onClick={() => setCity("")} className="text-xs border border-border bg-card px-3 py-1.5 rounded-sm hover:bg-secondary">
                      البحث في كل المدن
                    </button>
                  )}
                  {(minPrice || maxPrice) && (
                    <button onClick={() => { setMinPrice(""); setMaxPrice(""); }} className="text-xs border border-border bg-card px-3 py-1.5 rounded-sm hover:bg-secondary">
                      إزالة السعر
                    </button>
                  )}
                  {verifiedOnly && (
                    <button onClick={() => setVerifiedOnly(false)} className="text-xs border border-border bg-card px-3 py-1.5 rounded-sm hover:bg-secondary">
                      إظهار جميع المصوّرات
                    </button>
                  )}
                  {hasFilters && (
                    <button onClick={clearAll} className="inline-flex items-center gap-2 bg-charcoal text-ivory px-5 py-2 rounded-sm hover:opacity-90 text-sm">
                      <X className="h-4 w-4" /> مسح كل الفلاتر
                    </button>
                  )}
                </div>
              }
            />
            {city && city !== "عمان" && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-md mx-auto bg-gold/10 border border-gold/20 rounded-sm p-4 text-center">
                <p className="text-sm text-foreground">
                  💡 <strong>تلميح:</strong> لم تجدي طلبكِ في <span className="font-bold">{city}</span>؟ العديد من مصوّرات عمّان يغطّين المحافظات الأخرى (قد تُضاف رسوم تنقّل بسيطة).
                </p>
                <button onClick={() => setCity("عمان")} className="mt-3 text-xs bg-background border border-border px-4 py-1.5 rounded-sm hover:bg-secondary transition">
                  جربي البحث في عمّان
                </button>
              </motion.div>
            )}
            {maxPrice && Number(maxPrice) <= 100 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-md mx-auto bg-amber-50 border border-amber-200 text-amber-800 rounded-sm p-4 text-center">
                <p className="text-sm">
                  💡 <strong>تلميح الميزانية:</strong> باقات تصوير الأعراس الاحترافية في الأردن تبدأ عادةً من 150 د.أ.
                </p>
                <button onClick={() => { setMaxPrice("150"); setMinPrice(""); }} className="mt-3 text-xs bg-background border border-border px-4 py-1.5 rounded-sm hover:bg-secondary transition">
                  رفع الحد الأعلى إلى 150 د.أ
                </button>
              </motion.div>
            )}
          </div>
        ) : (
          <motion.div
            className="columns-1 sm:columns-2 lg:columns-3 gap-4 -mx-4 sm:mx-0"
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
    </PullToRefresh>
  );
}

function BentoPhotographerCard({ p, idx }: { p: SearchResultItem; idx: number }) {
  const [isFav, setIsFav] = useState(false);

  useEffect(() => {
    try {
      const favs = JSON.parse(localStorage.getItem("memoria_favs") || "[]");
      setIsFav(favs.includes(p.username));
    } catch {}
  }, [p.username]);

  const toggleFav = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const favs = JSON.parse(localStorage.getItem("memoria_favs") || "[]");
      let newFavs;
      if (favs.includes(p.username)) {
        newFavs = favs.filter((f: string) => f !== p.username);
        setIsFav(false);
      } else {
        newFavs = [...favs, p.username];
        setIsFav(true);
      }
      localStorage.setItem("memoria_favs", JSON.stringify(newFavs));
    } catch {}
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ delay: Math.min(idx * 0.055, 0.4), duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="break-inside-avoid mb-4"
    >
      <Link
        to="/photographers/$username"
        params={{ username: p.username }}
        className="block"
      >
        <motion.div
          whileHover={{ scale: 1.015, y: -3 }}
          whileTap={{ scale: 0.985 }}
          transition={{ type: "spring", stiffness: 380, damping: 28 }}
          className="relative overflow-hidden sm:rounded-sm cursor-pointer group bg-gradient-royal border-b sm:border-0 border-border/5"
          style={{ aspectRatio: "3/4" }}
        >
          <button
            onClick={toggleFav}
            className="absolute top-3 end-3 z-20 h-9 w-9 bg-background/50 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-background/80 transition shadow-sm"
          >
            <motion.div
              initial={false}
              animate={isFav ? { scale: [1, 1.4, 1] } : { scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <Heart className={`h-4 w-4 ${isFav ? "fill-gold text-gold" : "text-foreground"}`} />
            </motion.div>
          </button>
          
          {p.cover_url ? (
            <img
              src={p.cover_url}
              alt={p.display_name ?? p.username}
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover
                         transition-transform duration-700 will-change-transform
                         group-hover:scale-105"
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center
                            text-muted-foreground/40 font-serif text-4xl">
              {(p.display_name ?? p.username).charAt(0)}
            </div>
          )}

          {/* Cinematic gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t
                          from-black/75 via-black/20 to-transparent
                          opacity-80 group-hover:opacity-90 transition-opacity duration-300" />

          {/* Content */}
          <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5">
            <h3 className="font-serif text-lg sm:text-xl text-white leading-tight truncate flex items-center gap-2">
              {p.display_name ?? p.username}
              {p.verification_status === 'verified' && (
                <BadgeCheck className="w-5 h-5 text-sky-400 shrink-0" aria-label="موثّقة" />
              )}
            </h3>
            {p.city && (
              <p className="text-white/65 text-sm mt-0.5 flex items-center gap-1">
                <MapPin className="h-3 w-3 shrink-0" />
                {p.city}
              </p>
            )}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {p.avg_rating > 0 && (
                <span className="inline-flex items-center gap-1 text-xs
                                 bg-black/40 backdrop-blur-sm text-white/90
                                 px-2 py-0.5 rounded-full">
                  <Star className="h-3 w-3 fill-gold text-gold" />
                  {p.avg_rating.toFixed(1)}
                  {p.review_count > 0 && (
                    <span className="text-white/50">({p.review_count})</span>
                  )}
                </span>
              )}
              {p.min_price != null && (
                <span className="text-xs text-white/55">
                  من {p.min_price} د.أ
                </span>
              )}
            </div>
          </div>

          {/* Featured badge */}
          {p.is_featured && (
            <div className="absolute top-3 right-3 text-[10px] uppercase
                            tracking-widest bg-gold/90 text-white px-2 py-0.5
                            rounded-full backdrop-blur-sm">
              مميّز ✦
            </div>
          )}
        </motion.div>
      </Link>
    </motion.div>
  );
}