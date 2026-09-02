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
  });

  return router;
};
