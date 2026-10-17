import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Share2, Download } from "lucide-react";
import { toast } from "sonner";
import { Header } from "@/components/site/Header";
import { BackToDashboard } from "@/components/site/BackToDashboard";
import { PageLoader } from "@/components/ui/loading";
import { getYearRecap, type YearRecap } from "@/lib/recap.functions";
import { g } from "@/hooks/use-gender";

export const Route = createFileRoute("/_authenticated/dashboard/recap")({ component: RecapPage });

const MONTHS = ["كانون الثاني", "شباط", "آذار", "نيسان", "أيار", "حزيران", "تموز", "آب", "أيلول", "تشرين الأول", "تشرين الثاني", "كانون الأول"];
const DAYS = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const ar = (n: number) => n.toLocaleString("ar-JO");

/** البطاقات التي تظهر في الصفحة وفي صورة الستوري — أرقام عامة فقط، بلا مبالغ. */
function facts(r: YearRecap) {
  const out: { value: string; label: string }[] = [
    { value: ar(r.events), label: r.events === 1 ? "مناسبة وثّقتها" : "مناسبة وثّقتها" },
  ];
  if (r.photos > 0) out.push({ value: ar(r.photos), label: "صورة سلّمتها" });
  if (r.hours > 0) out.push({ value: ar(r.hours), label: "ساعة خلف الكاميرا" });
  if (r.venues > 1) out.push({ value: ar(r.venues), label: "مكاناً مختلفاً" });
  if (r.topMonth !== null) out.push({ value: MONTHS[r.topMonth], label: "أكثر شهر ازدحاماً" });
  if (r.topWeekday !== null) out.push({ value: DAYS[r.topWeekday], label: "يومي المفضّل للأعراس" });
  if (r.avgRating && r.reviews > 0) out.push({ value: `${r.avgRating.toLocaleString("ar-JO")} ★`, label: `من ${ar(r.reviews)} تقييم` });
  return out;
}

function RecapPage() {
  const fetchRecap = useServerFn(getYearRecap);
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);
  const [r, setR] = useState<YearRecap | null>(null);
  const [busy, setBusy] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    setR(null);
    fetchRecap({ data: { year } }).then(setR).catch((e) => toast.error(e?.message || "تعذّر تحميل الملخص"));
  }, [year]);

  if (!r) return <PageLoader />;
  const list = facts(r);

  const makeImage = async (): Promise<Blob> => {
    await document.fonts?.ready;
    const c = canvasRef.current!;
    drawStory(c, r, list);
    return await new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("png"))), "image/png"));
  };

  const share = async () => {
    setBusy(true);
    try {
      const blob = await makeImage();
      const file = new File([blob], `memoria-${r.year}.png`, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `سنتي ${r.year} مع Memoria` });
      } else {
        download(blob, r.year);
        toast.success(g("حُفظت الصورة — ارفعيها كستوري على إنستغرام", "حُفظت الصورة — ارفعها كستوري على إنستغرام"));
      }
    } catch (e: any) {
      if (e?.name !== "AbortError") toast.error("تعذّر إنشاء الصورة");
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    setBusy(true);
    try { download(await makeImage(), r.year); } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-background pb-24 sm:pb-0">
      <Header />
      <section className="container-editorial max-w-xl py-8">
        <BackToDashboard />
        <div className="mt-2 flex items-end justify-between gap-3">
          <div>
            <div className="text-xs tracking-[0.3em] text-gold">ملخّص السنة</div>
            <h1 className="font-serif text-4xl">سنتي {ar(r.year)}</h1>
          </div>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            aria-label="السنة"
            className="min-h-11 rounded-full border border-border bg-background px-4 text-sm"
          >
            {[thisYear, thisYear - 1, thisYear - 2].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        {r.events === 0 ? (
          <p className="mt-10 rounded-2xl border border-dashed border-border p-8 text-center text-muted-foreground">
            لا مناسبات مؤكَّدة في {ar(r.year)} بعد. سيمتلئ ملخّصك مع أول حجز.
          </p>
        ) : (
          <>
            <p className="mt-3 text-sm text-muted-foreground">
              {g("بطاقة جاهزة للمشاركة على إنستغرام. لا تظهر فيها أي مبالغ أو أسماء عميلات.", "بطاقة جاهزة للمشاركة على إنستغرام. لا تظهر فيها أي مبالغ أو أسماء عميلات.")}
            </p>
            <ul className="mt-6 grid grid-cols-2 gap-3">
              {list.map((f, i) => (
                <motion.li
                  key={f.label}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className={`rounded-2xl border border-border bg-card p-4 ${i === 0 ? "col-span-2 border-gold/40 bg-gold/5" : ""}`}
                >
                  <div className={`font-serif ${i === 0 ? "text-5xl text-gold" : "text-2xl"}`}>{f.value}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{f.label}</div>
                </motion.li>
              ))}
            </ul>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button onClick={share} disabled={busy} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-charcoal text-sm font-medium text-ivory disabled:opacity-60 dark:bg-gold dark:text-charcoal">
                <Share2 className="h-4 w-4" /> مشاركة ستوري
              </button>
              <button onClick={save} disabled={busy} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-border text-sm">
                <Download className="h-4 w-4" /> حفظ الصورة
              </button>
            </div>
          </>
        )}
        {/* لوحة الرسم مخفية — تُنتج صورة 1080×1920 لستوري إنستغرام */}
        <canvas ref={canvasRef} width={1080} height={1920} className="hidden" aria-hidden />
      </section>
    </div>
  );
}

