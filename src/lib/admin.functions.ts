import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function ensureAdmin(supabase: any, userId: string) {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  const ok = (data ?? []).some((r: any) => r.role === "admin");
  if (!ok) throw new Error("forbidden");
}

export const listPhotographersAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as any;
    await ensureAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, username, display_name, is_published, avatar_url, created_at")
      .order("created_at", { ascending: false });

    const ids = (profiles ?? []).map((p: any) => p.id);
    const [{ data: subs }, { data: bookings }, { data: reviews }] = await Promise.all([
      ids.length ? supabaseAdmin.from("subscriptions").select("photographer_id, status, current_period_end, trial_ends_at").in("photographer_id", ids) : Promise.resolve({ data: [] as any[] }),
      ids.length ? supabaseAdmin.from("bookings").select("photographer_id").in("photographer_id", ids) : Promise.resolve({ data: [] as any[] }),
      ids.length ? supabaseAdmin.from("reviews").select("photographer_id, rating").in("photographer_id", ids) : Promise.resolve({ data: [] as any[] }),
    ]);

    const subMap = new Map((subs ?? []).map((s: any) => [s.photographer_id, s]));
    const bookCount = new Map<string, number>();
    (bookings ?? []).forEach((b: any) => bookCount.set(b.photographer_id, (bookCount.get(b.photographer_id) ?? 0) + 1));
    const revCount = new Map<string, number>();
    (reviews ?? []).forEach((r: any) => revCount.set(r.photographer_id, (revCount.get(r.photographer_id) ?? 0) + 1));

    return (profiles ?? []).map((p: any) => ({
      ...p,
      subscription: subMap.get(p.id) ?? null,
      bookings_count: bookCount.get(p.id) ?? 0,
      reviews_count: revCount.get(p.id) ?? 0,
    }));
  });

export const adminTogglePublish = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { photographer_id: string; published: boolean }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await ensureAdmin(supabase, userId);
    const { error } = await supabase.rpc("admin_set_published", {
      _photographer_id: data.photographer_id,
      _published: data.published,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminRenewSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { photographer_id: string; months: number }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await ensureAdmin(supabase, userId);
    if (!data.months || data.months < 1 || data.months > 36) throw new Error("months must be 1-36");
    const { error } = await supabase.rpc("admin_renew_subscription", {
      _photographer_id: data.photographer_id,
      _months: data.months,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeletePhotographer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { photographer_id: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await ensureAdmin(supabase, userId);
    const { error } = await supabase.rpc("delete_photographer_cascade", {
      _photographer_id: data.photographer_id,
    });
    if (error) throw new Error(error.message);
    // Also remove the auth user via admin client
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await (supabaseAdmin as any).auth.admin.deleteUser(data.photographer_id);
    } catch (e) {
      // ignore — profile data already wiped
    }
    return { ok: true };
  });