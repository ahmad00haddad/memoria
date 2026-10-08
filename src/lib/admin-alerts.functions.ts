import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Called by a photographer right after uploading a subscription receipt.
// Tells every admin (in-app notification + email) that a payment awaits review.
// Reads the newest pending payment itself, so the caller can't spoof contents.
export const notifyAdminsOfSubscriptionPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = (context as any).userId as string;

    const [{ data: pay }, { data: prof }, { data: admins }] = await Promise.all([
      supabaseAdmin.from("subscription_payments")
        .select("id, amount, period_months, created_at")
        .eq("photographer_id", userId).eq("status", "pending")
        .order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabaseAdmin.from("profiles").select("display_name, username").eq("id", userId).maybeSingle(),
      supabaseAdmin.from("user_roles").select("user_id").eq("role", "admin"),
    ]);
    if (!pay || !admins?.length) return { ok: false };

    const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
    const name = (prof as any)?.display_name || (prof as any)?.username || "مصوّرة";
    const p: any = pay;
    const plan = p.period_months === 12 ? "سنوي" : "شهري";
    const title = "💳 دفعة اشتراك بانتظار المراجعة";
    const body = `${name} رفعت إثبات تحويل ${p.amount} د.أ (${plan}).`;

    await supabaseAdmin.from("notifications").insert(
      admins.map((a: any) => ({ user_id: a.user_id, type: "system", title, body, link: "/admin/subscriptions" })),
    );

    const { sendEmail } = await import("@/lib/email.server");
    const base = process.env.PUBLIC_APP_URL || "https://memoria-production.ahmad000haddad.workers.dev";
    for (const a of admins as any[]) {
      const { data: u } = await supabaseAdmin.auth.admin.getUserById(a.user_id);
      const to = u?.user?.email;
      if (!to) continue;
      try {
        await sendEmail({
          to,
          subject: title,
          template: "admin_subscription_payment",
          related_user_id: userId,
          html: `<div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;line-height:1.8">
            <h2 style="margin:0 0 8px">${title}</h2>
            <p>${esc(body)}</p>
            <p><a href="${base}/admin/subscriptions" style="background:#111;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none">راجعي الدفعة</a></p>
          </div>`,
        });
      } catch (e) { console.error("[admin-alert] email failed", e); }
    }
    return { ok: true };
  });
