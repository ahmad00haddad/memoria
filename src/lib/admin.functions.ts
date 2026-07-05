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
      .select("id, username, display_name, is_published, avatar_url, created_at, deleted_at, verification_status")
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

// ----- مراجعة التقييمات (Reviews moderation) -----
export const listReviewsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as any;
    await ensureAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: reviews } = await supabaseAdmin
      .from("reviews")
      .select("id, photographer_id, booking_id, client_name, rating, comment, is_published, created_at")
      .order("created_at", { ascending: false });

    // ربط أسماء المصوّرات (تجميعة واحدة — تفادي N+1).
    const ids = [...new Set((reviews ?? []).map((r: any) => r.photographer_id))];
    const { data: profiles } = ids.length
      ? await supabaseAdmin.from("profiles").select("id, username, display_name").in("id", ids)
      : { data: [] as any[] };
    const profMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));

    return (reviews ?? []).map((r: any) => ({
      ...r,
      profile: profMap.get(r.photographer_id) ?? null,
    }));
  });

export const adminApproveReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { review_id: string }) => {
    if (!d || typeof d.review_id !== "string" || !/^[0-9a-f-]{36}$/i.test(d.review_id)) {
      throw new Error("invalid review_id");
    }
    return d;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await ensureAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.rpc("approve_review", { _review_id: data.review_id });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminRejectReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { review_id: string }) => {
    if (!d || typeof d.review_id !== "string" || !/^[0-9a-f-]{36}$/i.test(d.review_id)) {
      throw new Error("invalid review_id");
    }
    return d;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await ensureAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.rpc("reject_review", { _review_id: data.review_id });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminTogglePublish = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { photographer_id: string; published: boolean }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await ensureAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.rpc("admin_set_published", {
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
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.rpc("admin_renew_subscription", {
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
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.rpc("delete_photographer_cascade", {
      _photographer_id: data.photographer_id,
    });
    if (error) throw new Error(error.message);
    // Also remove the auth user via admin client
    try {
      await (supabaseAdmin as any).auth.admin.deleteUser(data.photographer_id);
    } catch (e) {
      // ignore — profile data already wiped
    }
    return { ok: true };
  });

export const adminSoftDeletePhotographer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { photographer_id: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await ensureAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.rpc("soft_delete_photographer", {
      _photographer_id: data.photographer_id,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminRestorePhotographer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { photographer_id: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await ensureAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.rpc("restore_photographer", {
      _photographer_id: data.photographer_id,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listSubscriptionPaymentsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as any;
    await ensureAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: payments, error } = await supabaseAdmin
      .from("subscription_payments")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const ids = Array.from(new Set((payments ?? []).map((p: any) => p.photographer_id)));
    const { data: profs } = ids.length
      ? await supabaseAdmin.from("profiles").select("id, username, display_name").in("id", ids)
      : { data: [] as any[] };
    const map = new Map((profs ?? []).map((p: any) => [p.id, p]));

    // signed urls for proofs
    const enriched = await Promise.all((payments ?? []).map(async (p: any) => {
      let proof_signed_url: string | null = null;
      if (p.proof_url) {
        const { data: s } = await supabaseAdmin.storage.from("payment-proofs").createSignedUrl(p.proof_url, 3600);
        proof_signed_url = s?.signedUrl ?? null;
      }
      return { ...p, profile: map.get(p.photographer_id) ?? null, proof_signed_url };
    }));
    return enriched;
  });

export const adminApproveSubscriptionPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { payment_id: string; months: number }) => {
    if (!/^[0-9a-f-]{36}$/i.test(d?.payment_id ?? "")) throw new Error("invalid payment_id");
    if (!Number.isInteger(d?.months) || d.months < 1 || d.months > 36) throw new Error("months 1-36");
    return d;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await ensureAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: payment, error: pErr } = await supabaseAdmin
      .from("subscription_payments")
      .select("id, photographer_id, status")
      .eq("id", data.payment_id)
      .single();
    if (pErr || !payment) throw new Error("الدفعة غير موجودة");
    if (payment.status !== "pending") throw new Error("تمت معالجة هذه الدفعة سابقًا");

    const { error: e1 } = await supabaseAdmin
      .from("subscription_payments")
      .update({ status: "approved", reviewed_at: new Date().toISOString(), reviewed_by: userId, period_months: data.months })
      .eq("id", data.payment_id);
    if (e1) throw new Error(e1.message);

    const { error: e2 } = await supabaseAdmin.rpc("admin_renew_subscription", {
      _photographer_id: payment.photographer_id,
      _months: data.months,
    });
    if (e2) throw new Error(e2.message);
    return { ok: true };
  });

export const adminRejectSubscriptionPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { payment_id: string; reason: string }) => {
    if (!/^[0-9a-f-]{36}$/i.test(d?.payment_id ?? "")) throw new Error("invalid payment_id");
    if (!d.reason || d.reason.length > 500) throw new Error("invalid reason");
    return d;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await ensureAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("subscription_payments")
      .update({ status: "rejected", reviewed_at: new Date().toISOString(), reviewed_by: userId, notes: data.reason })
      .eq("id", data.payment_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminVerifyPhotographer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { photographer_id: string; status: "verified" | "rejected" | "unverified" | "pending_review" }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await ensureAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.rpc("admin_verify_photographer", {
      _photographer_id: data.photographer_id,
      _status: data.status,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listBookingsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as any;
    await ensureAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("bookings")
      .select("id, client_name, client_email, client_phone, event_date, start_time, end_time, total_price, deposit_amount, status, photographer_id")
      .is("deleted_at", null)
      .order("event_date", { ascending: false });
    if (error) throw new Error(error.message);

    const ids = Array.from(new Set((data ?? []).map((b: any) => b.photographer_id)));
    const { data: profs } = ids.length
      ? await supabaseAdmin.from("profiles").select("id, username, display_name").in("id", ids)
      : { data: [] as any[] };
    const map = new Map((profs ?? []).map((p: any) => [p.id, p]));

    return (data ?? []).map((b: any) => ({
      ...b,
      photographer: map.get(b.photographer_id) ?? null,
    }));
  });

export const adminCancelBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { booking_id: string; reason: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await ensureAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.rpc("cancel_booking", {
      _booking_id: data.booking_id,
      _reason: data.reason,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listDisputesAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as any;
    await ensureAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("booking_disputes")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const bookingIds = Array.from(new Set((data ?? []).map((d: any) => d.booking_id)));
    const { data: bookings } = bookingIds.length
      ? await supabaseAdmin.from("bookings").select("id, client_name, photographer_id").in("id", bookingIds)
      : { data: [] as any[] };
    const bookMap = new Map((bookings ?? []).map((b: any) => [b.id, b]));

    const photographerIds = Array.from(new Set((bookings ?? []).map((b: any) => b.photographer_id)));
    const { data: profs } = photographerIds.length
      ? await supabaseAdmin.from("profiles").select("id, username, display_name").in("id", photographerIds)
      : { data: [] as any[] };
    const profMap = new Map((profs ?? []).map((p: any) => [p.id, p]));

    return (data ?? []).map((d: any) => {
      const b = bookMap.get(d.booking_id) ?? null;
      return {
        ...d,
        booking: b,
        photographer: b ? profMap.get(b.photographer_id) : null,
      };
    });
  });

export const adminResolveDispute = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { dispute_id: string; status: "resolved" | "dismissed"; resolution: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await ensureAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("booking_disputes")
      .update({
        status: data.status,
        resolution: data.resolution,
        resolved_by: userId,
        resolved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.dispute_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });