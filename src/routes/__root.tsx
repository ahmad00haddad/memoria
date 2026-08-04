import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  useRouterState,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { ThemeProvider } from "@/components/theme-provider";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { ConfirmProvider } from "@/components/ui/confirm-dialog";
import { SmoothScroll } from "@/components/SmoothScroll";
import { LazyMotion, domAnimation, motion, AnimatePresence } from "framer-motion";
import { MobileTabBar } from "@/components/site/MobileTabBar";
import { PwaInstallPrompt } from "@/components/site/PwaInstallPrompt";
import { ClientTour } from "@/components/ClientTour";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4" dir="rtl">
      <div className="max-w-md text-center">
        <h1 className="font-serif text-7xl font-bold text-foreground">٤٠٤</h1>
        <h2 className="mt-4 font-serif text-2xl text-foreground">الصفحة غير موجودة</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          الصفحة التي تبحثين عنها غير موجودة أو تم نقلها.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-sm bg-charcoal px-5 py-2.5 text-sm font-medium text-ivory transition-colors hover:opacity-90"
          >
            العودة للرئيسية
          </Link>
          <Link
            to="/search"
            className="inline-flex items-center justify-center rounded-sm border border-border bg-background px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            ابحثي عن مصوّرة
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4" dir="rtl">
      <div className="max-w-md text-center">
        <h1 className="font-serif text-2xl text-foreground">
          تعذّر تحميل هذه الصفحة
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          حدث خلل غير متوقع. يمكنكِ المحاولة مجدداً أو العودة للرئيسية.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-sm bg-charcoal px-5 py-2.5 text-sm font-medium text-ivory transition-colors hover:opacity-90"
          >
            إعادة المحاولة
          </button>
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-sm border border-border bg-background px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            الرئيسية
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "Memoria" },
      { title: "Memoria (ميموريا) — ذاكرة يومكِ، محفوظة بأمان" },
      { name: "description", content: "ميموريا: منصة أردنية متخصّصة في حجز مصوّرات الأعراس. مواعيد واضحة، عقود رقمية، وعربون موثّق — بعيداً عن فوضى الواتساب." },
      { property: "og:title", content: "Memoria (ميموريا) — ذاكرة يومكِ، محفوظة بأمان" },
      { property: "og:description", content: "ميموريا: منصة أردنية متخصّصة في حجز مصوّرات الأعراس. مواعيد واضحة، عقود رقمية، وعربون موثّق — بعيداً عن فوضى الواتساب." },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "https://memoria-jo.lovable.app/og-default.png" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@memoria_jo" },
      { name: "twitter:title", content: "Memoria (ميموريا) — ذاكرة يومكِ، محفوظة بأمان" },
      { name: "twitter:description", content: "ميموريا: منصة أردنية متخصّصة في حجز مصوّرات الأعراس." },
      { name: "twitter:image", content: "https://memoria-jo.lovable.app/og-default.png" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/app-icon-512.png" },
      { rel: "icon", type: "image/png", href: "/app-icon-192.png" },
    ],
    scripts: [
      // GA: يُحمَّل فقط عند وجود VITE_GA_MEASUREMENT_ID صالح (يبدأ بـ G-) لتفادي نداءات placeholder
      ...(import.meta.env.VITE_GA_MEASUREMENT_ID && (import.meta.env.VITE_GA_MEASUREMENT_ID as string).startsWith('G-')
        ? [
            {
              src: `https://www.googletagmanager.com/gtag/js?id=${import.meta.env.VITE_GA_MEASUREMENT_ID}`,
              async: true,
            },
            {
              children: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${import.meta.env.VITE_GA_MEASUREMENT_ID}');
              `,
            },
          ]
        : []),
      {
        children: "(function(){try{var t=localStorage.getItem('theme');var d=t==='dark'||(!t&&window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('dark');}catch(e){}})();",
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "Memoria",
          url: "https://memoria-jo.lovable.app",
          inLanguage: "ar",
          potentialAction: {
            "@type": "SearchAction",
            target: "https://memoria-jo.lovable.app/search?q={search_term_string}",
            "query-input": "required name=search_term_string",
          },
        }),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body suppressHydrationWarning>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") {
        return;
      }

      queueMicrotask(() => {
        router.invalidate();

        if (event !== "SIGNED_OUT") {
          queryClient.invalidateQueries();
        } else {
          queryClient.clear();
        }
      });
    });

    return () => subscription.unsubscribe();
  }, [queryClient, router]);

  // PWA (PR4): تسجيل الـ service worker + التقاط حدث التثبيت لاستخدامه في صفحة /app.
  useEffect(() => {
    if (typeof window === "undefined") return;

    if ("serviceWorker" in navigator) {
      const onLoad = () => {
        navigator.serviceWorker.register("/sw.js").catch(() => {});
      };
      window.addEventListener("load", onLoad);
      // إن كانت الصفحة محمّلة مسبقاً
      if (document.readyState === "complete") onLoad();
    }

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      (window as any).__deferredInstallPrompt = e;
      window.dispatchEvent(new Event("pwa-installable"));
    };
    const onInstalled = () => {
      (window as any).__deferredInstallPrompt = null;
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  // M7: Smooth scroll with Lenis — مُعطّل في مسارات Dashboard/Admin (جداول + Kanban لا تحتاج smooth scroll)
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  useEffect(() => {
    if (typeof window === "undefined") return;
    // تعطيل Lenis في لوحة التحكم والمسارات الإدارية
    if (pathname.startsWith('/dashboard') || pathname.startsWith('/admin') || pathname.startsWith('/notifications')) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
      smoothWheel: true,
    });
    
    let animationFrameId: number;
    function raf(time: number) {
      lenis.raf(time);
      animationFrameId = requestAnimationFrame(raf);
    }
    animationFrameId = requestAnimationFrame(raf);
    
    return () => {
      cancelAnimationFrame(animationFrameId);
      lenis.destroy();
    };
  }, [pathname]);

  // Page entrance animation (Task 7)

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ConfirmProvider>
          <LazyMotion features={domAnimation}>
            <SmoothScroll />
            <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:start-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-background focus:text-foreground focus:border focus:rounded-sm focus:shadow-sm">
              تخطي إلى المحتوى الرئيسي
            </a>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                id="main-content"
                key={pathname}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
            <MobileTabBar />
            <PwaInstallPrompt />
            <ClientTour />
            <Toaster position="top-center" richColors closeButton />
          </LazyMotion>
        </ConfirmProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
