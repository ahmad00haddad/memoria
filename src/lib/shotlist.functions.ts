import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ============================================================================
// shotlist.functions.ts — حفظ قائمة اللقطات في قاعدة البيانات
// استبدال الحفظ في localStorage بـ DB لضمان عدم فقدان البيانات عند إعادة التحميل
// ============================================================================

const UUID_RE = /^[0-9a-f-]{36}$/i;

export type ShotListItem = {
  id?: string;
  label: string;
  done: boolean;
  sort_order: number;
};

// جلب قائمة اللقطات لحجز معيّن
export const getShotList = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { booking_id: string }) => {
    if (!d || typeof d.booking_id !== "string" || !UUID_RE.test(d.booking_id)) {
      throw new Error("invalid booking_id");
    }
    return d;
  })
  .handler(async ({ data, context }) => {
    const { supabase } = context as any;
    const { data: items, error } = await supabase
      .from("shot_list_items")
      .select("id, label, done, sort_order")
      .eq("booking_id", data.booking_id)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (items ?? []) as ShotListItem[];
  });

// حفظ قائمة اللقطات بالكامل (batch upsert)
export const saveShotList = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { booking_id: string; items: ShotListItem[] }) => {
    if (!d || typeof d.booking_id !== "string" || !UUID_RE.test(d.booking_id)) {
      throw new Error("invalid booking_id");
    }
    if (!Array.isArray(d.items) || d.items.length > 200) {
      throw new Error("items يجب أن تكون مصفوفة (200 عنصر كحد أقصى)");
    }
    for (const item of d.items) {
      if (!item.label || typeof item.label !== "string" || item.label.length > 500) {
        throw new Error("label غير صالح");
      }
    }
    return d;
  })
  .handler(async ({ data, context }) => {
    const { supabase } = context as any;

    // التحقق من الملكية عبر RPC (يُطبّق RLS)
    const { error } = await supabase.rpc("upsert_shot_list", {
      _booking_id: data.booking_id,
      _items: JSON.stringify(data.items.map((item, i) => ({
        id: item.id || null,
        label: item.label,
        done: item.done ?? false,
        sort_order: item.sort_order ?? i,
      }))),
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// تحديث حالة done لعنصر واحد
export const toggleShotListItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { booking_id: string; item_id: string; done: boolean }) => {
    if (!d || typeof d.booking_id !== "string" || !UUID_RE.test(d.booking_id)) {
      throw new Error("invalid booking_id");
    }
    if (!d.item_id || typeof d.item_id !== "string" || !UUID_RE.test(d.item_id)) {
      throw new Error("invalid item_id");
    }
    return d;
  })
  .handler(async ({ data, context }) => {
    const { supabase } = context as any;
    // RLS تضمن أن المصوّرة تملك الحجز المرتبط
    const { error } = await supabase
      .from("shot_list_items")
      .update({ done: data.done, updated_at: new Date().toISOString() })
      .eq("id", data.item_id)
      .eq("booking_id", data.booking_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
