import { supabase } from "@/integrations/supabase/client";

// الإعداد مكتمل = onboarding_completed_at، أو تلقائياً عند توفّر الاسم + اسم المستخدم + باقة واحدة.
// «تخطّي» لا يُنهيه: يؤجّل التحويل لهذه الجلسة فقط، وتبقى بطاقة «أكملي ملفك» في الرئيسية.

const LATER_KEY = "memoria-onboarding-later";
const doneFor = new Set<string>();

export function deferOnboarding() {
  try { sessionStorage.setItem(LATER_KEY, "1"); } catch { /* ignore */ }
}

export function isOnboardingDeferred() {
  try { return sessionStorage.getItem(LATER_KEY) === "1"; } catch { return false; }
}

export function markOnboardingDone(uid: string) {
  doneFor.add(uid);
}

/** true = يجب التحويل لمعالج الإعداد */
export async function checkOnboarding(uid: string): Promise<boolean> {
  if (doneFor.has(uid)) return false;
  const [{ data: p }, { count }] = await Promise.all([
    supabase.from("profiles").select("onboarding_completed_at, display_name, username").eq("id", uid).maybeSingle(),
    supabase.from("pricing_rules").select("id", { count: "exact", head: true }).eq("photographer_id", uid).neq("package", "addon"),
  ]);
  if ((p as any)?.onboarding_completed_at) { doneFor.add(uid); return false; }
  if (p?.display_name && p?.username && (count ?? 0) > 0) {
    await supabase.from("profiles").update({ onboarding_completed_at: new Date().toISOString() } as any).eq("id", uid);
    doneFor.add(uid);
    return false;
  }
  return !isOnboardingDeferred();
}
