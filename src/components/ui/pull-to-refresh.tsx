import { useState, useRef, useEffect, ReactNode } from "react";
import { motion, useAnimation } from "framer-motion";
import { RefreshCw } from "lucide-react";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
}

export function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const [startY, setStartY] = useState(0);
  const [pulling, setPulling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const controls = useAnimation();
  
  const threshold = 80;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      setStartY(e.touches[0].clientY);
      setPulling(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!pulling || refreshing) return;
    const currentY = e.touches[0].clientY;
    const distance = currentY - startY;
    
    if (distance > 0 && window.scrollY === 0) {
      // Pulling down
      const resistance = distance * 0.4;
      controls.set({ y: Math.min(resistance, threshold) });
    }
  };

  const handleTouchEnd = async (e: React.TouchEvent) => {
    if (!pulling || refreshing) return;
    setPulling(false);
    
    const currentY = e.changedTouches[0].clientY;
    const distance = currentY - startY;
    
    if (distance * 0.4 > threshold - 10) {
      // Trigger refresh
      setRefreshing(true);
      controls.start({ y: 50 });
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
        controls.start({ y: 0 });
      }
    } else {
      controls.start({ y: 0 });
    }
  };

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative min-h-screen"
    >
      <motion.div
        animate={controls}
        initial={{ y: -50, opacity: 0 }}
        className="absolute top-0 left-0 right-0 flex justify-center items-center h-16 pointer-events-none z-10"
      >
        <div className={`bg-background shadow-soft rounded-full p-2 border border-border ${refreshing ? "animate-spin" : ""}`}>
          <RefreshCw className="h-5 w-5 text-gold" />
        </div>
      </motion.div>
      <motion.div animate={controls} className="h-full">
        {children}
      </motion.div>
    </div>
  );
}
