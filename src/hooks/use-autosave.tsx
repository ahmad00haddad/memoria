import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader2, AlertCircle } from "lucide-react";
import { t } from "@/i18n";

export type AutosaveStatus = "idle" | "pending" | "saving" | "saved" | "error";

/**
 * حفظ تلقائي: بعد توقّف التعديل `delay`ms يُستدعى save. لا زر «حفظ» ولا تحذير مغادرة.
 * save يرمي خطأ عند الفشل؛ `blocked` يمنع الحفظ (حقل غير صالح) دون رسالة.
 */
export function useAutosave({ dirty, save, delay = 1200, blocked = false, version }: {
  dirty: boolean; save: () => Promise<void>; delay?: number; blocked?: boolean; version: unknown;
}) {
  const [status, setStatus] = useState<AutosaveStatus>("idle");
  const saveRef = useRef(save);
  saveRef.current = save;
  const running = useRef(false);
  const again = useRef(false);

  const run = async () => {
    if (running.current) { again.current = true; return; }
    running.current = true;
    setStatus("saving");
    try {
      await saveRef.current();
      setStatus("saved");
    } catch {
      setStatus("error");
    } finally {
      running.current = false;
      if (again.current) { again.current = false; void run(); }
    }
  };

  useEffect(() => {
    if (!dirty || blocked) return;
    setStatus("pending");
    const id = window.setTimeout(() => { void run(); }, delay);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty, blocked, version]);

  // «حُفظ» تختفي بعد لحظة
  useEffect(() => {
    if (status !== "saved") return;
    const id = window.setTimeout(() => setStatus("idle"), 1800);
    return () => window.clearTimeout(id);
  }, [status]);

  // مغادرة الصفحة أثناء الانتظار: نحفظ فوراً بدل الضياع
  const pendingRef = useRef(false);
  pendingRef.current = dirty && !blocked;
  useEffect(() => {
    const flush = () => { if (pendingRef.current && !running.current) void run(); };
    window.addEventListener("pagehide", flush);
    return () => { window.removeEventListener("pagehide", flush); flush(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { status, retry: run };
}

/** شارة صغيرة أعلى الشاشة: يُحفظ… / حُفظ ✓ / تعذّر الحفظ (إعادة) */
export function AutosaveChip({ status, retry }: { status: AutosaveStatus; retry: () => void }) {
  const show = status === "saving" || status === "saved" || status === "error";
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
          className="pointer-events-none fixed inset-x-0 top-[calc(3.5rem+env(safe-area-inset-top))] z-50 flex justify-center sm:top-20"
        >
          <div role="status" className={`pointer-events-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs shadow-lg ${status === "error" ? "bg-destructive text-white" : "bg-charcoal text-ivory dark:bg-gold dark:text-charcoal"}`}>
            {status === "saving" && <><Loader2 className="h-3.5 w-3.5 animate-spin" />{t("يُحفظ…")}</>}
            {status === "saved" && <><Check className="h-3.5 w-3.5" />{t("حُفظ")}</>}
            {status === "error" && <><AlertCircle className="h-3.5 w-3.5" />{t("تعذّر الحفظ")}<button type="button" onClick={retry} className="ms-1 underline">{t("إعادة")}</button></>}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
