import { useEffect, useState, type ReactNode } from "react";
import { X, Star, BadgeCheck, Loader2 } from "lucide-react";
import { type SearchResultItem } from "@/lib/search.functions";
import { getCompareDetails, type CompareDetails } from "@/lib/compare.functions";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { Drawer } from "vaul";
import { playSound } from "@/lib/sounds";

const jod = (n: number) => `${n.toLocaleString("en")} د.أ`;

type Criterion = {
  label: string;
  hint?: string;
  cell: (d: CompareDetails) => ReactNode;
  /** numeric value to rank on (null = not comparable) and which way is better */
  score?: (d: CompareDetails) => number | null;
  better?: "low" | "high";
};

const CRITERIA: Criterion[] = [
  { label: "السعر يبدأ من", score: (d) => d.min_price, better: "low",
    cell: (d) => (d.min_price != null ? <span className="font-medium text-gold">{jod(d.min_price)}</span> : "—") },
  { label: "أغلى باقة", cell: (d) => (d.max_price != null ? jod(d.max_price) : "—") },
  { label: "عدد الباقات", score: (d) => d.packages.length || null, better: "high",
    cell: (d) => (d.packages.length ? `${d.packages.length} باقات` : "—") },
  { label: "الخدمات", cell: (d) => (d.services.length ? d.services.map((x) => (x === "video" ? "فيديو" : "تصوير")).join(" + ") : "—") },
  { label: "العربون لتأكيد الحجز", hint: "على أرخص باقة", score: (d) => d.deposit_on_min, better: "low",
    cell: (d) => (
      <span>
        {d.deposit_label}
        {d.deposit_on_min != null && <span className="block text-xs text-muted-foreground">≈ {jod(d.deposit_on_min)}</span>}
      </span>
    ) },
  { label: "التنقّل", hint: "مسافة مجانية", score: (d) => d.free_km, better: "high",
    cell: (d) => (
      <span>
        {d.free_km != null ? `مجاناً حتى ${d.free_km} كم` : "—"}
        {d.travel_fee_per_km != null && <span className="block text-xs text-muted-foreground">ثم {d.travel_fee_per_km} د.أ/كم</span>}
      </span>
    ) },
  { label: "صور في المعرض", score: (d) => d.portfolio_count || null, better: "high", cell: (d) => d.portfolio_count || "—" },
  { label: "التقييم", score: (d) => d.avg_rating, better: "high",
    cell: (d) =>
      d.avg_rating != null ? (
        <span className="inline-flex items-center gap-1 font-medium">{d.avg_rating.toFixed(1)} <Star className="h-3.5 w-3.5 fill-gold text-gold" /></span>
      ) : (
        <span className="text-muted-foreground">لا تقييمات بعد</span>
      ) },
  { label: "عدد المراجعات", score: (d) => d.review_count || null, better: "high", cell: (d) => d.review_count || "—" },
  { label: "حجوزات مكتملة عبر ميموريا", score: (d) => d.completed_count || null, better: "high", cell: (d) => d.completed_count || "—" },
  { label: "التوثيق", score: (d) => (d.verified ? 1 : 0), better: "high",
    cell: (d) =>
      d.verified ? (
        <span className="inline-flex items-center gap-1 text-sky-500"><BadgeCheck className="h-4 w-4" /> موثّقة</span>
      ) : (
        <span className="text-muted-foreground">غير موثّقة</span>
      ) },
  { label: "على ميموريا منذ",
    cell: (d) => (d.member_since ? new Date(d.member_since).toLocaleDateString("ar-JO", { month: "long", year: "numeric" }) : "—") },
];

