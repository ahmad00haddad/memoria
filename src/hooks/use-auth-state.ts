import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Session = Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"];

type AuthState = {
  loading: boolean;
  authed: boolean;
  userId: string | null;
  isPhotographer: boolean;
};

function metadataSaysPhotographer(session: Session) {
  return session?.user.user_metadata?.role === "photographer";
}

export function useAuthState(): AuthState {
  const [state, setState] = useState<AuthState>({
    loading: true,
    authed: false,
    userId: null,
    isPhotographer: false,
  });

  useEffect(() => {
    let active = true;

    const load = async (sessionOverride?: Session) => {
      const session = sessionOverride ?? (await supabase.auth.getSession()).data.session;
      if (!active) return;

      if (!session) {
        setState({ loading: false, authed: false, userId: null, isPhotographer: false });
        return;
      }

      const fallbackPhotographer = metadataSaysPhotographer(session);
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", session.user.id)
        .maybeSingle();

      if (!active) return;
      setState({
        loading: false,
        authed: true,
        userId: session.user.id,
        isPhotographer: !!profile || fallbackPhotographer,
      });
    };

    void load();
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      queueMicrotask(() => {
        void load(session);
      });
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  return state;
}