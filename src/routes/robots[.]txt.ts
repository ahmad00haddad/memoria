import { createFileRoute } from "@tanstack/react-router";

// robots.txt — يُوجّه محركات البحث
const BASE_URL = process.env.PUBLIC_APP_URL || process.env.PUBLIC_APP_URL || "https://elitecapture.com";

export const Route = createFileRoute("/robots[.]txt")({
  server: {
    handlers: {
      GET: () => {
        const content = `User-agent: *
Allow: /
Allow: /search
Allow: /photographers/
Allow: /guide
Allow: /pricing
Allow: /for-clients
Allow: /for-photographers

# Private routes — لا تفهرس
Disallow: /dashboard/
Disallow: /admin/
Disallow: /login
Disallow: /reset-password
Disallow: /forgot-password
Disallow: /track/
Disallow: /contracts/
Disallow: /review/
Disallow: /api/

Sitemap: ${BASE_URL}/sitemap.xml

# crawl-delay لتجنّب الضغط على الخادم
Crawl-delay: 2
`;
        return new Response(content, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=86400",
          },
        });
      },
    },
  },
});
