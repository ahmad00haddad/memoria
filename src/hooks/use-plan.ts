import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tier } from "@/lib/plans";

/** باقة المصوّرة الحالية (التجربة = pro) — للعدّادات والتلميحات في الواجهة. */
export function usePlan() {
  const [tier, setTier] = useState<Tier | null>(null);
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase.rpc("photographer_tier", { _pid: session.user.id });
      setTier(data === "basic" ? "basic" : "pro");
    })().catch(() => {});
  }, []);
  return { tier, isBasic: tier === "basic" };
}
