import { useEffect, useRef } from "react";

/**
 * Back gesture / back button closes the topmost overlay instead of leaving the page
 * (sheets, dialogs, lightbox). While `open`, one history entry is pushed; Back pops it
 * and closes the overlay. If the overlay closes by other means, that entry is removed.
 *
 * Safe-guards:
 *  - only the topmost open overlay reacts to a Back press (a stack of layer ids)
 *  - our own history.back() on cleanup never closes an overlay underneath (selfBack counter)
 *  - the entry is only removed when it is still the current one (a link click inside the
 *    overlay that navigated away must not walk the user back a page)
 *  - the push is deferred one tick so React StrictMode's mount/unmount/mount in dev
 *    doesn't push and pop twice
 */
const stack: number[] = [];
let selfBack = 0;
let nextId = 1;

export function useBackClose(open: boolean, onClose: () => void) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open || typeof window === "undefined") return;
    const id = nextId++;
    const token = `memoria-layer-${id}`;
    let pushed = false;
    let popped = false;

    const timer = window.setTimeout(() => {
      try {
        window.history.pushState({ ...(window.history.state ?? {}), memoriaLayer: token }, "");
        pushed = true;
        stack.push(id);
      } catch { /* history unavailable: overlay still closes by its own controls */ }
    }, 0);

    const onPop = () => {
      if (!pushed) return;
      if (selfBack > 0) { selfBack--; return; }
      if (stack[stack.length - 1] !== id) return;
      popped = true;
      closeRef.current();
    };
    window.addEventListener("popstate", onPop);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("popstate", onPop);
      const at = stack.indexOf(id);
      if (at !== -1) stack.splice(at, 1);
      if (pushed && !popped && window.history.state?.memoriaLayer === token) {
        selfBack++;
        window.history.back();
      }
    };
  }, [open]);
}
