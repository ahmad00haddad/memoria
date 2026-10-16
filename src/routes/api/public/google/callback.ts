import { createFileRoute } from "@tanstack/react-router";

// رجوع المتصفح من صفحة موافقة Google: نتحقق من state، نبادل code بتوكن،
// نحفظ الربط ونزامن فوراً، ثم نعيد المصوّرة إلى صفحة التقويم.
export const Route = createFileRoute("/api/public/google/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const base = process.env.PUBLIC_APP_URL || "https://memoria-production.ahmad000haddad.workers.dev";
        const back = (q: string) => Response.redirect(`${base}/dashboard/calendar?google=${q}`, 303);
        const url = new URL(request.url);
        if (url.searchParams.get("error")) return back("denied");
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        if (!code || !state) return back("error");

        const g = await import("@/lib/google-calendar.server");
        const userId = await g.verifyState(state);
        if (!userId) return back("expired");
        // يجب منح الصلاحيتين معاً (Google يسمح بإلغاء تحديد بعضها)
        const granted = url.searchParams.get("scope") ?? "";
        if (!granted.includes("calendar.freebusy") || !granted.includes("calendar.app.created")) return back("scopes");
        try {
          const tokens = await g.exchangeCode(code);
          await g.saveLink(userId, tokens);
          // ربط واحد فقط: نوقف رابط iCal القديم كي لا يتعارض الاثنان على نفس الأيام
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          await supabaseAdmin.from("photographer_private")
            .update({ external_ical_url: null, external_ical_auto_sync: false }).eq("user_id", userId);
          await g.syncGoogleUser(userId).catch((e) => console.error("[google] first sync", e?.message));
          return back("connected");
        } catch (e: any) {
          console.error("[google] callback", e?.message);
          return back("error");
        }
      },
    },
  },
});
