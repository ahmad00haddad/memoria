import { useEffect, useState } from "react";
import { motion } from "framer-motion";

/* صندوق الألعاب: أيقونتان بشكل شاشة الهاتف. اللعبة النشطة دائماً في الخانة الأولى،
   والنقر على أيقونة الأخرى يبدّلهما: اللعبة الجديدة تأخذ مكان القديمة وتتغيّر أيقونتها.
   المنطق الأصلي في public/game/game.js، ولعبة الفخاخ داخل public/game/traps.html.
   عند مغادرة اللعبة نلغي المستمعين عبر AbortController حتى لا تسرق المفاتيح في باقي الصفحات. */

const GAMES = [
  { id: "bride", name: "ضاعت العروس", icon: "👰", bg: "linear-gradient(145deg,#ffc2d9,#c0589b 70%,#7a2f6e)" },
  { id: "traps", name: "فخاخ العروس", icon: "🪤", bg: "linear-gradient(145deg,#5a2d63,#2b1630 75%)" },
] as const;
type GameId = (typeof GAMES)[number]["id"];

export function BrideGame() {
  const [order, setOrder] = useState<GameId[]>(["bride", "traps"]);
  const active = order[0];
  const game = GAMES.find((g) => g.id === active)!;

  const pick = (id: GameId) => {
    if (id === active) return;
    setOrder((o) => [id, ...o.filter((x) => x !== id)]);
  };

  return (
    <div className="bride-game flex flex-col items-center gap-6" dir="rtl">
      <style>{`
        .bride-game canvas{display:block;border-radius:18px;box-shadow:0 12px 40px rgba(43,22,48,.25),0 0 0 1px hsl(var(--border));touch-action:none;cursor:pointer;user-select:none;-webkit-user-select:none;max-width:100%;width:100%}
        .bride-game #rot{display:none;background:#ffd166;color:#4a2150;font-weight:bold;padding:8px 16px;border-radius:12px;font-size:14px;text-align:center}
        @media (orientation:portrait) and (max-width:700px){.bride-game #rot{display:block}}
        .bride-game #bar button{font:inherit;color:inherit;background:transparent;border:1px solid hsl(var(--border));border-radius:999px;padding:6px 16px;cursor:pointer;font-size:13px}
        .bride-game #bar button:hover{background:hsl(var(--accent))}
        .bride-game #share{background:hsl(var(--gold, 40 60% 50%));color:#fff;border-color:transparent;font-weight:bold}
      `}</style>

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

      <h2 className="font-serif text-2xl sm:text-3xl text-center">{game.name}</h2>

      {active === "bride" ? <CanvasGame /> : <TrapsGame />}
    </div>
  );
}

function CanvasGame() {
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
    <div className="w-full flex flex-col items-center gap-4">
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

function TrapsGame() {
  return (
    <iframe
      src="/game/traps.html"
      title="فخاخ العروس"
      className="w-full max-w-5xl rounded-xl border-0 shadow-elegant bg-charcoal"
      style={{ height: "min(78vh, 600px)" }}
      allow="autoplay"
    />
  );
}
