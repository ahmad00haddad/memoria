import { createFileRoute, Outlet, redirect, ErrorComponentProps } from "@tanstack/react-router";
import { AlertTriangle, RefreshCcw, Home } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  // Before loading the route, verify auth state on the client/server
  beforeLoad: async () => {
    // Note: TanStack Router runs this before mounting.
    // We check the session. If it doesn't exist, we throw a redirect.
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session) {
      throw redirect({
        to: "/login",
        search: {
          redirect: typeof window !== "undefined" ? window.location.pathname : "/",
        },
      });
    }

    return {
      session,
      userId: session.user.id,
    };
  },
  component: AuthenticatedLayout,
  errorComponent: GlobalAuthError,
});

function GlobalAuthError({ error, reset }: ErrorComponentProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center space-y-6">
      <div className="h-24 w-24 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
        <AlertTriangle className="h-12 w-12 text-red-500" />
      </div>
      <div className="space-y-2 max-w-md">
        <h1 className="font-serif text-3xl">عذراً! واجهنا مشكلة 🔌</h1>
        <p className="text-muted-foreground">حدث خطأ غير متوقع. لا تقلقي، بياناتك بأمان.</p>
        <p className="text-xs text-destructive bg-destructive/10 p-2 rounded-sm mt-4 text-left font-mono" dir="ltr">{error.message}</p>
      </div>
      <div className="flex gap-4">
        <button onClick={reset} className="inline-flex items-center gap-2 bg-charcoal text-ivory px-6 py-3 rounded-sm hover:opacity-90 transition">
          <RefreshCcw className="h-4 w-4" /> تحديث الصفحة
        </button>
        <Link to="/dashboard" className="inline-flex items-center gap-2 border border-border px-6 py-3 rounded-sm hover:bg-secondary transition">
          <Home className="h-4 w-4" /> العودة للرئيسية
        </Link>
      </div>
    </div>
  );
}

function AuthenticatedLayout() {
  return <Outlet />;
}
