import { createServerFn } from "@tanstack/react-start";

type SubmitInput = {
  photographer_id: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  service: string;
  event_date: string;
  start_time: string;
  end_time: string;
  venue_address?: string | null;
  base_price: number;
  total_price: number;
  deposit_amount: number;
  package_id: string;
  package_label: string;
  client_notes?: string | null;
  privacy_level: "public" | "private_only";
};

export const submitBookingRequest = createServerFn({ method: "POST" })
  .inputValidator((d: SubmitInput) => d)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row, error } = await supabaseAdmin
      .from("bookings")
      .insert({
        photographer_id: data.photographer_id,
        client_name: data.client_name,
        client_email: data.client_email,
        client_phone: data.client_phone,
        service: data.service as any,
        event_date: data.event_date,
        start_time: data.start_time,
        end_time: data.end_time,
        venue_address: data.venue_address ?? null,
        base_price: data.base_price,
        travel_fee: 0,
        total_price: data.total_price,
        deposit_amount: data.deposit_amount,
        privacy_level: data.privacy_level,
        photographer_can_publish: data.privacy_level === "public",
        client_notes: data.client_notes ?? null,
        contract_agreed: true,
        status: "pending_deposit" as any,
        addons: [{ rule_id: data.package_id, label: data.package_label }],
      })
      .select("id, client_tracking_token")
      .single();

    if (error) throw new Error(error.message);

    // Get photographer profile for notification details
    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("display_name, username, whatsapp, phone")
      .eq("id", data.photographer_id)
      .single();

    // In-app notification for the photographer
    await supabaseAdmin.from("notifications").insert({
      user_id: data.photographer_id,
      title: "طلب حجز جديد",
      body: `${data.client_name} يرغب بحجز ${data.package_label} بتاريخ ${data.event_date}`,
      link: `/dashboard/bookings/${row.id}`,
    });

    // Best-effort: WhatsApp/Email reminder side-channel (logged for now; integrate provider later)
    // Logging only — real WhatsApp/email send requires configured provider.
    console.log("[booking] new request", {
      photographer: prof?.username,
      whatsapp: prof?.whatsapp,
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
      _proof_path: data.proof_path ?? null,
      _reference: data.reference ?? null,
      _note: data.note ?? null,
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