/** usernames holding the best value in a row; none when the row can't separate them */
function bestOf(rows: CompareDetails[], c: Criterion): Set<string> {
  if (!c.score || !c.better) return new Set();
  const vals = rows.map((d) => [d.username, c.score!(d)] as const).filter(([, v]) => v != null) as [string, number][];
  if (vals.length < 2 || new Set(vals.map(([, v]) => v)).size < 2) return new Set();
  const target = c.better === "low" ? Math.min(...vals.map(([, v]) => v)) : Math.max(...vals.map(([, v]) => v));
  return new Set(vals.filter(([, v]) => v === target).map(([u]) => u));
}

function CompareTable({ usernames, onRemove }: { usernames: string[]; onRemove: (u: string) => void }) {
  const fetchDetails = useServerFn(getCompareDetails);
  const [rows, setRows] = useState<CompareDetails[] | null>(null);
  const [failed, setFailed] = useState(false);
  const key = usernames.join(",");
  useEffect(() => {
    let live = true;
    setFailed(false);
    fetchDetails({ data: { usernames } })
      .then((r) => live && setRows(r))
      .catch(() => live && setFailed(true));
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (failed) return <p className="p-8 text-center text-sm text-muted-foreground">تعذّر تحميل المقارنة. حاولي مجدداً.</p>;
  if (!rows) return <div className="grid place-items-center p-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  if (rows.length < 2) return <p className="p-8 text-center text-sm text-muted-foreground">اختاري مصوّرتين على الأقل للمقارنة.</p>;

  const pick = (c: Criterion) => rows.filter((d) => bestOf(rows, c).has(d.username)).map((d) => d.display_name);
  const cheapest = pick(CRITERIA[0]);
  const topRated = pick(CRITERIA[7]);
  const mostDone = pick(CRITERIA[9]);

  return (
    <div className="space-y-5">
      {/* the answer first: who wins on what */}
      <div className="flex flex-wrap gap-2 text-xs">
        {cheapest.length > 0 && <span className="rounded-full bg-gold/15 px-3 py-1.5 text-foreground">الأوفر سعراً: <b>{cheapest.join("، ")}</b></span>}
        {topRated.length > 0 && <span className="rounded-full bg-gold/15 px-3 py-1.5 text-foreground">الأعلى تقييماً: <b>{topRated.join("، ")}</b></span>}
        {mostDone.length > 0 && <span className="rounded-full bg-gold/15 px-3 py-1.5 text-foreground">الأكثر حجوزات مكتملة: <b>{mostDone.join("، ")}</b></span>}
        {!cheapest.length && !topRated.length && !mostDone.length && (
          <span className="text-muted-foreground">الأرقام متقاربة — قارني المعارض والباقات بنفسكِ.</span>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="bg-card">
              <th className="sticky start-0 z-10 w-36 bg-card p-3" />
              {rows.map((d) => (
                <th key={d.username} className="min-w-[170px] border-s border-border p-3 align-top font-normal">
                  <div className="relative flex flex-col items-center gap-2 text-center">
                    <button
                      onClick={() => onRemove(d.username)}
                      className="absolute -top-1 end-0 rounded-full p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
                      aria-label={`إزالة ${d.display_name}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                    <img src={d.avatar_url || "/brand/mark.svg"} alt="" className="h-14 w-14 rounded-full border border-border object-cover" />
                    <div className="font-serif text-base font-semibold leading-tight">{d.display_name}</div>
                    <div className="text-xs text-muted-foreground">{d.city || "الأردن"}</div>
                    {d.is_demo && <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">نسخة تجريبية</span>}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CRITERIA.map((c) => {
              const best = bestOf(rows, c);
              return (
                <tr key={c.label} className="border-t border-border">
                  <th scope="row" className="sticky start-0 z-10 bg-background p-3 text-start text-xs font-medium text-muted-foreground">
                    {c.label}
                    {c.hint && <span className="block font-normal opacity-70">{c.hint}</span>}
                  </th>
                  {rows.map((d) => (
                    <td
                      key={d.username}
                      className={`border-s border-border p-3 text-center align-middle transition-colors ${best.has(d.username) ? "bg-gold/10" : ""}`}
                    >
                      {c.cell(d)}
                      {best.has(d.username) && (
                        <span className="mt-1 block text-[11px] font-semibold uppercase tracking-wider text-gold">الأفضل</span>
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
            <tr className="border-t border-border">
              <th className="sticky start-0 z-10 bg-background p-3" />
              {rows.map((d) => (
                <td key={d.username} className="border-s border-border p-3">
                  <Link
                    to="/photographers/$username"
                    params={{ username: d.username }}
                    className="block rounded-md bg-charcoal py-2 text-center text-sm font-medium text-ivory transition-opacity hover:opacity-90 dark:bg-gold dark:text-charcoal"
                    onClick={() => playSound("tick")}
                  >
                    عرض الملف والباقات
                  </Link>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        «الأفضل» يُحسب من بيانات المصوّرات على ميموريا فقط. التقييمات والحجوزات المكتملة تأتي من حجوزات حقيقية عبر المنصّة.
      </p>
    </div>
  );
}

export function CompareMode({
  compareList,
  setCompareList
}: {
  compareList: SearchResultItem[];
  setCompareList: React.Dispatch<React.SetStateAction<SearchResultItem[]>>;
}) {
  if (compareList.length === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 z-50 pointer-events-none">
      <div className="max-w-md mx-auto bg-card border border-border shadow-elegant rounded-full p-2 flex items-center justify-between pointer-events-auto backdrop-blur-md bg-card/90">
        <div className="flex items-center gap-2 pl-4">
          <div className="flex -space-x-3 rtl:space-x-reverse">
            {compareList.map((item, i) => (
              <img 
                key={item.username} 
                src={item.avatar_url || "https://images.unsplash.com/photo-1516274626895-055a99214f08?q=80&w=200&auto=format&fit=crop"} 
                alt={item.display_name}
                className="w-8 h-8 rounded-full border-2 border-background object-cover"
                style={{ zIndex: 10 - i }}
              />
            ))}
          </div>
          <span className="text-sm font-medium pr-2">
            {compareList.length}/3 للمقارنة
          </span>
        </div>
        
        <div className="flex items-center gap-2 pr-2">
          <Drawer.Root>
            <Drawer.Trigger asChild>
              <button 
                className="bg-gold text-charcoal px-4 py-2 rounded-full text-sm font-medium hover:bg-gold/90 transition-colors shadow-soft"
                onClick={() => playSound('tick')}
              >
                قارني الآن
              </button>
            </Drawer.Trigger>
            <Drawer.Portal>
              <Drawer.Overlay className="fixed inset-0 bg-black/60 z-[99]" />
              <Drawer.Content className="bg-background flex flex-col rounded-t-[20px] h-[85vh] mt-24 fixed bottom-0 left-0 right-0 z-[100] outline-none">
                <div className="p-4 bg-card border-b border-border flex justify-between items-center rounded-t-[20px]">
                  <h2 className="font-serif text-xl font-bold">مقارنة المصورات</h2>
                  <button onClick={() => setCompareList([])} className="text-sm text-muted-foreground hover:text-foreground">
                    إفراغ الكل
                  </button>
                </div>
                
                <div className="flex-1 overflow-auto p-4">
                  <CompareTable
                    usernames={compareList.map((p) => p.username)}
                    onRemove={(u) => {
                      setCompareList((prev) => prev.filter((p) => p.username !== u));
                      playSound("tick");
                    }}
                  />
                  {compareList.length < 3 && (
                    <p className="mt-4 text-center text-xs text-muted-foreground">يمكنكِ إضافة {3 - compareList.length} مصوّرة أخرى من نتائج البحث.</p>
                  )}
                </div>
              </Drawer.Content>
            </Drawer.Portal>
          </Drawer.Root>
          
          <button 
            className="w-8 h-8 rounded-full bg-secondary/80 flex items-center justify-center hover:bg-secondary text-muted-foreground transition-colors"
            onClick={() => {
              setCompareList([]);
              playSound('tick');
            }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
