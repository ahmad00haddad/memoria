import { useEffect, useRef, useState } from "react";

/**
 * A photo that arrives out of a soft blur instead of popping in. The card behind it keeps
 * its own ground colour, so the space never looks empty while the file loads.
 * Cached images (already complete before hydration) show at once.
 */
export function ProgressiveImg({ className = "", onLoad, onError, ...rest }: React.ImgHTMLAttributes<HTMLImageElement>) {
  const ref = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (el?.complete && el.naturalWidth > 0) setLoaded(true);
  }, []);
  return (
    <img
      ref={ref}
      {...rest}
      data-loaded={loaded}
      onLoad={(e) => { setLoaded(true); onLoad?.(e); }}
      onError={(e) => { setLoaded(true); onError?.(e); }}
      className={`img-blur ${className}`}
    />
  );
}
