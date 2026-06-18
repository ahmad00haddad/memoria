import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const signContract = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({
    token: z.string().min(10),
    signature: z.string().min(2).max(120),
    client_name: z.string().min(2).max(120),
  }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: c } = await supabaseAdmin.from("contracts").select("*").eq("sign_token", data.token).maybeSingle();
    if (!c) throw new Error("Contract not found");
    if (c.status === "signed") throw new Error("Already signed");
    const { error } = await supabaseAdmin.from("contracts").update({
      status: "signed",
      signed_at: new Date().toISOString(),
      client_signature: data.signature,
      client_name: data.client_name,
    }).eq("id", c.id);
    if (error) throw error;
    await supabaseAdmin.from("notifications").insert({
      user_id: c.photographer_id,
      title: "تم توقيع العقد",
      body: `وقّع ${data.client_name} العقد.`,
      link: `/dashboard/bookings/${c.booking_id}`,
    });
    return { ok: true };
  });

export const getContractByToken = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ token: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: c } = await supabaseAdmin.from("contracts").select(
      "id, body, client_name, status, signed_at, client_signature, booking_id, photographer_id"
    ).eq("sign_token", data.token).maybeSingle();
    if (!c) return null;
    const { data: b } = await supabaseAdmin.from("bookings").select(
      "event_date,start_time,end_time,venue_name,total_price,deposit_amount,service"
    ).eq("id", c.booking_id).maybeSingle();
    const { data: p } = await supabaseAdmin.from("profiles").select(
      "display_name,username"
    ).eq("id", c.photographer_id).maybeSingle();
    const { data: pp } = await supabaseAdmin.from("photographer_private").select(
      "phone,cliq_alias"
    ).eq("user_id", c.photographer_id).maybeSingle();
    return { contract: c, booking: b, photographer: { ...(p ?? {}), ...(pp ?? {}) } };
  });

// ينشئ عقدًا لحجز معيّن مع التحقق من ملكية المصوّر للحجز (يمنع إنشاء عقود على حجوزات الآخرين).
export const createContractForBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    booking_id: z.string().uuid(),
    body: z.string().min(20).max(20000),
    client_name: z.string().min(2).max(120),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    // تأكدي أن الحجز يخصّ هذه المصوّرة فعلاً
    const { data: bk, error: bkErr } = await supabase
      .from("bookings")
      .select("id, photographer_id")
      .eq("id", data.booking_id)
      .maybeSingle();
    if (bkErr) throw new Error(bkErr.message);
    if (!bk) throw new Error("Booking not found");
    if (bk.photographer_id !== userId) throw new Error("Forbidden");

    // لا تكرّري عقدًا قائمًا
    const { data: existing } = await supabase
      .from("contracts").select("id").eq("booking_id", data.booking_id).maybeSingle();
    if (existing) throw new Error("Contract already exists");

    const { error } = await supabase.from("contracts").insert({
      booking_id: data.booking_id,
      photographer_id: userId,
      body: data.body,
      client_name: data.client_name,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });