// ============================================================================
// gender.server.ts — جنس المصوّر/ة على الخادم لرسائل الإيميل/واتساب/الإشعارات
// ----------------------------------------------------------------------------
// الرسائل تُكتب بالمؤنّث مرة واحدة؛ هنا تُحوَّل حسب المستلم:
//   • للعروس عن المصوّر:    thirdToMale (المصوّرة وافقت ← المصوّر وافق)
//   • للمصوّر نفسه:         secondToMale (افحصي حسابكِ ← افحص حسابك)
// ============================================================================
import { secondToMale, thirdToMale } from "@/lib/gender-text";

const cache = new Map<string, string | null>();

export async function photographerGender(photographerId: string | null | undefined): Promise<string | null> {
  if (!photographerId) return null;
  if (cache.has(photographerId)) return cache.get(photographerId)!;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("profiles").select("gender").eq("id", photographerId).maybeSingle();
  const g = ((data as any)?.gender ?? null) as string | null;
  if (cache.size > 500) cache.clear();
  cache.set(photographerId, g);
  return g;
}

/** نص موجّه للعروس يتحدث عن المصوّر/ة. */
export async function aboutPhotographer(photographerId: string | null | undefined, text: string): Promise<string> {
  return (await photographerGender(photographerId)) === "male" ? thirdToMale(text) : text;
}

/** نص يخاطب المصوّر/ة نفسه. */
export async function toPhotographer(photographerId: string | null | undefined, text: string): Promise<string> {
  return (await photographerGender(photographerId)) === "male" ? secondToMale(text) : text;
}
