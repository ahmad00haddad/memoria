import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
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
});

function AuthenticatedLayout() {
  return <Outlet />;
}
