import { useHideOnScroll } from "@/hooks/use-hide-on-scroll";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { forwardRef, useEffect, useMemo, useState } from "react";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { Search, MapPin, Star, X, SlidersHorizontal, BadgeCheck, Heart } from "lucide-react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { GridSkeleton } from "@/components/ui/loading";
import { SkeletonCard } from "@/components/ui/SkeletonCard";
import { EmptyState } from "@/components/ui/empty-state";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PullToRefresh } from "@/components/ui/pull-to-refresh";
import { hapticVibrate } from "@/lib/utils";
import {
  searchPhotographers,
  listPublishedCities,
  type SearchResultItem,
  type SearchSort,
} from "@/lib/search.functions";
import { Drawer } from "vaul";
import { CompareMode } from "@/components/search/CompareMode";
import { typoCorrect } from "@/lib/searchUtils";
import { playSound } from "@/lib/sounds";
import { BarChart2 } from "lucide-react";
import { t as tr, tx, locale } from "@/i18n";

export const Route = createFileRoute("/search")({
  component: SearchPage,
  head: () => ({
    meta: [
      { title: tr("مصوّرات أعراس في الأردن — ابحثي واحجزي | Memoria") },
      {
        name: "description",
        content:
          tr("اعثري على مصوّر عرسك المثالي في الأردن. فلترة بالمدينة والسعر والتاريخ المتاح وتقييمات حقيقية من العرائس."),
      },
    ],
    links: [{ rel: "canonical", href: "https://memoria-production.ahmad000haddad.workers.dev/search" }],
  }),
});

