import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const signContract = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({
    token: z.string().min(10),
    signature: z.string().min(2).max(120),
    client_name: z.string().min(2).max(120),
  }).parse(d))
  .handler(async ({ data }) => {
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
    const { data: c } = await supabaseAdmin.from("contracts").select(
      "id, body, client_name, status, signed_at, client_signature, booking_id, photographer_id"
    ).eq("sign_token", data.token).maybeSingle();
    if (!c) return null;
    const { data: b } = await supabaseAdmin.from("bookings").select(
      "event_date,start_time,end_time,venue_name,total_price,deposit_amount,service"
    ).eq("id", c.booking_id).maybeSingle();
    const { data: p } = await supabaseAdmin.from("profiles").select(
      "display_name,username,phone,cliq_alias"
    ).eq("id", c.photographer_id).maybeSingle();
    return { contract: c, booking: b, photographer: p };
  });