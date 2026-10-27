import { useEffect, useRef, useState } from "react";
import { X, ChevronLeft, ChevronRight, Heart } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { t, tx } from "@/i18n";

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

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
  // +1 = moved to the next image, -1 = previous; drives the slide direction
  const [dir, setDir] = useState(1);

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

  const next = () => { setDir(1); setI((p) => (p + 1) % images.length); };
  const prev = () => { setDir(-1); setI((p) => (p - 1 + images.length) % images.length); };

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
    // Opens and closes with a short fade so the gallery doesn't pop over the page.
    // Exit plays when the parent wraps this in <AnimatePresence>.
    <motion.div
      className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center select-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.15, ease: "easeOut" } }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      onClick={onClose}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <button onClick={onClose} className="absolute top-3 end-3 text-white/80 hover:text-white p-2 z-10" aria-label={t("إغلاق")}>
        <X className="h-6 w-6" />
      </button>
      {images.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); prev(); }}
            className="hidden sm:grid absolute start-3 top-1/2 -translate-y-1/2 place-items-center h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 text-white"
            aria-label={t("السابق")}
          >
            <ChevronRight className="h-6 w-6" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); next(); }}
            className="hidden sm:grid absolute end-3 top-1/2 -translate-y-1/2 place-items-center h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 text-white"
            aria-label={t("التالي")}
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <div className="absolute top-3 start-3 text-white/70 text-xs bg-white/10 px-2 py-1 rounded-sm">{i + 1} / {tx(images.length)}</div>
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
      {/* The image settles in from a slight scale on open (wrapper below); switching images slides
          24px in the direction of travel and crossfades. */}
      <motion.div
        className="flex max-w-full max-h-full items-center justify-center"
        initial={{ scale: 0.96 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.25, ease: EASE_OUT }}
      >
      <AnimatePresence initial={false} custom={dir} mode="popLayout">
      <motion.img
        key={i}
        custom={dir}
        variants={{
          enter: (d: number) => ({ opacity: 0, x: d * 24 }),
          center: { opacity: 1, x: 0 },
          exit: (d: number) => ({ opacity: 0, x: d * -24 }),
        }}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{ duration: 0.22, ease: EASE_OUT }}
        src={images[i]}
        alt=""
        className="max-w-full max-h-full object-contain p-4"
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
      </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}