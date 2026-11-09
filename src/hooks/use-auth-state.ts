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

// حالة مشتركة لكل الصفحة: كانت كل نسخة من الـ hook ترسل طلبين لـ profiles (16 طلباً في اللوحة).
// الآن طلب واحد لكل مستخدم، واشتراك واحد في تغيّر الجلسة.
let shared: AuthState = { loading: true, authed: false, userId: null, isPhotographer: false };
const listeners = new Set<(s: AuthState) => void>();
const roleCache = new Map<string, Promise<boolean>>();
let started = false;

function publish(next: AuthState) {
  shared = next;
  listeners.forEach((l) => l(next));
}

async function load(sessionOverride?: Session | null) {
  const session = sessionOverride !== undefined ? sessionOverride : (await supabase.auth.getSession()).data.session;
  if (!session) {
    publish({ loading: false, authed: false, userId: null, isPhotographer: false });
    return;
  }
  const uid = session.user.id;
  if (!roleCache.has(uid)) {
    roleCache.set(uid, Promise.resolve(
      supabase.from("profiles").select("id").eq("id", uid).maybeSingle().then(({ data }) => !!data, () => false),
    ));
  }
  const hasProfile = await roleCache.get(uid)!;
  publish({ loading: false, authed: true, userId: uid, isPhotographer: hasProfile || metadataSaysPhotographer(session) });
}

function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  void load();
  supabase.auth.onAuthStateChange((event, session) => {
    // setTimeout (not a microtask): calling Supabase from inside this callback
    // while it still holds the auth lock deadlocks, leaving pages stuck loading.
    if (event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED") return;
    setTimeout(() => { void load(session); }, 0);
  });
}

export function useAuthState(): AuthState {
  const [state, setState] = useState<AuthState>(shared);

  useEffect(() => {
    listeners.add(setState);
    setState(shared);
    start();
    return () => { listeners.delete(setState); };
  }, []);

  return state;
}