function download(blob: Blob, year: number) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `memoria-${year}.png`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** يرسم بطاقة الستوري يدوياً على canvas (بلا مكتبات): خلفية داكنة، أرقام ذهبية، اسم المصوّرة ورابطها. */
function drawStory(c: HTMLCanvasElement, r: YearRecap, list: { value: string; label: string }[]) {
  const ctx = c.getContext("2d")!;
  const W = c.width, H = c.height;
  const css = getComputedStyle(document.documentElement);
  const serif = css.getPropertyValue("--font-serif").trim() || "serif";
  const sans = getComputedStyle(document.body).fontFamily || "sans-serif";
  const gold = "#C9A227", ivory = "#F5F0E6", muted = "rgba(245,240,230,0.6)";

  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#1c1814");
  bg.addColorStop(1, "#0f0d0b");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W * 0.75, 260, 0, W * 0.75, 260, 700);
  glow.addColorStop(0, "rgba(201,162,39,0.22)");
  glow.addColorStop(1, "rgba(201,162,39,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  ctx.direction = "rtl";
  ctx.textAlign = "center";

  ctx.fillStyle = gold;
  ctx.font = `500 40px ${sans}`;
  ctx.fillText("ملخّص السنة", W / 2, 230);
  ctx.fillStyle = ivory;
  ctx.font = `700 150px ${serif}`;
  ctx.fillText(`سنتي ${r.year.toLocaleString("ar-JO")}`, W / 2, 400);
  ctx.fillStyle = muted;
  ctx.font = `400 46px ${sans}`;
  ctx.fillText(r.name, W / 2, 490);

  // الرقم الأبرز
  const [hero, ...rest] = list;
  ctx.fillStyle = gold;
  ctx.font = `700 260px ${serif}`;
  ctx.fillText(hero.value, W / 2, 820);
  ctx.fillStyle = ivory;
  ctx.font = `500 54px ${sans}`;
  ctx.fillText(hero.label, W / 2, 910);

  // شبكة 2×3 لبقية الأرقام
  const cells = rest.slice(0, 6);
  const colW = 440, rowH = 230, top = 1040;
  cells.forEach((f, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const cx = W / 2 + (col === 0 ? colW / 2 + 20 : -(colW / 2 + 20));
    const cy = top + row * rowH;
    ctx.strokeStyle = "rgba(201,162,39,0.35)";
    ctx.lineWidth = 2;
    roundRect(ctx, cx - colW / 2, cy - 80, colW, 190, 32);
    ctx.stroke();
    ctx.fillStyle = ivory;
    ctx.font = `700 ${f.value.length > 8 ? 52 : 68}px ${serif}`;
    ctx.fillText(f.value, cx, cy + 10);
    ctx.fillStyle = muted;
    ctx.font = `400 34px ${sans}`;
    ctx.fillText(f.label, cx, cy + 70);
  });

  ctx.fillStyle = gold;
  ctx.font = `600 44px ${serif}`;
  ctx.fillText("Memoria · ميموريا", W / 2, H - 170);
  if (r.username) {
    ctx.fillStyle = muted;
    ctx.direction = "ltr";
    ctx.font = `400 34px ${sans}`;
    ctx.fillText(`@${r.username}`, W / 2, H - 110);
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
