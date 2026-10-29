import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  useRouterState,
  type ErrorComponentProps,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { Toaster } from "@/components/ui/sonner";
import { installFriendlyToasts } from "@/lib/friendlyErrors";
installFriendlyToasts();
import { supabase } from "@/integrations/supabase/client";
import { useCallback, useEffect, useRef, useState } from "react";
import { ThemeProvider } from "@/components/theme-provider";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { ConfirmProvider } from "@/components/ui/confirm-dialog";
import { PhotographerCommandPalette } from "@/components/CommandPalette";
import { LazyMotion, domAnimation, motion, AnimatePresence, MotionConfig } from "framer-motion";
import { MobileTabBar } from "@/components/site/MobileTabBar";
import { PwaInstallPrompt } from "@/components/site/PwaInstallPrompt";
import { GameHint } from "@/components/site/GameHint";
import { BrideGame } from "@/components/site/BrideGame";
import { ClientTour } from "@/components/ClientTour";
import { IntroContext, markIntroSeen, readIntro } from "@/lib/intro";
import { FirstVisitIntro } from "@/components/site/FirstVisitIntro";
import { getLang, dirOf, LANG_COOKIE } from "@/i18n";
import { t as tr } from "@/i18n";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4" dir={dirOf(getLang())}>
      <div className="max-w-md text-center">
        <h1 className="font-serif text-7xl font-bold text-foreground">{tr("٤٠٤")}</h1>
        <h2 className="mt-4 font-serif text-2xl text-foreground">{tr("الصفحة غير موجودة")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {tr("الصفحة التي تبحثين عنها غير موجودة أو تم نقلها.")}
        </p>
        <div className="mt-6">
          <p className="mb-3 text-xs text-muted-foreground">{tr("العبي بينما نلاقي الصفحة")}</p>
          <BrideGame />
        </div>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-sm bg-charcoal px-5 py-2.5 text-sm font-medium text-ivory transition-colors hover:opacity-90"
          >
            {tr("العودة للرئيسية")}
          </Link>
          <Link
            to="/search"
            className="inline-flex items-center justify-center rounded-sm border border-border bg-background px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            {tr("ابحثي عن مصوّرة")}
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  // A stale deploy chunk failed to load: reload into the new build instead of showing an error
  if (typeof window !== "undefined") (window as any).__memoriaChunkReload?.(error);
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4" dir={dirOf(getLang())}>
      <div className="max-w-md text-center">
        <h1 className="font-serif text-2xl text-foreground">
          {tr("تعذّر تحميل هذه الصفحة")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {tr("حدث خلل غير متوقع. يمكنكِ المحاولة مجدداً أو العودة للرئيسية.")}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-sm bg-charcoal px-5 py-2.5 text-sm font-medium text-ivory transition-colors hover:opacity-90"
          >
            {tr("إعادة المحاولة")}
          </button>
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-sm border border-border bg-background px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            {tr("الرئيسية")}
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
      { title: tr("Memoria (ميموريا) — ذاكرة يومكِ، محفوظة بأمان") },
      { name: "description", content: tr("ميموريا: منصة أردنية متخصّصة في حجز مصوّرات الأعراس. مواعيد واضحة، عقود رقمية، وعربون موثّق — بعيداً عن فوضى الواتساب.") },
      { property: "og:title", content: tr("Memoria (ميموريا) — ذاكرة يومكِ، محفوظة بأمان") },
      { property: "og:description", content: tr("ميموريا: منصة أردنية متخصّصة في حجز مصوّرات الأعراس. مواعيد واضحة، عقود رقمية، وعربون موثّق — بعيداً عن فوضى الواتساب.") },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "https://memoria-production.ahmad000haddad.workers.dev/og-default.png" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@memoria_jo" },
      { name: "twitter:title", content: tr("Memoria (ميموريا) — ذاكرة يومكِ، محفوظة بأمان") },
      { name: "twitter:description", content: tr("ميموريا: منصة أردنية متخصّصة في حجز مصوّرات الأعراس.") },
      { name: "twitter:image", content: "https://memoria-production.ahmad000haddad.workers.dev/og-default.png" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/app-icon-512.png" },
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32.png" },
    ],
    scripts: [
      // GA: يُحمَّل فقط عند وجود VITE_GA_MEASUREMENT_ID صالح (يبدأ بـ G-) لتفادي نداءات placeholder
      ...(import.meta.env.VITE_GA_MEASUREMENT_ID && ((import.meta.env.VITE_GA_MEASUREMENT_ID as string).startsWith('G-') && import.meta.env.VITE_GA_MEASUREMENT_ID !== 'G-XXXXXXXXXX')
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
        // رابط Lovable القديم يعمل على قاعدة بيانات قديمة — نحوّل زوّاره للموقع الحقيقي
        // مع الإبقاء على نفس الصفحة (مثل /track/... أو /photographers/...).
        children: "(function(){if(location.hostname==='memoria-jo.lovable.app'){location.replace('https://memoria-production.ahmad000haddad.workers.dev'+location.pathname+location.search+location.hash);}})();",
      },
      {
        // The homepage builds itself on load; don't let the browser restore a mid-page scroll
        children: "if(location.pathname==='/'&&'scrollRestoration' in history)history.scrollRestoration='manual';",
      },
      {
        children: "(function(){try{var t=localStorage.getItem('theme');var d=t==='dark'||(!t&&window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('dark');}catch(e) { /* ignore */ }})();",
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "Memoria",
          url: "https://memoria-production.ahmad000haddad.workers.dev",
          inLanguage: "ar",
          potentialAction: {
            "@type": "SearchAction",
            target: "https://memoria-production.ahmad000haddad.workers.dev/search?q={search_term_string}",
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
    <html lang={getLang()} dir={dirOf(getLang())} suppressHydrationWarning>
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
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const router = useRouter();

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") {
        return;
      }

      // Must be a macrotask: router.invalidate() re-runs beforeLoad → getSession(),
      // which deadlocks if it runs while this callback still holds the auth lock
      // (the "page hangs until refresh" bug when returning to the dashboard).
      setTimeout(() => {
        router.invalidate();

        if (event !== "SIGNED_OUT") {
          queryClient.invalidateQueries();
        } else {
          queryClient.clear();
        }
      }, 0);
    });

    return () => subscription.unsubscribe();
  }, [queryClient, router]);

  // بعد كل نشر جديد تُحذف ملفات JS القديمة من الخادم؛ التبويب المفتوح مسبقاً
  // يفشل في تحميلها فيعلق على الشاشة الرمادية. نعيد التحميل مرة واحدة تلقائياً.
  // Route chunks load through plain dynamic import(), which never fires
  // vite:preloadError — so also catch the rejected import itself. The guard is
  // a timestamp (not a once-per-session flag) so a second deploy later in the
  // same session still recovers, while a truly broken chunk can't loop.
  useEffect(() => {
    const KEY = "memoria.chunk-reload-at";
    const reloadOnce = () => {
      try {
        const last = Number(sessionStorage.getItem(KEY) || 0);
        if (Date.now() - last < 30_000) return;
        sessionStorage.setItem(KEY, String(Date.now()));
      } catch { /* ignore */ }
      window.location.reload();
    };
    const isChunkError = (msg: string) =>
      /dynamically imported module|Importing a module script failed|error loading dynamically imported|Failed to fetch dynamically|is not a valid JavaScript MIME type|ChunkLoadError/i.test(msg);
    const onPreloadError = (e: Event) => { e.preventDefault(); reloadOnce(); };
    const onRejection = (e: PromiseRejectionEvent) => {
      const msg = String((e.reason as any)?.message ?? e.reason ?? "");
      if (isChunkError(msg)) reloadOnce();
    };
    const onError = (e: ErrorEvent) => { if (isChunkError(String(e.message ?? ""))) reloadOnce(); };
    window.addEventListener("vite:preloadError", onPreloadError);
    window.addEventListener("unhandledrejection", onRejection);
    window.addEventListener("error", onError);
    (window as any).__memoriaChunkReload = (err: unknown) => {
      if (isChunkError(String((err as any)?.message ?? err ?? ""))) { reloadOnce(); return true; }
      return false;
    };
    return () => {
      window.removeEventListener("vite:preloadError", onPreloadError);
      window.removeEventListener("unhandledrejection", onRejection);
      window.removeEventListener("error", onError);
    };
  }, []);

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
  const firstPage = useRef(true);
  useEffect(() => { firstPage.current = false; }, []);

  // Entrance choreography plays on a browser's first visit only (see lib/intro).
  // Read once per page load: the server and the hydrating client agree, and the
  // whole first session keeps the intro until the next full load.
  const [intro] = useState(readIntro);
  useEffect(() => { markIntroSeen(); }, []);
  // ?lang=en in a shared link sticks for the rest of the visit
  // (only then: no cookie = no choice yet, so a photographer's default language can apply)
  useEffect(() => {
    if (!new URLSearchParams(window.location.search).has("lang")) return;
    document.cookie = `${LANG_COOKIE}=${getLang()}; Path=/; Max-Age=${60 * 60 * 24 * 365}; SameSite=Lax`;
  }, []);
  // The soft page entrances play on every visit to public pages. Inside the app
  // (dashboard/admin), used many times a day, they play on the first visit only.
  const appArea = /^\/(dashboard|admin|notifications)/.test(pathname);
  // على الهاتف: حركات الدخول في أول زيارة فقط — تكرارها مع كل تنقّل يجعل الصفحات تبدو بطيئة.
  // يُقرأ بعد التركيب (لا أثناء الرسم) كي يطابق الخادمَ في أول تحميل؛ يسري على التنقّلات التالية.
  const [isPhone, setIsPhone] = useState(false);
  useEffect(() => { setIsPhone(window.matchMedia("(max-width: 639px)").matches); }, []);
  const playEntrances = intro || (!appArea && !isPhone);
  // The big one-time opening runs on public pages only (not the app, not
  // tracking/contract links people open from WhatsApp). When its arch opens,
  // bumping the epoch remounts the page so its own entrance builds in view.
  const introEligible = !/^\/(dashboard|admin|notifications|track|contracts|review|login|forgot-password|reset-password|recover|onboarding|app|api)/.test(pathname);
  const [showIntro] = useState(() => intro && introEligible && !(typeof window !== "undefined" && window.parent !== window));
  const [embedded, setEmbedded] = useState(false);
  useEffect(() => setEmbedded(window.parent !== window), []);
  const [epoch, setEpoch] = useState(0);
  const onIntroReveal = useCallback(() => setEpoch(1), []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ConfirmProvider>
          <LazyMotion features={domAnimation}>
           <MotionConfig reducedMotion="user">
            <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:start-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-background focus:text-foreground focus:border focus:rounded-sm focus:shadow-sm">
              {tr("تخطي إلى المحتوى الرئيسي")}
            </a>
            {showIntro && <FirstVisitIntro onReveal={onIntroReveal} />}
            {/* No initial={false} here: it is inherited by every page and would make all
                their entrance animations render already finished. The wrapper itself
                skips its fade only on the very first page. */}
            <AnimatePresence mode="wait">
              <motion.div
                id="main-content"
                key={pathname}
                initial={firstPage.current ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              >
                {/* Remounts with each page: on return visits initial={false} renders every
                    entrance already finished; things that mount later (galleries,
                    booking steps, filtered results) still animate. */}
                <IntroContext.Provider key={epoch} value={playEntrances}>
                  <AnimatePresence initial={playEntrances}>
                    <Outlet key="page" />
                  </AnimatePresence>
                </IntroContext.Provider>
              </motion.div>
            </AnimatePresence>
            <MobileTabBar />
            <PhotographerCommandPalette />
            {/* داخل معاينة الإعدادات: الصفحة فقط، بلا جولات أو نوافذ ترويجية */}
            {!embedded && <>
            <PwaInstallPrompt />
            <GameHint />
            <ClientTour />
            </>}
            <Toaster position="top-center" richColors closeButton />
           </MotionConfig>
          </LazyMotion>
        </ConfirmProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
