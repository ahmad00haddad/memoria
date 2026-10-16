import { createFileRoute } from "@tanstack/react-router";
import { syncAndRecord } from "@/lib/ical-sync.functions";

export const Route = createFileRoute("/api/public/hooks/ical-sync")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // يُستدعى من Cloudflare Cron فقط (src/server.ts → scheduled) بسرّ خاص.
        const secret = process.env.CRON_SECRET;
        if (!secret || request.headers.get("x-cron-secret") !== secret) {
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
        // 5 مصوّرات بالتوازي — أسرع دون إغراق Google أو قاعدة البيانات
        const queue = [...(rows ?? [])];
        await Promise.all(Array.from({ length: 5 }, async () => {
          for (let r = queue.shift(); r; r = queue.shift()) {
            try {
              const out = await syncAndRecord(r.user_id, (r.external_ical_url as string).trim());
              results.push({ user_id: r.user_id, ok: true, inserted: out.inserted });
            } catch (e: any) {
              results.push({ user_id: r.user_id, ok: false, error: e?.message || "sync failed" });
            }
          }
        }));
        return new Response(JSON.stringify({ processed: results.length, results }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
