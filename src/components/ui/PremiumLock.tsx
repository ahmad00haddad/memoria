import { Lock } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { g } from "@/hooks/use-gender";
import { t, tx } from "@/i18n";

export type LockReason = "expired" | "basic" | null;

// expired: الاشتراك منتهي. basic: ميزة Pro ومشتركة بـBasic — الميزة تبقى ظاهرة
// خلف القفل حتى تعرف ما الذي ستحصل عليه بالترقية.
export function PremiumLock({ reason = "expired" }: { reason?: LockReason }) {
  const basic = reason === "basic";
  const title = basic ? t("ميزة Pro ✦") : t("هذه الميزة مقفلة 🔒");
  const description = basic
    ? g(t("هذه الأداة ضمن باقة Pro. رقّي اشتراكك واستخدميها فوراً — الفرق 5 د.أ بالشهر فقط."), t("هذه الأداة ضمن باقة Pro. رقّ اشتراكك واستخدمها فوراً — الفرق 5 د.أ بالشهر فقط."))
    : t("عذراً، انتهى اشتراكك. يرجى التجديد للوصول إلى هذه الميزة المتقدمة.");
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/50 backdrop-blur-[4px] rounded-lg min-h-[400px]">
      <motion.div initial={{ scale: 0.9, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} className="bg-card p-6 rounded-2xl shadow-elegant border border-border text-center max-w-sm mx-4">
        <div className="mx-auto w-14 h-14 bg-secondary/50 rounded-full flex items-center justify-center mb-4 ring-4 ring-background">
          <Lock className="h-6 w-6 text-[var(--gold)]" />
        </div>
        <h3 className="font-serif text-xl font-bold mb-2">{tx(title)}</h3>
        <p className="text-sm text-muted-foreground mb-6">{tx(description)}</p>
        <Link to="/dashboard/subscription" className="inline-flex items-center justify-center w-full bg-[var(--gold)] text-white px-6 py-2.5 rounded-sm text-sm font-medium hover:opacity-90 active:scale-95 transition-transform duration-200 shadow-soft">
          {basic ? g(t("رقّي إلى Pro"), t("رقِّ إلى Pro")) : t("تجديد الاشتراك الآن")}
        </Link>
      </motion.div>
    </div>
  );
}

/** قفل أدوات Pro: يُقفل عند انتهاء الاشتراك أو إن كانت الباقة Basic. */
export function useSubscriptionLock() {
  const [lockReason, setLockReason] = useState<LockReason>(null);
  const [lockLoading, setLockLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setLockReason("expired");
          return;
        }
        const uid = session.user.id;
        const [{ data: isActive }, { data: tier }] = await Promise.all([
          supabase.rpc("is_subscription_active", { _photographer_id: uid }),
          supabase.rpc("photographer_tier", { _pid: uid }),
        ]);
        setLockReason(!isActive ? "expired" : tier === "basic" ? "basic" : null);
      } catch {
        setLockReason("expired");
      } finally {
        setLockLoading(false);
      }
    })();
  }, []);

  return { isLocked: lockReason !== null, lockReason, lockLoading };
}
