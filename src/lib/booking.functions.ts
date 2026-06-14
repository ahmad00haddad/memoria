import { createServerFn } from "@tanstack/react-start";

type BookingItemInput = { rule_id: string; qty: number };

type SubmitInput = {
  photographer_id: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  event_date: string;
  start_time: string;
  end_time: string;
  venue_address?: string | null;
  items: BookingItemInput[];
  client_notes?: string | null;
  privacy_level: "public" | "private_only";
};

function validateInput(d: SubmitInput): SubmitInput {
  const isUuid = (s: any) => typeof s === "string" && /^[0-9a-f-]{36}$/i.test(s);
  const isDate = (s: any) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
  const isTime = (s: any) => typeof s === "string" && /^\d{2}:\d{2}(:\d{2})?$/.test(s);
  if (!d || typeof d !== "object") throw new Error("invalid payload");
  if (!isUuid(d.photographer_id)) throw new Error("invalid photographer_id");
  if (!d.client_name || d.client_name.length > 120) throw new Error("invalid client_name");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.client_email ?? "")) throw new Error("invalid email");
  if (!d.client_phone || d.client_phone.length > 30) throw new Error("invalid phone");
  if (!isDate(d.event_date)) throw new Error("invalid event_date");
  if (!isTime(d.start_time) || !isTime(d.end_time)) throw new Error("invalid time");
  if (!Array.isArray(d.items) || d.items.length === 0 || d.items.length > 30) throw new Error("invalid items");
  for (const it of d.items) {
    if (!isUuid(it.rule_id)) throw new Error("invalid item rule_id");
    if (!Number.isInteger(it.qty) || it.qty < 1 || it.qty > 50) throw new Error("invalid item qty");
  }
  if (d.privacy_level !== "public" && d.privacy_level !== "private_only") throw new Error("invalid privacy_level");
  if (d.venue_address && d.venue_address.length > 500) throw new Error("invalid venue");
  if (d.client_notes && d.client_notes.length > 4000) throw new Error("invalid notes");
  return d;
}

export const submitBookingRequest = createServerFn({ method: "POST" })
  .inputValidator((d: SubmitInput) => validateInput(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Server-side authoritative price recompute.
    const ruleIds = data.items.map((i) => i.rule_id);
    const { data: rules, error: rulesErr } = await supabaseAdmin
      .from("pricing_rules")
      .select("id, photographer_id, label, price, service, is_addon")
      .in("id", ruleIds);
    if (rulesErr) throw new Error(rulesErr.message);
    const ruleMap = new Map((rules ?? []).map((r: any) => [r.id, r]));
    for (const it of data.items) {
      const r = ruleMap.get(it.rule_id);
      if (!r || r.photographer_id !== data.photographer_id) {
        throw new Error("باقة غير صالحة");
      }
    }

    const mainItem = data.items.find((i) => !ruleMap.get(i.rule_id)!.is_addon);
    if (!mainItem) throw new Error("يجب اختيار باقة أساسية");
    const mainRule: any = ruleMap.get(mainItem.rule_id);

    const items = data.items.map((it) => {
      const r: any = ruleMap.get(it.rule_id);
      return {
        rule_id: r.id,
        label: r.label,
        price: Number(r.price),
        qty: it.qty,
        kind: r.is_addon ? ("addon" as const) : ("main" as const),
      };
    });

    const basePrice = Number(mainRule.price) * (mainItem.qty || 1);
    const total = items.reduce((s, x) => s + x.price * x.qty, 0);

    // Photographer's deposit configuration
    const { data: profile, error: profErr } = await supabaseAdmin
      .from("profiles")
      .select("id, display_name, username, fixed_deposit, deposit_percent")
      .eq("id", data.photographer_id)
      .single();
    if (profErr || !profile) throw new Error("المصوّرة غير موجودة");

    const deposit = total > 0
      ? (profile.fixed_deposit != null
          ? Number(profile.fixed_deposit)
          : Math.round(total * (Number(profile.deposit_percent ?? 25) / 100)))
      : 0;

    const summaryLabel = `${mainRule.label}${items.length > 1 ? ` +${items.length - 1} إضافات` : ""}`;

    const { data: row, error } = await supabaseAdmin
      .from("bookings")
      .insert({
        photographer_id: data.photographer_id,
        client_name: data.client_name,
        client_email: data.client_email,
        client_phone: data.client_phone,
        service: mainRule.service as any,
        event_date: data.event_date,
        start_time: data.start_time,
        end_time: data.end_time,
        venue_address: data.venue_address ?? null,
        base_price: basePrice,
        travel_fee: 0,
        total_price: total,
        deposit_amount: deposit,
        privacy_level: data.privacy_level,
        photographer_can_publish: data.privacy_level === "public",
        client_notes: data.client_notes ?? null,
        contract_agreed: true,
        status: "pending_deposit" as any,
        addons: items,
      })
      .select("id, client_tracking_token")
      .single();

    if (error) throw new Error(error.message);

    const { data: priv } = await supabaseAdmin
      .from("photographer_private")
      .select("whatsapp, phone")
      .eq("user_id", data.photographer_id)
      .maybeSingle();

    // In-app notification for the photographer
    await supabaseAdmin.from("notifications").insert({
      user_id: data.photographer_id,
      title: "طلب حجز جديد",
      body: `${data.client_name} يرغب بحجز ${summaryLabel} بتاريخ ${data.event_date}`,
      link: `/dashboard/bookings/${row.id}`,
    });

    console.log("[booking] new request", {
      photographer: profile.username,
      whatsapp: priv?.whatsapp,
      booking_id: row.id,
      client: data.client_name,
    });

    return {
      booking_id: row.id as string,
      tracking_token: row.client_tracking_token as string,
    };
  });

