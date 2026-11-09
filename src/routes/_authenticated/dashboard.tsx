import { useEffect, useState } from "react";
import { createFileRoute, Outlet, useNavigate, useRouter } from "@tanstack/react-router";
import { MobileBottomNav } from "@/components/site/MobileBottomNav";
import { SubscriptionGuard } from "@/components/dashboard/SubscriptionGuard";
import { PageLoader } from "@/components/ui/loading";
import { supabase } from "@/integrations/supabase/client";
import { checkOnboarding } from "@/lib/onboarding-gate";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardLayout,
});

function DashboardLayout() {
  const nav = useNavigate();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  // تحميل كود صفحات الشريط السفلي مسبقاً في وقت الفراغ → انتقال بلا انتظار
  useEffect(() => {
    if (!ready) return;
    const run = () => {
      for (const to of ["/dashboard", "/dashboard/bookings", "/dashboard/calendar", "/dashboard/profile", "/dashboard/pricing", "/dashboard/production"]) {
        router.preloadRoute({ to: to as any }).catch(() => {});
      }
    };
    const ric = (window as any).requestIdleCallback as ((cb: () => void, o?: any) => void) | undefined;
    if (ric) ric(run, { timeout: 3000 }); else setTimeout(run, 1500);
  }, [ready, router]);

  // حارس الإعداد لكل صفحات اللوحة (لا للرئيسية فقط): أي دخول قبل إكمال الإعداد يذهب للمعالج
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { if (alive) setReady(true); return; }
      const go = await checkOnboarding(session.user.id);
      if (!alive) return;
      if (go) { nav({ to: "/onboarding", replace: true }); return; }
      setReady(true);
    })().catch(() => alive && setReady(true));
    return () => { alive = false; };
  }, [nav]);

  if (!ready) return <PageLoader />;

  return (
    <>
      <div className="pb-20 md:pb-0">
        <SubscriptionGuard />
        <Outlet />
      </div>
      <MobileBottomNav />
    </>
  );
}
