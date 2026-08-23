import { Lock } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function PremiumLock({ title = "هذه الميزة مقفلة 🔒", description = "عذراً، انتهى اشتراكك. يرجى التجديد للوصول إلى هذه الميزة المتقدمة." }: { title?: string, description?: string }) {
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/50 backdrop-blur-[4px] rounded-lg min-h-[400px]">
      <motion.div initial={{ scale: 0.9, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} className="bg-card p-6 rounded-2xl shadow-elegant border border-border text-center max-w-sm mx-4">
        <div className="mx-auto w-14 h-14 bg-secondary/50 rounded-full flex items-center justify-center mb-4 ring-4 ring-background">
          <Lock className="h-6 w-6 text-[var(--gold)]" />
        </div>
        <h3 className="font-serif text-xl font-bold mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground mb-6">{description}</p>
        <Link to="/dashboard/subscription" className="inline-flex items-center justify-center w-full bg-[var(--gold)] text-white px-6 py-2.5 rounded-sm text-sm font-medium hover:opacity-90 active:scale-95 transition-transform duration-200 shadow-soft">
          تجديد الاشتراك الآن
        </Link>
      </motion.div>
    </div>
  );
}

export function useSubscriptionLock() {
  const [isLocked, setIsLocked] = useState(false);
  const [lockLoading, setLockLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setIsLocked(true);
          setLockLoading(false);
          return;
        }
        
        const { data: isActive, error } = await supabase.rpc("is_subscription_active", { _photographer_id: session.user.id });
        setIsLocked(!isActive);
      } catch (err) {
        setIsLocked(true);
      } finally {
        setLockLoading(false);
      }
    })();
  }, []);

  return { isLocked, lockLoading };
}
