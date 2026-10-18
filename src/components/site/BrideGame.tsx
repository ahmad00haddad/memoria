import { useEffect, useState } from "react";

/* لعبة «ضاعت العروس» مدمجة داخل الموقع.
   المنطق في public/game/game.js، وهنا الهيكل والتنسيق فقط.
   عند مغادرة الصفحة نلغي المستمعين عبر AbortController فلا تسرق المفاتيح في باقي الصفحات.
   لعبة «فخاخ العروس» تفتح كأيقونة متحركة فوق اللعبة، وتُعرض داخل نافذة (iframe) حتى لا تتعارض معها. */
export function BrideGame() {
  const [trapsOpen, setTrapsOpen] = useState(false);

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

  useEffect(() => {
    if (!trapsOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setTrapsOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [trapsOpen]);

  return (
    <div className="bride-game flex flex-col items-center gap-4" dir="rtl">
      <style>{`
        .bride-game canvas{display:block;border-radius:18px;box-shadow:0 12px 40px rgba(43,22,48,.25),0 0 0 1px hsl(var(--border));touch-action:none;cursor:pointer;user-select:none;-webkit-user-select:none;max-width:100%}
        .bride-game #rot{display:none;background:#ffd166;color:#4a2150;font-weight:bold;padding:8px 16px;border-radius:12px;font-size:14px;text-align:center}
        @media (orientation:portrait) and (max-width:700px){.bride-game #rot{display:block}}
        .bride-game button{font:inherit;color:inherit;background:transparent;border:1px solid hsl(var(--border));border-radius:999px;padding:6px 16px;cursor:pointer;font-size:13px}
        .bride-game button:hover{background:hsl(var(--accent))}
        .bride-game #share{background:hsl(var(--gold, 40 60% 50%));color:#fff;border-color:transparent;font-weight:bold}
        @keyframes bride-float{0%,100%{transform:translate(0,0) rotate(-3deg)}50%{transform:translate(-4px,-6px) rotate(3deg)}}
      `}</style>
      <div id="rot">📱↻ أدِيري الهاتف أفقياً لتجربة أفضل</div>
      <div className="relative w-full flex justify-center">
        <canvas id="c" className="w-full"></canvas>
        <button
          type="button"
          onClick={() => setTrapsOpen(true)}
          title="فخاخ العروس"
          aria-label="العب فخاخ العروس"
          className="absolute top-3 left-3 h-14 w-14 flex flex-col items-center justify-center gap-0 rounded-xl bg-background/90 border border-border shadow-elegant text-2xl hover:scale-105 transition-transform"
          style={{ animation: "bride-float 3s ease-in-out infinite" }}
        >
          🪤
        </button>
      </div>
      <div id="bar" className="flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground">
        <span>مسافة / ↑ : قفز (اضغطي مطولاً لقفزة أعلى)</span>
        <span>موبايل: المسي الشاشة للقفز</span>
        <button id="mute">الصوت: تشغيل</button>
        <button id="share" hidden>شاركي نتيجتك على انستغرام</button>
      </div>

      {trapsOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-charcoal/70 p-2 sm:p-6"
          onClick={() => setTrapsOpen(false)}
        >
          <div
            className="relative w-full max-w-5xl h-[min(88vh,680px)] overflow-hidden rounded-xl bg-charcoal shadow-elegant"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setTrapsOpen(false)}
              className="absolute top-2 right-2 z-10 h-9 w-9 rounded-full bg-background/90 text-foreground"
              aria-label="إغلاق"
            >
              ✕
            </button>
            <iframe
              src="/game/traps.html"
              title="فخاخ العروس"
              className="h-full w-full border-0"
              allow="autoplay"
            />
          </div>
        </div>
      )}
    </div>
  );
}
