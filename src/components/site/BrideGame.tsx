import { useEffect } from "react";

/* لعبة «ضاعت العروس» مدمجة داخل الموقع.
   المنطق في public/game/game.js، وهنا الهيكل والتنسيق فقط.
   عند مغادرة الصفحة نلغي المستمعين عبر AbortController فلا تسرق المفاتيح في باقي الصفحات. */
export function BrideGame() {
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
    <div className="bride-game flex flex-col items-center gap-4" dir="rtl">
      <style>{`
        .bride-game canvas{display:block;border-radius:18px;box-shadow:0 12px 40px rgba(43,22,48,.25),0 0 0 1px hsl(var(--border));touch-action:none;cursor:pointer;user-select:none;-webkit-user-select:none;max-width:100%}
        .bride-game #rot{display:none;background:#ffd166;color:#4a2150;font-weight:bold;padding:8px 16px;border-radius:12px;font-size:14px;text-align:center}
        @media (orientation:portrait) and (max-width:700px){.bride-game #rot{display:block}}
        .bride-game button{font:inherit;color:inherit;background:transparent;border:1px solid hsl(var(--border));border-radius:999px;padding:6px 16px;cursor:pointer;font-size:13px}
        .bride-game button:hover{background:hsl(var(--accent))}
        .bride-game #share{background:hsl(var(--gold, 40 60% 50%));color:#fff;border-color:transparent;font-weight:bold}
      `}</style>
      <div id="rot">📱↻ أدِيري الهاتف أفقياً لتجربة أفضل</div>
      <canvas id="c" className="w-full"></canvas>
      <div id="bar" className="flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground">
        <span>مسافة / ↑ : قفز (اضغطي مطولاً لقفزة أعلى)</span>
        <span>موبايل: المسي الشاشة للقفز</span>
        <button id="mute">الصوت: تشغيل</button>
        <button id="share" hidden>شاركي نتيجتك على انستغرام</button>
      </div>
    </div>
  );
}
