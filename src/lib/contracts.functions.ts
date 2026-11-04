import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { t } from "@/i18n";

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
    // لا توقيع على حجز ملغى أو محذوف
    const { data: bk } = await supabaseAdmin.from("bookings")
      .select("status, deleted_at, client_email, client_name, event_date, client_tracking_token").eq("id", c.booking_id).maybeSingle();
    if (!bk || (bk as any).deleted_at || bk.status === "cancelled") throw new Error(t("هذا الحجز لم يعد قائماً، فلا يمكن توقيع العقد."));
    const { error } = await supabaseAdmin.from("contracts").update({
      status: "signed",
      signed_at: new Date().toISOString(),
      client_signature: data.signature,
      client_name: data.client_name,
    }).eq("id", c.id).eq("status", "pending");
    if (error) throw error;
    await supabaseAdmin.from("notifications").insert({
      user_id: c.photographer_id,
      title: t("تم توقيع العقد"),
      body: t("وقّع {0} العقد.", [data.client_name]),
      link: `/dashboard/bookings/${c.booking_id}`,
    });
    // أثر للتدقيق + نسخة لبريد العروس: لو وُقِّع باسمها من غيرها (رابط التوقيع تراه المصوّرة أيضاً) تعلم فوراً
    try {
      const { clientIp, clientUserAgent } = await import("@/lib/abuse.server");
      await (supabaseAdmin as any).from("audit_logs").insert({
        action: "contract.signed", entity_type: "contract", entity_id: c.id,
        after_data: { booking_id: c.booking_id, ip: clientIp(), ua: clientUserAgent(), signed_name: data.client_name },
      });
      if (bk.client_email) {
        const { sendEmail, tplMessage } = await import("@/lib/email.server");
        const base = process.env.PUBLIC_APP_URL || "https://memoria-production.ahmad000haddad.workers.dev";
        const m = tplMessage({
          subject: "تم توقيع عقد حجزكِ — ميموريا",
          title: "تم توقيع العقد",
          lines: [
            `وُقِّع عقد حجزكِ بتاريخ ${bk.event_date} باسم: ${data.client_name}.`,
            "إن لم تكوني أنتِ من وقّع، راسلي فريق ميموريا فوراً من صفحة الحجز.",
          ],
          cta: bk.client_tracking_token ? { label: "فتح صفحة الحجز", url: `${base}/track/${bk.client_tracking_token}` } : undefined,
        });
        await sendEmail({ to: bk.client_email, subject: m.subject, html: m.html, template: "contract_signed_client", related_booking_id: c.booking_id });
      }
    } catch (e) { console.error("[contract] sign audit/email failed", e); }
    return { ok: true };
  });

export const getContractByToken = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ token: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: c } = await supabaseAdmin.from("contracts").select(
      "id, body, client_name, status, signed_at, client_signature, signed_body_sha256, booking_id, photographer_id"
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

    // العقود الرقمية من ميزات Pro (التجربة = Pro)
    const { data: tier } = await supabase.rpc("photographer_tier", { _pid: userId });
    if (tier !== "pro") throw new Error(t("العقود الرقمية متاحة في باقة Pro — رقّي اشتراكك لإرسال عقد للعروس."));

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