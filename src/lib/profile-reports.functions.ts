import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { t as tr } from "@/i18n";

// بلاغ عن صفحة مصوّرة (انتحال/احتيال/صور مسروقة) — أي زائرة ترسله، والإدارة تراجعه.

const UUID_RE = /^[0-9a-f-]{36}$/i;
const REASONS = ["impersonation", "scam", "stolen_photos", "other"] as const;
type Reason = (typeof REASONS)[number];
const REASON_AR: Record<Reason, string> = {
  impersonation: "انتحال صفحة مصوّرة",
  scam: "احتيال أو أخذ عربون واختفاء",
  stolen_photos: "صور ليست من أعمالها",
  other: "سبب آخر",
};

export const submitProfileReport = createServerFn({ method: "POST" })
  .inputValidator((d: { photographer_id: string; reason: string; details: string; reporter_name?: string; reporter_contact: string; real_account_url?: string }) => {
    if (!d || !UUID_RE.test(d.photographer_id ?? "")) throw new Error("invalid photographer_id");
    if (!REASONS.includes(d.reason as Reason)) throw new Error(tr("اختاري سبب البلاغ"));
    const details = String(d.details ?? "").trim();
    if (details.length < 5) throw new Error(tr("اكتبي تفاصيل البلاغ"));
    if (details.length > 2000) throw new Error(tr("التفاصيل طويلة جداً"));
    const contact = String(d.reporter_contact ?? "").trim();
    if (contact.length < 5 || contact.length > 200) throw new Error(tr("اكتبي رقمكِ أو إيميلكِ لنتواصل معكِ"));
    const url = String(d.real_account_url ?? "").trim().slice(0, 500);
    return {
      photographer_id: d.photographer_id, reason: d.reason as Reason, details,
      reporter_name: String(d.reporter_name ?? "").trim().slice(0, 120) || null,
      reporter_contact: contact, real_account_url: url || null,
    };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;
    const { data: prof } = await admin.from("profiles").select("id, display_name, username").eq("id", data.photographer_id).maybeSingle();
    if (!prof) throw new Error(tr("الصفحة غير موجودة"));
    // حد بسيط ضد الإغراق: 10 بلاغات بالساعة لكل صفحة
    const { count } = await admin.from("profile_reports").select("id", { count: "exact", head: true })
      .eq("photographer_id", data.photographer_id).gte("created_at", new Date(Date.now() - 3600_000).toISOString());
    if ((count ?? 0) >= 10) throw new Error(tr("وصلنا بلاغات كثيرة عن هذه الصفحة ونراجعها الآن"));
    const { error } = await admin.from("profile_reports").insert(data);
    if (error) throw new Error(error.message);

    // تنبيه فوري للإدارة: إشعار داخلي + إيميل
    try {
      const { data: admins } = await admin.from("user_roles").select("user_id").eq("role", "admin");
      const title = `🚩 بلاغ: ${REASON_AR[data.reason]}`;
      const body = `@${prof.username} (${prof.display_name ?? ""}) — ${data.details.slice(0, 200)}`;
      if (admins?.length) {
        await admin.from("notifications").insert(admins.map((a: any) => ({ user_id: a.user_id, type: "system", title, body, link: "/admin/reports" })));
        const { sendEmail, tplMessage } = await import("@/lib/email.server");
        const base = process.env.PUBLIC_APP_URL || "https://memoria-production.ahmad000haddad.workers.dev";
        const m = tplMessage({
          subject: title, title,
          lines: [`الصفحة: ${base}/photographers/${prof.username}`, `التفاصيل: ${data.details}`, `المبلِّغة: ${data.reporter_name ?? "—"} · ${data.reporter_contact}`, ...(data.real_account_url ? [`الحساب الحقيقي: ${data.real_account_url}`] : [])],
          cta: { label: "مراجعة البلاغات", url: `${base}/admin/reports` },
        });
        for (const a of admins as any[]) {
          const { data: u } = await admin.auth.admin.getUserById(a.user_id);
          if (u?.user?.email) await sendEmail({ to: u.user.email, subject: m.subject, html: m.html, template: "admin_profile_report", related_user_id: prof.id });
        }
      }
    } catch (e) {
      console.error("[profile-report] admin alert failed", e);
    }
    return { ok: true };
  });

async function ensureAdmin(supabase: any, userId: string) {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  if (!(data ?? []).some((r: any) => r.role === "admin")) throw new Error("forbidden");
}

export const listProfileReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as any;
    await ensureAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await (supabaseAdmin as any).from("profile_reports")
      .select("*, photographer:profiles!profile_reports_photographer_id_fkey(username, display_name, is_published)")
      .order("created_at", { ascending: false }).limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

// تحديث حالة البلاغ، واختيارياً إخفاء الصفحة فوراً (unpublish) حتى انتهاء المراجعة
export const updateProfileReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; status: "new" | "reviewing" | "closed"; admin_notes?: string; hide_profile?: boolean }) => {
    if (!d || !UUID_RE.test(d.id ?? "")) throw new Error("invalid id");
    if (!["new", "reviewing", "closed"].includes(d.status)) throw new Error("invalid status");
    return { id: d.id, status: d.status, admin_notes: String(d.admin_notes ?? "").slice(0, 2000), hide_profile: !!d.hide_profile };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await ensureAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;
    const { data: r, error } = await admin.from("profile_reports")
      .update({ status: data.status, admin_notes: data.admin_notes || null }).eq("id", data.id).select("photographer_id").maybeSingle();
    if (error) throw new Error(error.message);
    if (data.hide_profile && r?.photographer_id) {
      const { error: e2 } = await admin.from("profiles").update({ is_published: false }).eq("id", r.photographer_id);
      if (e2) throw new Error(e2.message);
      await admin.from("audit_logs").insert({ action: "profile.hide_after_report", actor_id: userId, entity_type: "profile", entity_id: r.photographer_id, after_data: { report_id: data.id } });
    }
    return { ok: true };
  });
