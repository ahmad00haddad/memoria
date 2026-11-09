import { supabase } from "@/integrations/supabase/client";
import { parseMethods } from "@/lib/payment-methods";

// كاش بيانات صفحات اللوحة (في الذاكرة + sessionStorage): الصفحة تُرسم فوراً من آخر بيانات
// ثم تتحدّث بصمت. وبعد فتح الرئيسية نجلب بيانات الصفحات الثقيلة في الخلفية،
// فيبدو التنقل فورياً كتطبيق حقيقي.

const mem = new Map<string, { at: number; v: any }>();
const SS = "memoria-pc:";

export function getCached<T = any>(key: string): T | undefined {
  const m = mem.get(key);
  if (m) return m.v as T;
  try {
    const raw = sessionStorage.getItem(SS + key);
    if (raw) { const o = JSON.parse(raw); mem.set(key, o); return o.v as T; }
  } catch { /* ignore */ }
  return undefined;
}

export function setCached(key: string, v: any) {
  const o = { at: Date.now(), v };
  mem.set(key, o);
  try { sessionStorage.setItem(SS + key, JSON.stringify(o)); } catch { /* ignore */ }
}

const fetchers: Record<string, (uid: string) => Promise<any>> = {
  profile: async (uid) => {
    const [{ data }, { data: priv }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
      supabase.from("photographer_private").select("*").eq("user_id", uid).maybeSingle(),
    ]);
    return { ...(data ?? {}), ...(priv ?? {}), payment_methods: parseMethods((priv as any)?.payment_methods) };
  },
  pricing: async (uid) => {
    const [{ data, error }, { data: prof }] = await Promise.all([
      supabase.from("pricing_rules").select("*").eq("photographer_id", uid).order("price"),
      supabase.from("profiles").select("deposit_percent,fixed_deposit").eq("id", uid).maybeSingle(),
    ]);
    if (error) throw error;
    return { rules: data ?? [], prof };
  },
  production: async (uid) => {
    const { data, error } = await supabase.from("bookings")
      .select("id,client_name,event_date,start_time,end_time,total_price,production_stage,delivery_due_at,selection_link,status,editing_started_at,editing_completed_at,delivered_at,final_paid_at")
      .eq("photographer_id", uid).is("deleted_at", null).in("status", ["confirmed", "completed"]).order("event_date", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  },
};

const inflight = new Map<string, Promise<any>>();

/** يجلب ويحدّث الكاش (طلب واحد مشترك إن كان جارياً) */
export function fetchPage<T = any>(key: keyof typeof fetchers, uid: string): Promise<T> {
  const k = `${key}:${uid}`;
  if (inflight.has(k)) return inflight.get(k)!;
  const p = fetchers[key](uid).then((v) => { setCached(k, v); return v; }).finally(() => inflight.delete(k));
  inflight.set(k, p);
  return p;
}

export const cacheKey = (key: keyof typeof fetchers, uid: string) => `${key}:${uid}`;

/** جلب صامت لبيانات الصفحات الثقيلة بعد تحميل الرئيسية (وقت الفراغ) */
export function prefetchDashboardPages(uid: string) {
  if (typeof window === "undefined") return;
  const run = () => {
    for (const key of Object.keys(fetchers) as (keyof typeof fetchers)[]) {
      const c = mem.get(cacheKey(key, uid));
      if (c && Date.now() - c.at < 60_000) continue;
      fetchPage(key, uid).catch(() => {});
    }
  };
  const ric = (window as any).requestIdleCallback as ((cb: () => void, o?: any) => void) | undefined;
  if (ric) ric(run, { timeout: 2500 }); else setTimeout(run, 1200);
}
