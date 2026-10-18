import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

/* صندوق الألعاب: أيقونتان بشكل شاشة الهاتف. اللعبة النشطة دائماً في الخانة الأولى،
   والنقر على أيقونة الأخرى يبدّلهما: اللعبة الجديدة تأخذ مكان القديمة وتتغيّر أيقونتها.
   وضع ملء الشاشة: يغطي الشاشة كلها ويمنع التمرير، وزر ✕ للخروج (ويعمل أيضاً زر الرجوع/Esc).
   المنطق الأصلي في public/game/game.js، ولعبة الفخاخ داخل public/game/traps.html.
   عند مغادرة اللعبة نلغي المستمعين عبر AbortController حتى لا تسرق المفاتيح في باقي الصفحات. */

const GAMES = [
  { id: "bride", name: "اهربي يا عروس", icon: "👰", bg: "linear-gradient(145deg,#ffc2d9,#c0589b 70%,#7a2f6e)" },
  { id: "traps", name: "طريق مليان فخاخ", icon: "🪤", bg: "linear-gradient(145deg,#5a2d63,#2b1630 75%)" },
] as const;
type GameId = (typeof GAMES)[number]["id"];

export function BrideGame() {
  const [order, setOrder] = useState<GameId[]>(["bride", "traps"]);
  const [full, setFull] = useState(false);
  const [portrait, setPortrait] = useState(false);
  const nativeFull = useRef(false);
  const active = order[0];
  const game = GAMES.find((g) => g.id === active)!;

  const pick = (id: GameId) => {
    if (id === active) return;
    setOrder((o) => [id, ...o.filter((x) => x !== id)]);
  };

  const enterFull = () => {
    setFull(true);
    // لازم يكون داخل نقرة المستخدم مباشرة. على iOS ما فيه ملء شاشة للعناصر، فنكتفي بالتغطية
    try {
      const p = document.documentElement.requestFullscreen?.();
      if (p) p.then(() => { nativeFull.current = true; }).catch(() => {});
    } catch { /* ignore */ }
    try { (screen as any).orientation?.lock?.("landscape").catch(() => {}); } catch { /* ignore */ }
  };

  const exitFull = () => {
    setFull(false);
    nativeFull.current = false;
    try { if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {}); } catch { /* ignore */ }
    try { (screen as any).orientation?.unlock?.(); } catch { /* ignore */ }
  };

  // إذا خرج المستخدم من ملء الشاشة من المتصفح (مثلاً زر الرجوع في أندرويد) نغلق الغطاء أيضاً
  useEffect(() => {
    const onChange = () => {
      if (!document.fullscreenElement && nativeFull.current) {
        nativeFull.current = false;
        setFull(false);
      }
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(orientation: portrait)");
    const upd = () => setPortrait(mq.matches);
    upd();
    mq.addEventListener("change", upd);
    return () => mq.removeEventListener("change", upd);
  }, []);

  // قفل التمرير أثناء ملء الشاشة + Esc للخروج
  useEffect(() => {
    if (!full) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") exitFull(); };
    // على iOS تجاهل overflow:hidden، فنمنع سحب الصفحة باللمس مباشرة
    const noScroll = (e: TouchEvent) => { e.preventDefault(); };
    window.addEventListener("keydown", onKey);
    document.addEventListener("touchmove", noScroll, { passive: false });
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("touchmove", noScroll);
    };
  }, [full]);

  const body = active === "bride" ? <CanvasGame full={full} /> : <TrapsGame full={full} />;

  if (full) {
    // على الهاتف العمودي نلف الشاشة 90 درجة لتصير اللعبة أفقية وتملأ الشاشة
    const boxStyle: React.CSSProperties = portrait
      ? { position: "fixed", top: 0, left: "100vw", width: "100dvh", height: "100vw", transform: "rotate(90deg)", transformOrigin: "top left" }
      : { position: "fixed", top: 0, left: 0, width: "100vw", height: "100dvh" };
    return (
      <>
        <style>{GAME_CSS}</style>
        <div data-full className="bride-game z-[80] bg-[#1d0e22]" style={boxStyle} dir="rtl">
          {body}
        </div>
        <button
          type="button"
          onClick={exitFull}
          aria-label="خروج من ملء الشاشة"
          className="fixed top-3 right-3 z-[90] flex h-10 w-10 items-center justify-center rounded-full bg-ivory/20 text-ivory"
        >
          ✕
        </button>
      </>
    );
  }

  return (
    <div className="bride-game flex flex-col items-center gap-6" dir="rtl">
      <style>{GAME_CSS}</style>

      <div className="flex justify-center gap-8 sm:gap-12">
        {order.map((id) => {
          const g = GAMES.find((x) => x.id === id)!;
          const isActive = id === active;
          return (
            <motion.button
              key={id}
              layout
              type="button"
              onClick={() => pick(id)}
              aria-label={`افتح ${g.name}`}
              className="flex flex-col items-center gap-2"
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              <span
                className={`flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl text-2xl shadow-elegant transition-shadow ${isActive ? "ring-2 ring-gold ring-offset-2 ring-offset-background" : "opacity-80 hover:opacity-100"}`}
                style={{ background: g.bg }}
              >
                {g.icon}
              </span>
              <span className={`text-sm ${isActive ? "font-bold text-foreground" : "text-muted-foreground"}`}>{g.name}</span>
            </motion.button>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <h2 className="font-serif text-2xl sm:text-3xl text-center">{game.name}</h2>
        <button
          type="button"
          onClick={enterFull}
          className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
        >
          ⛶ ملء الشاشة
        </button>
      </div>

      {body}
    </div>
  );
}

const GAME_CSS = `
  .bride-game canvas{display:block;border-radius:18px;box-shadow:0 12px 40px rgba(43,22,48,.25),0 0 0 1px hsl(var(--border));touch-action:none;cursor:pointer;user-select:none;-webkit-user-select:none;max-width:100%;width:100%}
  .bride-game #rot{display:none;background:#ffd166;color:#4a2150;font-weight:bold;padding:8px 16px;border-radius:12px;font-size:14px;text-align:center}
  @media (orientation:portrait) and (max-width:700px){.bride-game #rot{display:block}}
  .bride-game #bar button{font:inherit;color:inherit;background:transparent;border:1px solid hsl(var(--border));border-radius:999px;padding:6px 16px;cursor:pointer;font-size:13px}
  .bride-game #bar button:hover{background:hsl(var(--accent))}
  .bride-game[data-full]{touch-action:none;overscroll-behavior:none;overflow:hidden}
  .bride-game [data-full] #bar,.bride-game [data-full] #rot{display:none!important}
  .bride-game #share{background:hsl(var(--gold, 40 60% 50%));color:#fff;border-color:transparent;font-weight:bold}
`;

function CanvasGame({ full }: { full: boolean }) {
  useEffect(() => {
    const ac = new AbortController();
    (window as any).__brideAbort = ac;
    const script = document.createElement("script");
    script.src = "/game/game.js";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      ac.abort();
      script.remove();
      delete (window as any).__brideAbort;
    };
  }, []);

  return (
    <div className={full ? "w-full h-full flex items-center justify-center" : "w-full flex flex-col items-center gap-4"}>
      <div id="rot">📱↻ أدِيري الهاتف أفقياً لتجربة أفضل</div>
      <canvas id="c"></canvas>
      <div id="bar" className="flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground">
        <span>مسافة / ↑ : قفز (اضغطي مطولاً لقفزة أعلى)</span>
        <span>موبايل: المسي الشاشة للقفز</span>
        <button id="mute">الصوت: تشغيل</button>
        <button id="share" hidden>شاركي نتيجتك على انستغرام</button>
      </div>
    </div>
  );
}

function TrapsGame({ full }: { full: boolean }) {
  if (full) {
    return (
      <iframe
        src="/game/traps.html"
        title="طريق مليان فخاخ"
        className="block h-full w-full border-0"
        allow="autoplay; fullscreen"
      />
    );
  }
  return (
    <div className="w-full flex flex-col items-center gap-4">
      <iframe
        src="/game/traps.html"
        title="طريق مليان فخاخ"
        className="block w-full max-w-[1100px] border-0 rounded-[18px] shadow-elegant"
        style={{ aspectRatio: "960 / 520" }}
        allow="autoplay; fullscreen"
      />
      <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground">
        <span>← → أو A D للمشي</span>
        <span>مسافة / ↑ للقفز</span>
        <span>R لإعادة المحاولة</span>
      </div>
    </div>
  );
}
