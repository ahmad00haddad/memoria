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
    const { data: review, error: rErr } = await supabaseAdmin.from("reviews").select("id").eq("id", data.review_id).single();
    if (rErr || !review) throw new Error("review not found");
    const { error: updErr } = await supabaseAdmin.from("reviews").update({ is_published: true }).eq("id", data.review_id);
    if (updErr) throw new Error(updErr.message);
    await supabaseAdmin.from("audit_logs").insert({
      action: "review.approve",
      actor_id: userId,
      entity_type: "review",
      entity_id: data.review_id,
      after_data: { is_published: true }
    });
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
    const { data: review, error: rErr } = await supabaseAdmin.from("reviews").select("id").eq("id", data.review_id).single();
    if (rErr || !review) throw new Error("review not found");
    const { error: updErr } = await supabaseAdmin.from("reviews").update({ is_published: false }).eq("id", data.review_id);
    if (updErr) throw new Error(updErr.message);
    await supabaseAdmin.from("audit_logs").insert({
      action: "review.reject",
      actor_id: userId,
      entity_type: "review",
      entity_id: data.review_id,
      after_data: { is_published: false }
    });
    return { ok: true };
  });

export const adminTogglePublish = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { photographer_id: string; published: boolean }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await ensureAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: updErr } = await supabaseAdmin.from("profiles").update({ is_published: data.published, updated_at: new Date().toISOString() }).eq("id", data.photographer_id);
    if (updErr) throw new Error(updErr.message);
    await supabaseAdmin.from("audit_logs").insert({
      action: "profile.set_published",
      actor_id: userId,
      entity_type: "profile",
      entity_id: data.photographer_id,
      after_data: { is_published: data.published }
    });
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
    
    const { data: sub } = await supabaseAdmin
      .from("subscriptions")
      .select("current_period_end")
      .eq("photographer_id", data.photographer_id)
      .maybeSingle();

    const currentEnd = sub?.current_period_end ? new Date(sub.current_period_end) : null;
    const now = new Date();
    const start = currentEnd && currentEnd > now ? currentEnd : now;
    const end = new Date(start);
    end.setMonth(end.getMonth() + data.months);

    const { error: subErr } = await supabaseAdmin
      .from("subscriptions")
      .upsert({
        photographer_id: data.photographer_id,
        status: "active",
        current_period_start: now.toISOString(),
        current_period_end: end.toISOString(),
        trial_ends_at: now.toISOString(),
        updated_at: now.toISOString(),
      }, { onConflict: "photographer_id" });
    if (subErr) throw new Error(subErr.message);

    await supabaseAdmin.from("audit_logs").insert({
      action: "subscription.renew",
      actor_id: userId,
      entity_type: "subscription",
      entity_id: data.photographer_id,
      after_data: { months: data.months, current_period_end: end.toISOString() }
    });
    return { ok: true };
  });

export const adminDeletePhotographer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { photographer_id: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await ensureAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    
    await supabaseAdmin.from("messages").delete().in("booking_id", (await supabaseAdmin.from("bookings").select("id").eq("photographer_id", data.photographer_id)).data?.map((b: any) => b.id) ?? []);
    await supabaseAdmin.from("reviews").delete().eq("photographer_id", data.photographer_id);
    await supabaseAdmin.from("contracts").delete().eq("photographer_id", data.photographer_id);
    await supabaseAdmin.from("contract_templates").delete().eq("photographer_id", data.photographer_id);
    await supabaseAdmin.from("pricing_rules").delete().eq("photographer_id", data.photographer_id);
    await supabaseAdmin.from("photographer_unavailability").delete().eq("photographer_id", data.photographer_id);
    await supabaseAdmin.from("bookings").delete().eq("photographer_id", data.photographer_id);
    await supabaseAdmin.from("subscription_payments").delete().eq("photographer_id", data.photographer_id);
    await supabaseAdmin.from("subscriptions").delete().eq("photographer_id", data.photographer_id);
    await supabaseAdmin.from("referrals").delete().or(`referrer_id.eq.${data.photographer_id},referred_id.eq.${data.photographer_id}`);
    await supabaseAdmin.from("notifications").delete().eq("user_id", data.photographer_id);
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.photographer_id);
    const { error: delErr } = await supabaseAdmin.from("profiles").delete().eq("id", data.photographer_id);
    if (delErr) throw new Error(delErr.message);

    await supabaseAdmin.from("audit_logs").insert({
      action: "profile.delete",
      actor_id: userId,
      entity_type: "profile",
      entity_id: data.photographer_id,
      after_data: { deleted: true }
    });

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
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ deleted_at: new Date().toISOString(), is_published: false, updated_at: new Date().toISOString() })
      .eq("id", data.photographer_id);
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("audit_logs").insert({
      action: "soft_delete",
      actor_id: userId,
      entity_type: "photographer",
      entity_id: data.photographer_id,
      after_data: { archived_at: new Date().toISOString() }
    });
    return { ok: true };
  });

