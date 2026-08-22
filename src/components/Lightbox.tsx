import { useEffect, useRef, useState } from "react";
import { X, ChevronLeft, ChevronRight, Heart } from "lucide-react";

// Lightbox مع دعم اللمس (سحب يمين/يسار)، أزرار، ولوحة المفاتيح.
export function Lightbox({
  images,
  index,
  onClose,
}: {
  images: string[];
  index: number;
  onClose: () => void;
}) {
  const [i, setI] = useState(index);
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const lastTap = useRef<number>(0);
  const [showHeart, setShowHeart] = useState(false);
  const [heartPos, setHeartPos] = useState({ x: 0, y: 0 });

  useEffect(() => setI(index), [index]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images.length]);

  const next = () => setI((p) => (p + 1) % images.length);
  const prev = () => setI((p) => (p - 1 + images.length) % images.length);

  const onTouchStart = (e: React.TouchEvent) => { 
    startX.current = e.touches[0].clientX; 
    startY.current = e.touches[0].clientY;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (startX.current == null || startY.current == null) return;
    const dx = e.changedTouches[0].clientX - startX.current;
    const dy = e.changedTouches[0].clientY - startY.current;
    
    // Swipe down to close (Native feel)
    if (dy > 80 && Math.abs(dy) > Math.abs(dx)) {
      onClose();
    } else if (Math.abs(dx) > 40) {
      (dx > 0 ? prev : next)();
    }
    startX.current = null;
    startY.current = null;
  };

  if (!images.length) return null;

  return (
    <div
      className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center select-none"
      onClick={onClose}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <button onClick={onClose} className="absolute top-3 left-3 text-white/80 hover:text-white p-2 z-10" aria-label="إغلاق">
        <X className="h-6 w-6" />
      </button>
      {images.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); prev(); }}
            className="hidden sm:grid absolute right-3 top-1/2 -translate-y-1/2 place-items-center h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 text-white"
            aria-label="السابق"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); next(); }}
            className="hidden sm:grid absolute left-3 top-1/2 -translate-y-1/2 place-items-center h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 text-white"
            aria-label="التالي"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <div className="absolute top-3 right-3 text-white/70 text-xs bg-white/10 px-2 py-1 rounded-sm">{i + 1} / {images.length}</div>
        </>
      )}
      {/* Double Tap Heart Animation */}
      {showHeart && (
        <Heart 
          className="absolute h-24 w-24 text-white fill-white pointer-events-none drop-shadow-2xl animate-[ping_0.5s_cubic-bezier(0,0,0.2,1)_forwards]" 
          style={{ 
            top: heartPos.y - 48, 
            left: heartPos.x - 48,
            animationDuration: '0.6s'
          }} 
        />
      )}
      <img
        src={images[i]}
        alt=""
        className="max-w-full max-h-full object-contain p-4 transition-transform duration-200"
        onClick={(e) => {
          e.stopPropagation();
          const now = Date.now();
          if (now - lastTap.current < 300) {
            // Double tap detected!
            setHeartPos({ x: e.clientX, y: e.clientY });
            setShowHeart(true);
            setTimeout(() => setShowHeart(false), 800);
            lastTap.current = 0;
          } else {
            lastTap.current = now;
          }
        }}
      />
    </div>
  );
}