function SearchPage() {
  const barHidden = useHideOnScroll();
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
  const [compareList, setCompareList] = useState<SearchResultItem[]>([]);
  const [availableThisWeek, setAvailableThisWeek] = useState(false);
  const [isTypoCorrected, setIsTypoCorrected] = useState(false);
  const [originalQuery, setOriginalQuery] = useState("");
  const [skipTypo, setSkipTypo] = useState(false);
  const [favsOnly, setFavsOnly] = useState(false);
  const [favs, setFavs] = useState<string[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [lastSearch, setLastSearch] = useState<{ city?: string; maxPrice?: string; date?: string } | null>(null);

  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      const c = sp.get("city"); const d = sp.get("date");
      if (c) setCity(c);
      if (d && d >= new Date().toISOString().slice(0, 10)) setDate(d);
    } catch { /* ignore */ }
    try {
      setFavs(JSON.parse(localStorage.getItem("memoria_favs") || "[]"));
      const ls = JSON.parse(localStorage.getItem("memoria_last_search") || "null");
      if (ls && (ls.city || ls.maxPrice || ls.date)) setLastSearch(ls);
    } catch { /* ignore */ }
    const onFav = () => { try { setFavs(JSON.parse(localStorage.getItem("memoria_favs") || "[]")); } catch { /* ignore */ } };
    window.addEventListener("memoria-favs-change", onFav);
    return () => window.removeEventListener("memoria-favs-change", onFav);
  }, []);
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

  const correctedQ = useMemo(() => {
    if (skipTypo) { setIsTypoCorrected(false); return debouncedQ; }
    const fixed = typoCorrect(debouncedQ);
    if (fixed !== debouncedQ && debouncedQ.length > 2) {
      setIsTypoCorrected(true);
      setOriginalQuery(debouncedQ);
      return fixed;
    }
    if (fixed === debouncedQ) setIsTypoCorrected(false);
    return debouncedQ;
  }, [debouncedQ, skipTypo]);
  useEffect(() => { setSkipTypo(false); }, [q]);

  // تذكّر آخر بحث (المدينة والميزانية والتاريخ) لاقتراحه في الزيارة القادمة
  useEffect(() => {
    if (!city && !maxPrice && !date) return;
    try { localStorage.setItem("memoria_last_search", JSON.stringify({ city, maxPrice, date })); } catch { /* ignore */ }
  }, [city, maxPrice, date]);

  const resultsQ = useQuery({
    queryKey: ["search", correctedQ, city, minPrice, maxPrice, date, sort],
    queryFn: () =>
      runSearch({
        data: {
          q: correctedQ || undefined,
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

  const displayResults = results
    .filter((r) => (minRating > 0 ? r.avg_rating >= minRating : true))
    .filter((r) => (verifiedOnly ? r.verification_status === "verified" : true))
    .filter((r) => (favsOnly ? favs.includes(r.username) : true));

  const hasFilters = useMemo(
    () => !!(city || minPrice || maxPrice || date || debouncedQ || minRating > 0 || verifiedOnly || favsOnly),
    [city, minPrice, maxPrice, date, debouncedQ, minRating, verifiedOnly, favsOnly],
  );

  const clearAll = () => {
    hapticVibrate("light");
    setQ("");
    setCity("");
    setMinPrice("");
    setMaxPrice("");
    setDate("");
    setSort("featured");
    setMinRating(0);
    setVerifiedOnly(false);
    setFavsOnly(false);
  };

  // شرائح الفلاتر النشطة — كل شريحة تُزال بنقرة
  const activeChips = [
    city && { k: "city", label: city, clear: () => setCity("") },
    date && { k: "date", label: new Date(date).toLocaleDateString(locale("ar-JO"), { day: "numeric", month: "long" }), clear: () => setDate("") },
    (minPrice || maxPrice) && { k: "price", label: minPrice && maxPrice ? tr("{0}–{1} د.أ", [minPrice, maxPrice]) : minPrice ? tr("من {0} د.أ", [minPrice]) : tr("حتى {0} د.أ", [maxPrice]), clear: () => { setMinPrice(""); setMaxPrice(""); } },
    minRating > 0 && { k: "rating", label: tr("{0}+ نجوم", [minRating]), clear: () => setMinRating(0) },
    verifiedOnly && { k: "verified", label: tr("موثّقة"), clear: () => setVerifiedOnly(false) },
    favsOnly && { k: "favs", label: tr("مفضّلتي"), clear: () => setFavsOnly(false) },
  ].filter(Boolean) as { k: string; label: string; clear: () => void }[];
  const drawerFilterCount = [date, minPrice || maxPrice, sort !== "featured"].filter(Boolean).length;

  // Idea 6: Scroll-to-Top Button
  const [showScroll, setShowScroll] = useState(false);
  useEffect(() => {
    const onScroll = () => setShowScroll(window.scrollY > 800);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <PullToRefresh onRefresh={async () => {
      hapticVibrate("light");
      await queryClient.invalidateQueries({ queryKey: ["search"] });
      hapticVibrate("success");
    }}>
      <div className="min-h-screen bg-background sm:pb-0 pb-20">
        <div className="hidden sm:block">
          <Header />
        </div>
        
        <section className="container-editorial py-6 sm:py-10 md:py-12">
          {/* Mobile Large Title */}
          <div className="sm:hidden mb-6 px-2">
            <p className="font-serif text-3xl font-bold">{tr("البحث")}</p>
          </div>

          <div className="hidden sm:block text-center mb-6 md:mb-8">
            <div className="text-xs uppercase tracking-[0.3em] text-gold mb-2">{tr("دليل المصوّرين")}</div>
            <h1 className="font-serif text-3xl md:text-4xl">{tr("اعثري على مصوّرة عرسك")}</h1>
            <p className="text-sm text-muted-foreground mt-2">
            {results.length > 0
              ? tr("{0} مصوّرة متاحة{1}", [displayResults.length, hasFilters ? " ضمن فلترك" : ""])
              : tr("أدخلي مدينتك أو ميزانيتك أو تاريخ حفلك لنُريك المصوّرات المتاحات.")}
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
          className={`sm:rounded-md sm:border sm:border-border bg-card p-3 sm:p-4 md:p-5 mb-4 sm:mb-6 md:mb-8 sm:shadow-soft sticky top-0 z-30 transition-transform duration-300 ease-out ${barHidden ? "-translate-y-full sm:translate-y-0" : ""} sm:relative sm:top-auto sm:z-auto border-b border-border sm:border-b-0 -mx-4 sm:mx-0 px-4 sm:px-4`}
        >
      <fieldset className="grid gap-3 md:grid-cols-12" aria-label={tr("فلاتر البحث الأساسية")}>
            <div className="md:col-span-4 relative flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute top-1/2 -translate-y-1/2 start-3 h-4 w-4 text-muted-foreground" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={tr("اسم المصوّرة، @المستخدم…")}
                  autoCapitalize="none"
                  autoCorrect="off"
                  autoComplete="off"
                  spellCheck={false}
                  className="w-full sm:rounded-sm rounded-full sm:border border-transparent sm:border-input bg-secondary/50 sm:bg-background ps-9 pe-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/60"
                  aria-label={tr("كلمات مفتاحية للبحث")}
                />
              </div>
              
              {/* Mobile filter drawer trigger inside search row */}
              <div className="sm:hidden">
                <Drawer.Root open={drawerOpen} onOpenChange={setDrawerOpen}>
                  <Drawer.Trigger asChild>
                    <button type="button" aria-label={tr("الفلاتر")} className="relative flex items-center justify-center w-10 h-10 rounded-full bg-secondary/50 text-foreground touch-card">
                      {drawerFilterCount > 0 && <span className="absolute -top-1 -end-1 grid h-4 min-w-4 place-items-center rounded-full bg-gold px-1 text-[9px] font-bold text-charcoal">{tx(drawerFilterCount)}</span>}
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/></svg>
                    </button>
                  </Drawer.Trigger>
                  <Drawer.Portal>
                    <Drawer.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-md z-40 transition-all duration-300" />
                    <Drawer.Content className="fixed bottom-0 end-0 start-0 z-50 rounded-t-2xl bg-background border-t border-border pb-safe">
                      <div className="mx-auto w-12 h-1.5 rounded-full bg-border mt-3 mb-4" />
                      <div className="px-4 pb-6 space-y-4 max-h-[80vh] overflow-y-auto">
                        <h2 className="text-base font-semibold mb-2">{tr("الفلاتر")}</h2>
                        <div className="space-y-2">
                          <label htmlFor="search-date" className="text-xs text-muted-foreground">{tr("تاريخ العرس — نعرض المتاحات فيه فقط")}</label>
                          <input
                            id="search-date"
                            type="date"
                            value={date}
                            min={new Date().toISOString().slice(0, 10)}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full rounded-sm border border-input bg-background px-3 py-2.5 text-sm"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs text-muted-foreground">{tr("السعر")}</label>
                          <div className="flex gap-2">
                            <input
                              type="number"
                              inputMode="numeric"
                              min={0}
                              value={minPrice}
                              onChange={(e) => setMinPrice(e.target.value)}
                              placeholder={tr("من")}
                              className="w-1/2 rounded-sm border border-input bg-background px-3 py-2.5 text-sm"
                            />
                            <input
                              type="number"
                              inputMode="numeric"
                              min={0}
                              value={maxPrice}
                              onChange={(e) => setMaxPrice(e.target.value)}
                              placeholder={tr("إلى")}
                              className="w-1/2 rounded-sm border border-input bg-background px-3 py-2.5 text-sm"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label htmlFor="search-sort-m" className="text-xs text-muted-foreground">{tr("الترتيب")}</label>
                          <select id="search-sort-m" value={sort} onChange={(e) => setSort(e.target.value as any)} className="w-full rounded-sm border border-input bg-background px-3 py-2.5 text-sm">
                            <option value="featured">{tr("الأبرز")}</option>
                            <option value="rating">{tr("الأعلى تقييماً")}</option>
                            <option value="price_asc">{tr("الأقل سعراً")}</option>
                            <option value="price_desc">{tr("الأعلى سعراً")}</option>
                          </select>
                        </div>
                        <div className="flex gap-2 pt-2">
                          {drawerFilterCount > 0 && (
                            <button type="button" onClick={() => { setDate(""); setMinPrice(""); setMaxPrice(""); setSort("featured"); }} className="rounded-full border border-border px-4 py-3 text-sm">{tr("مسح")}</button>
                          )}
                          <button type="button" onClick={() => setDrawerOpen(false)} className="flex-1 rounded-full bg-charcoal py-3 text-sm font-medium text-ivory dark:bg-gold dark:text-charcoal">
                            {resultsQ.isFetching ? tr("نبحث…") : tr("عرض {0} مصوّرة", [displayResults.length])}
                          </button>
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
                aria-label={tr("المدينة")}
              >
                <option value="">{tr("كل المدن")}</option>
                {(citiesQ.data ?? []).map((c) => (
                  <option key={c} value={c}>
                    {tx(c)}
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
                placeholder={tr("السعر من")}
                className="w-full rounded-sm border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/60"
                aria-label={tr("الحد الأدنى للسعر")}
              />
            </div>
            <div className="hidden sm:block md:col-span-2">
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                placeholder={tr("إلى")}
                className="w-full rounded-sm border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/60"
                aria-label={tr("الحد الأعلى للسعر")}
              />
            </div>

            <div className="hidden sm:block md:col-span-2">
              <input
                type="date"
                value={date}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-sm border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/60"
                aria-label={tr("تاريخ المناسبة")}
              />
            </div>
          </fieldset>

          {/* Unified Mobile Quick Filters */}
          <div className="sm:hidden mt-4 -mx-4 px-4 overflow-x-auto pb-2 scrollbar-none">
            <div className="flex gap-2 w-max items-center">
              <button
                type="button"
                onClick={() => { hapticVibrate("light"); setVerifiedOnly((v) => !v); }}
                className={`min-h-10 px-4 py-2 rounded-full text-[13px] whitespace-nowrap transition-colors flex items-center gap-1 touch-card ${
                  verifiedOnly ? "bg-charcoal text-ivory font-medium" : "bg-secondary/50 text-foreground border border-border"
                }`}
              >
                <BadgeCheck className="h-3.5 w-3.5" />
                {tr("موثّقة")}
              </button>
              <button
                type="button"
                onClick={() => { hapticVibrate("light"); setMinRating((r) => (r === 4.5 ? 0 : 4.5)); }}
                className={`min-h-10 px-4 py-2 rounded-full text-[13px] whitespace-nowrap transition-colors flex items-center gap-1 touch-card ${
                  minRating === 4.5 ? "bg-charcoal text-ivory font-medium" : "bg-secondary/50 text-foreground border border-border"
                }`}
              >
                <Star className="h-3.5 w-3.5" />
                {tr("أعلى تقييم")}
              </button>
              {favs.length > 0 && (
                <button
                  type="button"
                  onClick={() => { hapticVibrate("light"); setFavsOnly((v) => !v); }}
                  className={`min-h-10 px-4 py-2 rounded-full text-[13px] whitespace-nowrap transition-colors flex items-center gap-1 touch-card ${favsOnly ? "bg-charcoal text-ivory font-medium" : "bg-secondary/50 text-foreground border border-border"}`}
                >
                  <Heart className="h-3.5 w-3.5" />{tr("مفضّلتي ({0})", [favs.length])}</button>
              )}
              <div className="w-px h-5 bg-border mx-1" />
              <button
                type="button"
                onClick={() => setCity("")}
                className={`min-h-10 px-4 py-2 rounded-full text-[13px] whitespace-nowrap transition-colors touch-card ${!city ? "bg-foreground text-background font-medium" : "bg-secondary/50 text-foreground border border-border"}`}
              >
                {tr("كل المدن")}
              </button>
              {(citiesQ.data ?? []).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCity(c)}
                  className={`min-h-10 px-4 py-2 rounded-full text-[13px] whitespace-nowrap transition-colors touch-card ${city === c ? "bg-foreground text-background font-medium" : "bg-secondary/50 text-foreground border border-border"}`}
                >
                  {tx(c)}
                </button>
              ))}
            </div>
          </div>

          <div className="hidden sm:flex flex-wrap items-center gap-3 mt-3">
            <label htmlFor="search-sort" className="text-xs text-muted-foreground">{tr("ترتيب:")}</label>
            <select
              id="search-sort"
              value={sort}
              onChange={(e) => setSort(e.target.value as SearchSort)}
              className="rounded-sm border border-input bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-gold/60"
            >
              <option value="featured">{tr("المميّزات أولاً")}</option>
              <option value="rating">{tr("الأعلى تقييماً")}</option>
              <option value="price_asc">{tr("السعر: الأقل أولاً")}</option>
              <option value="price_desc">{tr("السعر: الأعلى أولاً")}</option>
            </select>
            {hasFilters && (
              <button
                type="button"
                onClick={clearAll}
                className="ms-auto text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
              >
                <X className="h-3 w-3" />{" "}{tr("مسح الفلتر")}
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              className={`${hasFilters ? "" : "ms-auto"} text-xs inline-flex items-center gap-1 px-2 py-1 rounded-sm border border-border hover:bg-secondary transition`}
            >
              <SlidersHorizontal className="h-3 w-3" />
              {showAdvanced ? tr("إخفاء الفلاتر المتقدّمة") : tr("فلاتر متقدّمة")}
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
                  <label className="text-xs text-muted-foreground">{tr("الحد الأدنى للتقييم:")}</label>
                  {[0, 3, 4, 4.5].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setMinRating(r)}
                      className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-sm border transition ${minRating === r ? "bg-charcoal text-ivory border-charcoal" : "border-border bg-card hover:bg-secondary"}`}
                    >
                      {r === 0 ? tr("الكل") : (<><Star className="h-3 w-3 fill-gold text-gold" />{tx(r)}+</>)}
                    </button>
                  ))}
                  <span className="mx-2 h-4 w-px bg-border" />
                  <button
                    type="button"
                    onClick={() => setVerifiedOnly((v) => !v)}
                    className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-sm border transition ${verifiedOnly ? "bg-charcoal text-ivory border-charcoal" : "border-border bg-card hover:bg-secondary"}`}
                  >
                    <BadgeCheck className="h-3 w-3" />{" "}{tr("موثّقة فقط")}
                  </button>
                  {favs.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setFavsOnly((v) => !v)}
                      className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-sm border transition ${favsOnly ? "bg-charcoal text-ivory border-charcoal" : "border-border bg-card hover:bg-secondary"}`}
                    >
                      <Heart className="h-3 w-3" />{" "}{tr("مفضّلتي ({0})", [favs.length])}</button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </form>

        {/* Results */}
        {activeChips.length > 0 ? (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <motion.span
              key={resultsQ.isFetching ? "fetching" : displayResults.length}
              className="text-xs text-muted-foreground tabular-nums"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              {resultsQ.isFetching ? tr("نبحث…") : tr("{0} نتيجة", [displayResults.length])}
            </motion.span>
            <AnimatePresence initial={false}>
              {activeChips.map((c) => (
                <motion.button
                  key={c.k}
                  layout
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.6 }}
                  type="button"
                  onClick={() => { hapticVibrate("light"); c.clear(); }}
                  className="inline-flex items-center gap-1 rounded-full border border-gold/40 bg-gold/5 px-3 py-1 text-xs text-foreground hover:border-gold"
                >
                  {tx(c.label)} <X className="h-3 w-3 text-muted-foreground" />
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        ) : lastSearch ? (
          <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>{tr("آخر بحث:")}</span>
            <button
              type="button"
              onClick={() => { if (lastSearch.city) setCity(lastSearch.city); if (lastSearch.maxPrice) setMaxPrice(lastSearch.maxPrice); if (lastSearch.date && lastSearch.date >= new Date().toISOString().slice(0, 10)) setDate(lastSearch.date); }}
              className="rounded-full border border-dashed border-border px-3 py-1 hover:border-gold/50 hover:text-foreground"
            >
              {[lastSearch.city, lastSearch.maxPrice && tr("حتى {0} د.أ", [lastSearch.maxPrice]), lastSearch.date && new Date(lastSearch.date).toLocaleDateString(locale("ar-JO"), { day: "numeric", month: "short" })].filter(Boolean).join(" · ")}
            </button>
          </div>
        ) : null}
        {!date && displayResults.length > 0 && (
          <p className="mb-4 text-xs text-muted-foreground">
            {tr("لديكِ تاريخ للعرس؟")}{" "}
            <button type="button" onClick={() => setDrawerOpen(true)} className="sm:hidden text-gold hover:underline py-2 px-1">{tr("أضيفيه")}</button>
            <span className="hidden sm:inline">{tr("أضيفيه في خانة التاريخ")}</span>
            {" "}{tr("لنعرض المتاحات فيه فقط.")}
          </p>
        )}
        {isTypoCorrected && (
          <div className="col-span-full mb-4 px-4 py-2 bg-secondary/30 rounded-md text-sm">
            {tr("تم التصحيح الإملائي إلى")}{" "}<strong>{tx(correctedQ)}</strong>{" "}{tr("بدلاً من")}{" "}<span className="line-through text-muted-foreground">{tx(originalQuery)}</span>. 
            <button onClick={() => setSkipTypo(true)} className="text-gold hover:underline ms-2">{tr("ابحثي عن «{0}» كما كتبتِها", [originalQuery])}</button>
          </div>
        )}
        
        {resultsQ.isError ? (
          <div className="col-span-full text-center py-16 text-sm text-destructive">
            {tr("تعذّر تحميل النتائج. تحقّق من اتصالك وحاول مجدداً.")}
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
              title={tr("لا توجد نتائج")}
              description={tr("لم نعثر على مصوّرات تطابق فلترك الحالي. جرّبي اقتراحاتنا التالية:")}
              action={
                <div className="flex flex-col items-center gap-4">
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    {date && (
                      <button onClick={() => setDate("")} className="text-xs border border-border bg-card px-3 py-1.5 rounded-sm hover:bg-secondary">
                        {tr("إزالة التاريخ")}
                      </button>
                    )}
                    {city && (
                      <button onClick={() => setCity("")} className="text-xs border border-border bg-card px-3 py-1.5 rounded-sm hover:bg-secondary">
                        {tr("البحث في كل المدن")}
                      </button>
                    )}
                    {(minPrice || maxPrice) && (
                      <button onClick={() => { setMinPrice(""); setMaxPrice(""); }} className="text-xs border border-border bg-card px-3 py-1.5 rounded-sm hover:bg-secondary">
                        {tr("إزالة السعر")}
                      </button>
                    )}
                    {verifiedOnly && (
                      <button onClick={() => setVerifiedOnly(false)} className="text-xs border border-border bg-card px-3 py-1.5 rounded-sm hover:bg-secondary">
                        {tr("إظهار جميع المصوّرات")}
                      </button>
                    )}
                    {hasFilters && (
                      <button onClick={clearAll} className="inline-flex items-center gap-2 bg-charcoal text-ivory px-5 py-2 rounded-sm hover:opacity-90 text-sm">
                        <X className="h-4 w-4" />{" "}{tr("مسح كل الفلاتر")}
                      </button>
                    )}
                  </div>
                  
                  {/* Idea 5: Empty Search Suggestions */}
                  <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                    <span className="text-xs text-muted-foreground w-full block mb-1">{tr("اقتراحات سريعة:")}</span>
                    <button onClick={() => { clearAll(); setCity(tr("عمان")); }} className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-full hover:bg-emerald-100 transition-colors">
                      {tr("استكشفي مصورات عمّان")}
                    </button>
                    <button onClick={() => { clearAll(); setQ(tr("فيديو")); }} className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 px-3 py-1.5 rounded-full hover:bg-indigo-100 transition-colors">
                      {tr("تصوير فيديو سينمائي")}
                    </button>
                    <button onClick={() => { clearAll(); setMaxPrice("300"); }} className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1.5 rounded-full hover:bg-amber-100 transition-colors">
                      {tr("أقل من 300 دينار")}
                    </button>
                  </div>
                </div>
              }
            />
            {city && city !== "عمان" && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-md mx-auto bg-gold/10 border border-gold/20 rounded-sm p-4 text-center">
                <p className="text-sm text-foreground">
                  💡 <strong>{tr("تلميح:")}</strong>{" "}{tr("لم تجدي طلبكِ في")}{" "}<span className="font-bold">{tx(city)}</span>{tr("؟ العديد من مصوّرات عمّان يغطّين المحافظات الأخرى (قد تُضاف رسوم تنقّل بسيطة).")}
                </p>
                <button onClick={() => setCity(tr("عمان"))} className="mt-3 text-xs bg-background border border-border px-4 py-1.5 rounded-sm hover:bg-secondary transition">
                  {tr("جربي البحث في عمّان")}
                </button>
              </motion.div>
            )}
            {maxPrice && Number(maxPrice) <= 100 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-md mx-auto bg-amber-50 border border-amber-200 text-amber-800 rounded-sm p-4 text-center">
                <p className="text-sm">
                  💡 <strong>{tr("تلميح الميزانية:")}</strong>{" "}{tr("باقات تصوير الأعراس الاحترافية في الأردن تبدأ عادةً من 150 د.أ.")}
                </p>
                <button onClick={() => { setMaxPrice("150"); setMinPrice(""); }} className="mt-3 text-xs bg-background border border-border px-4 py-1.5 rounded-sm hover:bg-secondary transition">
                  {tr("رفع الحد الأعلى إلى 150 د.أ")}
                </button>
              </motion.div>
            )}
          </div>
        ) : (
          // Cards keep their identity across filter changes: the ones that stay glide to
          // their new spot, dropped ones fade out, newcomers arrive in sequence.
          <LayoutGroup>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 -mx-4 sm:mx-0">
              <AnimatePresence mode="popLayout" initial={false}>
                {displayResults.map((p, idx) => (
                  <BentoPhotographerCard key={p.username} p={p} idx={idx} compareList={compareList} setCompareList={setCompareList} />
                ))}
              </AnimatePresence>
            </div>
          </LayoutGroup>
        )}
      </section>
      
      {/* Idea 6: Scroll-to-Top Button */}
      <AnimatePresence>
        {showScroll && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            aria-label={tr("العودة للأعلى")}
            className="fixed bottom-24 sm:bottom-8 start-4 sm:start-8 z-50 h-12 w-12 rounded-full bg-background/80 backdrop-blur-md border border-border shadow-[0_8px_32px_rgba(0,0,0,0.1)] flex items-center justify-center text-foreground hover:bg-background transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>
          </motion.button>
        )}
      </AnimatePresence>
      
      <Footer />
      </div>
    <CompareMode compareList={compareList} setCompareList={setCompareList} />
    </PullToRefresh>
  );
}

const BentoPhotographerCard = forwardRef<HTMLDivElement, { p: SearchResultItem; idx: number; compareList: SearchResultItem[]; setCompareList: React.Dispatch<React.SetStateAction<SearchResultItem[]>> }>(function BentoPhotographerCard({ p, idx, compareList, setCompareList }, ref) {
  const [isFav, setIsFav] = useState(false);

  useEffect(() => {
    try {
      const favs = JSON.parse(localStorage.getItem("memoria_favs") || "[]");
      setIsFav(favs.includes(p.username));
    } catch { /* ignore */ }
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
      hapticVibrate(newFavs.length > favs.length ? "success" : "light");
      window.dispatchEvent(new Event("memoria-favs-change"));
    } catch { /* ignore */ }
  };

  const ease = [0.22, 1, 0.36, 1] as const;
  return (
    <motion.div
      ref={ref}
      layout="position"
      initial={{ opacity: 0, y: 40, scale: 0.96, filter: "blur(8px)" }}
      whileInView={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
      exit={{ opacity: 0, scale: 0.92, filter: "blur(6px)", transition: { duration: 0.3, ease } }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{
        delay: Math.min((idx % 9) * 0.07, 0.5),
        duration: 0.7,
        ease,
        layout: { type: "spring", stiffness: 260, damping: 30 },
      }}
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
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              playSound('tick');
              setCompareList(prev => {
                if (prev.find(c => c.username === p.username)) return prev.filter(c => c.username !== p.username);
                if (prev.length >= 3) return prev;
                return [...prev, p];
              });
            }}
            className={`absolute top-3 end-[3.75rem] z-20 h-10 px-3 bg-background/50 backdrop-blur-md rounded-full flex items-center justify-center transition shadow-sm text-xs font-medium ${compareList.find(c => c.username === p.username) ? 'bg-gold text-charcoal' : 'hover:bg-background/80 text-foreground'}`}
          >
            <BarChart2 className="w-3 h-3 me-1" /> {compareList.find(c => c.username === p.username) ? tr("مقارنة") : tr("قارني")}
          </button>
          
          <button
            onClick={toggleFav}
            aria-label={isFav ? tr("إزالة من المفضّلة") : tr("إضافة للمفضّلة")}
            className="absolute top-3 end-3 z-20 h-10 w-10 bg-background/50 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-background/80 transition shadow-sm"
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
          <div className="absolute bottom-0 end-0 start-0 p-4 sm:p-5">
            <h3 className="font-serif text-lg sm:text-xl text-white leading-tight truncate flex items-center gap-2">
              {p.display_name ?? p.username}
              {p.verification_status === 'verified' && (
                <VerifiedBadge variant="icon" />
              )}
            </h3>
            {p.city && (
              <p className="text-white/65 text-sm mt-0.5 flex items-center gap-1">
                <MapPin className="h-3 w-3 shrink-0" />
                {tx(p.city)}
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
                    <span className="text-white/50">({tx(p.review_count)})</span>
                  )}
                </span>
              )}
              {p.min_price != null && (
                <span className="text-xs text-white/55">{tr("من {0} د.أ", [p.min_price])}</span>
              )}
            </div>
          </div>

          {p.is_demo && (
            <div className={`absolute ${p.is_featured ? "top-11" : "top-3"} start-3 z-10 text-[11px] bg-black/60 text-white px-2.5 py-1 rounded-full backdrop-blur-sm`}>
              {tr("نسخة تجريبية للمصوّرات")}
            </div>
          )}

          {/* Featured badge */}
          {p.is_featured && (
            <div className="absolute top-3 start-3 text-[11px] uppercase
                            tracking-widest bg-gold/90 text-white px-2 py-0.5
                            rounded-full backdrop-blur-sm">
              {tr("مميّز ✦")}
            </div>
          )}
        </motion.div>
      </Link>
    </motion.div>
  );
});