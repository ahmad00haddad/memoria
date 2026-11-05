import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { t as tr } from "@/i18n";

// ============================================================================
// questions.functions.ts — سؤال قبل الحجز (بدون كشف أرقام الطرفين)
// العروس تسأل من صفحة المصوّرة ← المصوّرة ترد من لوحتها ← العروس تقرأ الرد على /ask/<token>
// ============================================================================

const UUID_RE = /^[0-9a-f-]{36}$/i;
const TOKEN_RE = /^[A-Za-z0-9_-]{16,64}$/;
const BASE = () => process.env.PUBLIC_APP_URL || "https://memoria-production.ahmad000haddad.workers.dev";
// أرقام هواتف وروابط تواصل داخل السؤال/الجواب: نخفيها حتى يبقى التواصل عبر المنصّة قبل الحجز
const PHONE_RE = /(?:\+?962|0)?7[789]\d{7}|\b\d{9,}\b/g;
const scrub = (v: string) => v.replace(PHONE_RE, "•••");

export const askPhotographer = createServerFn({ method: "POST" })
  .inputValidator((d: { photographer_id: string; name: string; email?: string; question: string }) => {
    if (!d || !UUID_RE.test(d.photographer_id ?? "")) throw new Error("invalid photographer_id");
    const name = String(d.name ?? "").trim();
    if (name.length < 2 || name.length > 120) throw new Error(tr("اكتبي اسمكِ"));
    const question = String(d.question ?? "").trim();
    if (question.length < 5) throw new Error(tr("اكتبي سؤالكِ"));
    if (question.length > 1500) throw new Error(tr("السؤال طويل جداً"));
    const email = String(d.email ?? "").trim().toLowerCase();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) throw new Error(tr("اكتبي إيميلاً صحيحاً"));
    return { photographer_id: d.photographer_id, name, email: email || null, question: scrub(question) };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;
    const { data: prof } = await admin.from("profiles").select("id, is_published, deleted_at").eq("id", data.photographer_id).maybeSingle();
    if (!prof || !prof.is_published || prof.deleted_at) throw new Error(tr("الصفحة غير موجودة"));
    const ab = await import("@/lib/abuse.server");
    if (!(await ab.allow(`ip:${ab.clientIp()}`, "ask_ip", 6, 3600))) throw new Error(tr("أسئلة كثيرة خلال وقت قصير. انتظري قليلاً."));
    if (!(await ab.allow(`ask:${data.photographer_id}`, "ask_pid", 30, 3600))) throw new Error(tr("أسئلة كثيرة خلال وقت قصير. انتظري قليلاً."));
    const { data: row, error } = await admin.from("photographer_questions").insert({
      photographer_id: data.photographer_id, asker_name: data.name, asker_email: data.email, question: data.question,
    }).select("token").single();
    if (error) throw new Error(error.message);
    try {
      const { notifyPhotographer } = await import("@/lib/notify.server");
      await notifyPhotographer(data.photographer_id, {
        title: `❓ سؤال من ${data.name} قبل الحجز`,
        body: data.question.slice(0, 160),
        link: "/dashboard/questions",
        template: "question_photographer",
      } as any);
    } catch (e) { console.error("[ask] notify failed", e); }
    return { token: row.token as string, url: `${BASE()}/ask/${row.token}` };
  });

export const getQuestionByToken = createServerFn({ method: "GET" })
  .inputValidator((d: { token: string }) => {
    if (!d || !TOKEN_RE.test(d.token ?? "")) throw new Error("invalid token");
    return d;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: q } = await (supabaseAdmin as any).from("photographer_questions")
      .select("question, answer, answered_at, created_at, asker_name, photographer:profiles!photographer_questions_photographer_id_fkey(display_name, username)")
      .eq("token", data.token).maybeSingle();
    return q ?? null;
  });

export const listMyQuestions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context as any;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await (supabaseAdmin as any).from("photographer_questions")
      .select("id, asker_name, question, answer, answered_at, created_at")
      .eq("photographer_id", userId).order("created_at", { ascending: false }).limit(100);
    return data ?? [];
  });

export const answerQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; answer: string }) => {
    if (!d || !UUID_RE.test(d.id ?? "")) throw new Error("invalid id");
    const answer = String(d.answer ?? "").trim();
    if (answer.length < 2) throw new Error(tr("اكتبي ردّكِ"));
    if (answer.length > 2000) throw new Error(tr("الرد طويل جداً"));
    return { id: d.id, answer: scrub(answer) };
  })
  .handler(async ({ data, context }) => {
    const { userId } = context as any;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;
    const { data: q, error } = await admin.from("photographer_questions")
      .update({ answer: data.answer, answered_at: new Date().toISOString() })
      .eq("id", data.id).eq("photographer_id", userId).select("token, asker_email, asker_name").maybeSingle();
    if (error) throw new Error(error.message);
    if (!q) throw new Error(tr("السؤال غير موجود"));
    if (q.asker_email) {
      try {
        const { sendEmail, tplMessage } = await import("@/lib/email.server");
        const m = tplMessage({
          subject: "وصلكِ رد المصوّرة على سؤالكِ",
          title: "ردّت المصوّرة على سؤالكِ",
          lines: [`مرحباً ${q.asker_name}،`, "ردّت المصوّرة على سؤالكِ قبل الحجز. اقرئي الرد من الرابط أدناه."],
          cta: { label: "قراءة الرد", url: `${BASE()}/ask/${q.token}` },
        });
        await sendEmail({ to: q.asker_email, subject: m.subject, html: m.html, template: "question_answered" });
      } catch (e) { console.error("[ask] email failed", e); }
    }
    return { ok: true };
  });
