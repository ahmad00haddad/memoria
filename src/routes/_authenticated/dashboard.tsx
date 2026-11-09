import { useEffect, useRef, useState } from "react";
import { createFileRoute, Outlet, useNavigate, useRouter, useRouterState } from "@tanstack/react-router";
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
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // كل صفحة تتذكّر مكان التمرير: الرجوع لـ«لوحتي» (أو أي صفحة) يعيدكِ لنفس المكان بدل أعلى الصفحة
  const prevPath = useRef<string | null>(null);
  useEffect(() => {
    const key = (p: string) => `memoria-scroll:${p}`;
    const save = () => { try { if (prevPath.current) sessionStorage.setItem(key(prevPath.current), String(window.scrollY)); } catch { /* ignore */ } };
    let y = 0;
    try { y = Number(sessionStorage.getItem(key(pathname))) || 0; } catch { /* ignore */ }
    prevPath.current = pathname;
    let raf = 0;
    if (y > 0) {
      // المحتوى قد يُرسم بعد لحظة: نعيد المحاولة حتى يصبح الطول كافياً (حتى ~1.5 ثانية)
      const t0 = performance.now();
      const tick = () => {
        if (document.documentElement.scrollHeight - window.innerHeight >= y - 4) { window.scrollTo(0, y); if (performance.now() - t0 > 250) return; }
        if (performance.now() - t0 < 1500) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }
    // نحفظ لحظة الضغط (قبل أن يعيد الراوتر التمرير للأعلى)
    const onPress = () => save();
    document.addEventListener("pointerdown", onPress, { capture: true, passive: true });
    const stop = () => cancelAnimationFrame(raf);
    window.addEventListener("touchstart", stop, { passive: true, once: true });
    window.addEventListener("wheel", stop, { passive: true, once: true });
    return () => { cancelAnimationFrame(raf); document.removeEventListener("pointerdown", onPress, { capture: true } as any); window.removeEventListener("touchstart", stop); window.removeEventListener("wheel", stop); };
  }, [pathname, ready]);

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
