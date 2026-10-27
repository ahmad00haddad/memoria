// Cloudflare Cron (wrangler.jsonc → triggers.crons) يصل إلى Nitro كـ hook "cloudflare:scheduled"،
// لا إلى src/server.ts. نوجّهه داخلياً إلى مسارات الـ hooks عبر nitroApp.fetch (بدون طلب شبكة خارجي).
const PATHS = ["/api/public/hooks/booking-deadlines", "/api/public/hooks/ical-sync"];

export default (nitroApp: any) => {
  nitroApp.hooks.hook("cloudflare:scheduled", async ({ env }: { env: Record<string, string | undefined> }) => {
    if (!env.CRON_SECRET) {
      console.error("[cron] CRON_SECRET missing");
      return;
    }
    const base = env.PUBLIC_APP_URL || "https://memoria-production.ahmad000haddad.workers.dev";
    for (const path of PATHS) {
      try {
        const res = await nitroApp.fetch(
          new Request(`${base}${path}`, {
            method: "POST",
            headers: { "x-cron-secret": env.CRON_SECRET },
          }),
        );
        console.log("[cron]", path, res.status, (await res.text()).slice(0, 500));
      } catch (e) {
        console.error("[cron]", path, "failed", e);
      }
    }
  });
};
