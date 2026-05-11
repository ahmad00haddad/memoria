import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: () => new Response(
        `User-agent: *\nAllow: /\nDisallow: /dashboard\nDisallow: /admin\nDisallow: /contracts/\nSitemap: ${process.env.SITE_URL ?? "https://elitecapture.lovable.app"}/sitemap.xml\n`,
        { headers: { "content-type": "text/plain" } }
      ),
    },
  },
});
