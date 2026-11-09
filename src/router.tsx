import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { initMonitoring } from "./lib/monitoring";

export const getRouter = () => {
  initMonitoring();
  // إعدادات موفِّرة للاستهلاك: تقليل الطلبات المتكررة على الباك-إند
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60_000,
        gcTime: 30 * 60_000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        retry: 1,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 5 * 60_000,
    // تحميل الصفحة عند لمس/تمرير الرابط قبل الضغط → انتقال فوري
    defaultPreload: "intent",
    // انتقالات كتطبيق: صفحة أعمق تنزلق للداخل، الرجوع ينزلق للخلف، تبويبات نفس المستوى تتلاشى
    defaultViewTransition: {
      types: ({ fromLocation, toLocation, pathChanged }) => {
        if (!pathChanged || !fromLocation) return false;
        const app = (p: string) => p.startsWith("/dashboard") || p === "/notifications";
        if (!app(fromLocation.pathname) || !app(toLocation.pathname)) return false;
        const depth = (p: string) => p.replace(/\/+$/, "").split("/").filter(Boolean).length;
        const a = depth(fromLocation.pathname), b = depth(toLocation.pathname);
        return [b > a ? "forward" : b < a ? "back" : "tab"];
      },
    },
  });

  return router;
};
