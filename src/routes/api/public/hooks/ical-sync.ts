import { createFileRoute } from "@tanstack/react-router";
import { runIcalSyncForUser } from "@/lib/ical-sync.functions";

export const Route = createFileRoute("/api/public/hooks/ical-sync")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // فحص أن النداء يأتي من pg_cron / Supabase (apikey = المفتاح العام)
        const apikey = request.headers.get("apikey") || request.headers.get("x-api-key");
        if (!apikey || apikey !== process.env.SUPABASE_PUBLISHABLE_KEY) {
          return new Response("Unauthorized", { status: 401 });
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: rows, error } = await supabaseAdmin
          .from("photographer_private")
          .select("user_id, external_ical_url")
          .eq("external_ical_auto_sync", true)
          .not("external_ical_url", "is", null);
        if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        const results: { user_id: string; ok: boolean; error?: string; inserted?: number }[] = [];
        for (const r of rows ?? []) {
          try {
            const out = await runIcalSyncForUser(r.user_id, (r.external_ical_url as string).trim());
            results.push({ user_id: r.user_id, ok: true, inserted: out.inserted });
          } catch (e: any) {
            results.push({ user_id: r.user_id, ok: false, error: e?.message || "sync failed" });
          }
        }
        return new Response(JSON.stringify({ processed: results.length, results }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