export const getBookingByToken = createServerFn({ method: "GET" })
  .inputValidator((d: { token: string }) => d)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin.rpc("get_booking_by_token", { _token: data.token });
    if (error) throw new Error(error.message);
    return row ?? null;
  });

export const clientMarkDepositSent = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string; proof_path?: string | null; reference?: string | null; note?: string | null }) => d)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.rpc("client_mark_deposit_sent", {
      _token: data.token,
      _proof_path: (data.proof_path ?? null) as any,
      _reference: (data.reference ?? null) as any,
      _note: (data.note ?? null) as any,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const clientMarkReceived = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string }) => d)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.rpc("client_mark_received", { _token: data.token });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const clientAddNote = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string; note: string }) => d)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.rpc("client_add_note", { _token: data.token, _note: data.note });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const submitReviewByToken = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string; rating: number; comment?: string | null; client_name?: string | null }) => {
    if (!d || typeof d.token !== "string" || d.token.length < 16) throw new Error("invalid token");
    if (!Number.isInteger(d.rating) || d.rating < 1 || d.rating > 5) throw new Error("invalid rating");
    if (d.comment && d.comment.length > 2000) throw new Error("comment too long");
    if (d.client_name && d.client_name.length > 120) throw new Error("name too long");
    return d;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: booking, error: bErr } = await supabaseAdmin
      .from("bookings")
      .select("id, photographer_id, status, client_name, client_received_at")
      .eq("client_tracking_token", data.token)
      .maybeSingle();
    if (bErr) throw new Error(bErr.message);
    if (!booking) throw new Error("الحجز غير موجود");
    if (booking.status !== "completed" && booking.status !== "delivered") {
      throw new Error("لا يمكن التقييم قبل اكتمال الحجز");
    }

    const { error } = await supabaseAdmin
      .from("reviews")
      .insert({
        booking_id: booking.id,
        photographer_id: booking.photographer_id,
        client_name: (data.client_name || booking.client_name || "عميلة").slice(0, 120),
        rating: data.rating,
        comment: data.comment ?? null,
        is_published: true,
      } as any);
    if (error) {
      if (/duplicate|unique/i.test(error.message)) {
        throw new Error("تم تسجيل تقييم لهذا الحجز سابقًا");
      }
      throw new Error(error.message);
    }
    return { ok: true };
  });