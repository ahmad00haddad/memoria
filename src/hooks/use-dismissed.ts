import { useCallback, useEffect, useState } from "react";

/**
 * تلميح يُغلق مرة واحدة ولا يعود للظهور على هذا الجهاز.
 * يبدأ "مُغلقاً" حتى نقرأ التخزين، كي لا يومض التلميح ثم يختفي.
 */
export function useDismissed(key: string) {
  const storageKey = `memoria.dismissed.${key}`;
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try { setDismissed(localStorage.getItem(storageKey) === "1"); } catch { setDismissed(false); }
  }, [storageKey]);

  const dismiss = useCallback(() => {
    setDismissed(true);
    try { localStorage.setItem(storageKey, "1"); } catch { /* ignore */ }
  }, [storageKey]);

  return [dismissed, dismiss] as const;
}
