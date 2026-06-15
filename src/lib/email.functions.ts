import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const isUuid = (s: any) => typeof s === "string" && /^[0-9a-f-]{36}$/i.test(s);

// Sends "your gallery is ready" email — called by the photographer's dashboard
// when she marks the booking as delivered.
export const sendGalleryDeliveredEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { booking_id: string }) => {
    if (!isUuid(d?.booking_id)) throw new Error("invalid booking_id");
    return d;
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendEmail, tplGalleryDelivered } = await import("@/lib/email.server");

    const { data: bk } = await supabaseAdmin
      .from("bookings")
      .select("id, photographer_id, client_email, client_name, client_tracking_token")
      .eq("id", data.booking_id)
      .maybeSingle();
    if (!bk) throw new Error("booking not found");
    if (bk.photographer_id !== context.userId) throw new Error("forbidden");
    if (!bk.client_email) return { ok: false, reason: "no client email" };

    const { data: prof } = await supabaseAdmin
      .from("profiles").select("display_name").eq("id", bk.photographer_id).maybeSingle();

    const tpl = tplGalleryDelivered({
      client_name: bk.client_name || "عميلتنا",
      photographer_name: prof?.display_name || "المصوّرة",
      track_token: bk.client_tracking_token!,
    });
    return await sendEmail({
      to: bk.client_email, subject: tpl.subject, html: tpl.html,
      template: "gallery_delivered", related_booking_id: bk.id,
    });
  });