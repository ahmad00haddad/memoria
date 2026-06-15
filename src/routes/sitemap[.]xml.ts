import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const base = process.env.SITE_URL ?? "https://royal-lens-flow.lovable.app";
        const { data } = await supabaseAdmin
          .from("profiles")
          .select("username,updated_at")
          .eq("is_published", true);
        const staticUrls = ["", "/search", "/pricing", "/photographers/join"];
        const urls = [
          ...staticUrls.map((p) => `<url><loc>${base}${p}</loc></url>`),
          ...(data ?? []).map((p: any) => `<url><loc>${base}/photographers/${p.username}</loc><lastmod>${new Date(p.updated_at).toISOString()}</lastmod></url>`),
        ].join("");
        const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;
        return new Response(xml, { headers: { "content-type": "application/xml" } });
      },
    },
  },
});
