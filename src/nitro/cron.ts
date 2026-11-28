// Cloudflare Cron (wrangler.jsonc → triggers.crons) يصل إلى Nitro كـ hook "cloudflare:scheduled"،
// لا إلى src/server.ts. نوجّهه داخلياً إلى مسارات الـ hooks عبر nitroApp.fetch (بدون طلب شبكة خارجي).
const PATHS = ["/api/public/hooks/booking-deadlines", "/api/public/hooks/ical-sync"];
// تذكيرات الإيميل مصمّمة لتعمل مرة يومياً (منع التكرار فيها بنافذة 20 ساعة)، فتُستدعى في أول دورة بعد 06:00 UTC فقط
const DAILY_PATHS = ["/api/public/hooks/email-reminders"];

export default (nitroApp: any) => {
  nitroApp.hooks.hook("cloudflare:scheduled", async ({ env }: { env: Record<string, string | undefined> }) => {
    if (!env.CRON_SECRET) {
      console.error("[cron] CRON_SECRET missing");
      return;
    }
    const base = env.PUBLIC_APP_URL || "https://memoria-production.ahmad000haddad.workers.dev";
    const now = new Date();
    const daily = now.getUTCHours() === 6 && now.getUTCMinutes() < 30;
    const results: { job: string; status: number; error?: string }[] = [];
    for (const path of daily ? [...PATHS, ...DAILY_PATHS] : PATHS) {
      try {
        const res = await nitroApp.fetch(
          new Request(`${base}${path}`, {
            method: "POST",
            headers: { "x-cron-secret": env.CRON_SECRET },
          }),
        );
        console.log("[cron]", path, res.status, (await res.text()).slice(0, 500));
        results.push({ job: path, status: res.status });
      } catch (e) {
        console.error("[cron]", path, "failed", e);
        results.push({ job: path, status: 0, error: String((e as any)?.message ?? e) });
      }
    }
    // نبض: يسجّل النتيجة وينبّه الأدمن عند التعثّر (فشله لا يؤثر على المهام)
    try {
      await nitroApp.fetch(
        new Request(`${base}/api/public/hooks/heartbeat`, {
          method: "POST",
          headers: { "x-cron-secret": env.CRON_SECRET, "content-type": "application/json" },
          body: JSON.stringify({ results }),
        }),
      );
    } catch (e) {
      console.error("[cron] heartbeat failed", e);
    }
  });
};
