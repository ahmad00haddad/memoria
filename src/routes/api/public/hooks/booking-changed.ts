import { createFileRoute } from "@tanstack/react-router";

// السرّ مولَّد داخل Supabase Vault ويُقرأ بدالة لا يملك تنفيذها إلا service role.
let cachedSecret: string | null = null;
async function hookSecret() {
  if (cachedSecret) return cachedSecret;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.rpc("get_booking_hook_secret" as any);
  cachedSecret = (data as string | null) ?? null;
  return cachedSecret;
}

// Webhook من قاعدة البيانات (trigger + pg_net) عند إنشاء/تعديل أي حجز:
// يكتب الحجز فوراً في تقويم «Memoria» على Google إن كانت المصوّرة مربوطة.
export const Route = createFileRoute("/api/public/hooks/booking-changed")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = await hookSecret();
        if (!secret || request.headers.get("x-hook-secret") !== secret) {
          return new Response("Unauthorized", { status: 401 });
        }
        const { booking_id, photographer_id } = (await request.json().catch(() => ({}))) as Record<string, string>;
        if (!booking_id || !photographer_id) return new Response("bad request", { status: 400 });
        const { pushOneBooking, isGoogleConfigured } = await import("@/lib/google-calendar.server");
        if (!isGoogleConfigured()) return Response.json({ skipped: "not configured" });
        try {
          return Response.json(await pushOneBooking(photographer_id, booking_id));
        } catch (e: any) {
          console.error("[google] booking-changed", e?.message);
          return Response.json({ error: e?.message }, { status: 200 });
        }
      },
    },
  },
});
