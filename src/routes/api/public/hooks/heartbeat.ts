import { createFileRoute } from "@tanstack/react-router";

// /api/public/hooks/heartbeat — يستدعيه src/nitro/cron.ts بعد كل دورة بنتيجة كل مهمة.
// يسجّل النبض، وينبّه الأدمن (إشعار داخل التطبيق) عند 3 إخفاقات متتالية أو عندما تتأخر مهمة يومية عن 30 ساعة.
// التنبيه مرة كل 6 ساعات لكل مهمة كحد أقصى. الأخطاء هنا لا تُفشل الـ cron.

const H = 3600_000;
const DAILY_JOBS = new Set(["/api/public/hooks/email-reminders"]);

export const Route = createFileRoute("/api/public/hooks/heartbeat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.CRON_SECRET;
        if (!secret || request.headers.get("x-cron-secret") !== secret) {
          return new Response("Unauthorized", { status: 401 });
        }
        let results: { job: string; status: number; error?: string }[] = [];
        try {
          const body: any = await request.json();
          if (Array.isArray(body?.results)) {
            results = body.results
              .filter((r: any) => r && typeof r.job === "string" && r.job.length < 120)
              .map((r: any) => ({ job: r.job, status: Number(r.status) || 0, error: r.error ? String(r.error).slice(0, 300) : undefined }));
          }
        } catch { /* body اختياري */ }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const admin = supabaseAdmin as any;
        const now = new Date();
        const alerts: string[] = [];

        // 1) تسجيل نتائج هذه الدورة
        for (const r of results) {
          const { data: prev } = await admin.from("job_heartbeats").select("*").eq("job", r.job).maybeSingle();
          const ok = r.status >= 200 && r.status < 300;
          await admin.from("job_heartbeats").upsert({
            job: r.job,
            last_run_at: now.toISOString(),
            last_ok_at: ok ? now.toISOString() : prev?.last_ok_at ?? null,
            last_status: r.status,
            fail_streak: ok ? 0 : (prev?.fail_streak ?? 0) + 1,
            last_error: ok ? null : (r.error ?? `HTTP ${r.status}`),
            alerted_at: ok ? null : prev?.alerted_at ?? null,
          }, { onConflict: "job" });
        }

        // 2) فحص كل المهام: إخفاق متتالٍ أو تأخر
        const { data: all } = await admin.from("job_heartbeats").select("*");
        const due: any[] = [];
        for (const j of (all ?? []) as any[]) {
          const maxAge = DAILY_JOBS.has(j.job) ? 30 * H : 3 * H;
          const stale = !j.last_ok_at || now.getTime() - new Date(j.last_ok_at).getTime() > maxAge;
          const failing = j.fail_streak >= 3;
          const recentlyAlerted = j.alerted_at && now.getTime() - new Date(j.alerted_at).getTime() < 6 * H;
          if ((stale || failing) && !recentlyAlerted) due.push({ ...j, reason: failing ? `فشل ${j.fail_streak} مرات متتالية (${j.last_error ?? j.last_status})` : "لم تنجح منذ مدة طويلة" });
        }
        if (due.length) {
          const { data: admins } = await admin.from("user_roles").select("user_id").eq("role", "admin");
          for (const j of due) {
            const body = `${j.job}: ${j.reason}`;
            alerts.push(body);
            for (const a of (admins ?? []) as any[]) {
              await admin.from("notifications").insert({ user_id: a.user_id, title: "تنبيه: مهمة مجدولة متعثّرة", body, link: "/admin" });
            }
            await admin.from("job_heartbeats").update({ alerted_at: now.toISOString() }).eq("job", j.job);
          }
        }
        return Response.json({ recorded: results.length, alerts });
      },
    },
  },
});
