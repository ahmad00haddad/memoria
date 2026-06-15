import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

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
      { title: "EliteCapture — منصة مصوّري الأعراس في الأردن" },
      { name: "description", content: "احجز مصوّر عرسك بسهولة: مواعيد، أسعار، وعربون فوري دون واتساب." },
      { property: "og:title", content: "EliteCapture — منصة مصوّري الأعراس في الأردن" },
      { property: "og:description", content: "احجز مصوّر عرسك بسهولة: مواعيد، أسعار، وعربون فوري دون واتساب." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:title", content: "EliteCapture — منصة مصوّري الأعراس في الأردن" },
      { name: "twitter:description", content: "احجز مصوّر عرسك بسهولة: مواعيد، أسعار، وعربون فوري دون واتساب." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/83dd160b-9aba-4bde-a5a9-99257e81d3c0/id-preview-13a5526b--7bd5f253-4c5b-448c-8e90-d0c390e715d9.lovable.app-1778482404342.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/83dd160b-9aba-4bde-a5a9-99257e81d3c0/id-preview-13a5526b--7bd5f253-4c5b-448c-8e90-d0c390e715d9.lovable.app-1778482404342.png" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/app-icon-512.png" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "EliteCapture",
          url: "https://royal-lens-flow.lovable.app",
          inLanguage: "ar",
          potentialAction: {
            "@type": "SearchAction",
            target: "https://royal-lens-flow.lovable.app/search?q={search_term_string}",
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
    <html lang="ar" dir="rtl">
      <head>
        <HeadContent />
      </head>
      <body>
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

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <Toaster position="top-center" richColors />
    </QueryClientProvider>
  );
}
