import { createFileRoute } from "@tanstack/react-router";

// ============================================================================
// sitemap.xml — ديناميكي يشمل جميع المصوّرين المنشورين
// يُستدعى من محركات البحث (Google, Bing) لاكتشاف الصفحات
// ============================================================================

const BASE_URL = process.env.PUBLIC_APP_URL || process.env.PUBLIC_APP_URL || "https://elitecapture.com";

// أولويات الصفحات الثابتة
const STATIC_PAGES = [
  { path: "/",                 priority: "1.0", changefreq: "weekly"  },
  { path: "/search",           priority: "0.9", changefreq: "daily"   },
  { path: "/for-clients",      priority: "0.8", changefreq: "monthly" },
  { path: "/for-photographers",priority: "0.8", changefreq: "monthly" },
  { path: "/pricing",          priority: "0.7", changefreq: "monthly" },
  { path: "/guide",            priority: "0.7", changefreq: "monthly" },
  { path: "/app",              priority: "0.6", changefreq: "monthly" },
];

function escapeXml(s: string) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[c]!)
  );
}

function urlEntry(loc: string, lastmod?: string, changefreq?: string, priority?: string) {
  return `  <url>
    <loc>${escapeXml(loc)}</loc>${lastmod ? `\n    <lastmod>${escapeXml(lastmod)}</lastmod>` : ""}${changefreq ? `\n    <changefreq>${changefreq}</changefreq>` : ""}${priority ? `\n    <priority>${priority}</priority>` : ""}
  </url>`;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // جلب جميع المصوّرين المنشورين مع وقت آخر تحديث
        const { data: photographers } = await (supabaseAdmin as any)
          .rpc("get_sitemap_photographers")
          .then((r: any) => r, () => ({ data: [] as any[] }));

        const today = new Date().toISOString().slice(0, 10);

        const staticEntries = STATIC_PAGES.map((p) =>
          urlEntry(`${BASE_URL}${p.path}`, today, p.changefreq, p.priority)
        );

        const photographerEntries = ((photographers ?? []) as any[]).map((ph) => {
          const lastmod = ph.updated_at
            ? new Date(ph.updated_at).toISOString().slice(0, 10)
            : today;
          return urlEntry(
            `${BASE_URL}/photographers/${ph.username}`,
            lastmod,
            "weekly",
            "0.85"
          );
        });

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${[...staticEntries, ...photographerEntries].join("\n")}
</urlset>`;

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            // Cache for 12 hours in CDN, 1 hour in browser
            "Cache-Control": "public, max-age=3600, s-maxage=43200, stale-while-revalidate=86400",
          },
        });
      },
    },
  },
});