export const adminRestorePhotographer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { photographer_id: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await ensureAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ deleted_at: null, updated_at: new Date().toISOString() })
      .eq("id", data.photographer_id);
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("audit_logs").insert({
      action: "restore",
      actor_id: userId,
      entity_type: "photographer",
      entity_id: data.photographer_id,
      after_data: { restored_at: new Date().toISOString() }
    });
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
    
    if (!["verified", "rejected", "pending_review", "unverified"].includes(data.status)) {
      throw new Error("invalid status");
    }
    const now = new Date().toISOString();
    const updateData: any = {
      verification_status: data.status,
      verified_by: userId,
      updated_at: now
    };
    if (data.status === "verified") {
      updateData.verified_at = now;
    }
    const { error } = await supabaseAdmin
      .from("profiles")
      .update(updateData)
      .eq("id", data.photographer_id);
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("audit_logs").insert({
      action: "profile.verification",
      actor_id: userId,
      entity_type: "profile",
      entity_id: data.photographer_id,
      after_data: { verification_status: data.status }
    });
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
    
    const { data: booking, error: bErr } = await supabaseAdmin
      .from("bookings")
      .select("*")
      .eq("id", data.booking_id)
      .is("deleted_at", null)
      .single();
    if (bErr || !booking) throw new Error("booking not found");
    if (booking.status === "completed") throw new Error("CANNOT_CANCEL_COMPLETED");
    if (booking.status === "cancelled") throw new Error("ALREADY_CANCELLED");

    // Calculate refund if deposit is confirmed
    let refund = 0;
    let refundStatus = "none";
    if (booking.deposit_confirmed_at && (booking.deposit_amount ?? 0) > 0) {
      const { data: photographer } = await supabaseAdmin
        .from("profiles")
        .select("deposit_refund_policy, deposit_refund_percent")
        .eq("id", booking.photographer_id)
        .single();
      const policy = photographer?.deposit_refund_policy ?? "full";
      const percent = photographer?.deposit_refund_percent ?? 0;
      if (policy === "full") {
        refund = booking.deposit_amount;
      } else if (policy === "partial") {
        refund = Math.round(booking.deposit_amount * (percent / 100) * 100) / 100;
      } else {
        refund = 0;
      }
      refundStatus = refund > 0 ? "pending" : "none";
    }

    const { error: updErr } = await supabaseAdmin
      .from("bookings")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        cancellation_reason: data.reason.slice(0, 2000),
        cancelled_by: userId,
        refund_amount: refund,
        refund_status: refundStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.booking_id);
    if (updErr) throw new Error(updErr.message);

    await supabaseAdmin.from("audit_logs").insert({
      action: "booking.cancel",
      actor_id: userId,
      entity_type: "booking",
      entity_id: data.booking_id,
      after_data: { status: "cancelled", reason: data.reason, refund_amount: refund }
    });
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