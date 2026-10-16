// Cloudflare Cron (wrangler.jsonc → triggers.crons) يصل إلى Nitro كـ hook "cloudflare:scheduled"،
// لا إلى src/server.ts. نوجّهه داخلياً إلى مسار المزامنة عبر nitroApp.fetch (بدون طلب شبكة خارجي).
export default (nitroApp: any) => {
  nitroApp.hooks.hook("cloudflare:scheduled", async ({ env }: { env: Record<string, string | undefined> }) => {
    if (!env.CRON_SECRET) {
      console.error("[cron] CRON_SECRET missing");
      return;
    }
    const base = env.PUBLIC_APP_URL || "https://memoria-production.ahmad000haddad.workers.dev";
    const res = await nitroApp.fetch(
      new Request(`${base}/api/public/hooks/ical-sync`, {
        method: "POST",
        headers: { "x-cron-secret": env.CRON_SECRET },
      }),
    );
    console.log("[cron] ical-sync", res.status, (await res.text()).slice(0, 500));
  });
};
