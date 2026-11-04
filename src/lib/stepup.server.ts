// ============================================================================
// stepup.server.ts — رمز تأكيد على إيميل العروس للإجراءات المالية بالرابط
// ----------------------------------------------------------------------------
// لماذا: رابط المتابعة تعرفه المصوّرة أيضاً (تراه في لوحتها لترسله للعروس)، فكان بإمكانها
// أن تتصرف كأنها العروس: تلغي الحجز بعد العربون ("لا يُرجَع")، أو توافق على ملحق بمبلغ كبير.
// الرمز يصل لبريد العروس فقط، فلا تقدر المصوّرة على تجاوزه.
// لا ينطبق على الحجز اليدوي (البريد من إدخال المصوّرة نفسها) ولا على حجز بلا بريد.
// ============================================================================

export type StepPurpose = "cancel" | "addendum";
const TTL_MIN = 15;
const MAX_ATTEMPTS = 5;

async function sha(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function stepUpApplies(bk: { verified_via?: string | null; client_email?: string | null }): boolean {
  return bk.verified_via !== "manual" && !!(bk.client_email && bk.client_email.includes("@"));
}

function maskEmail(e: string): string {
  const [u, d] = e.split("@");
  return `${u.slice(0, 2)}${"*".repeat(Math.max(1, Math.min(4, u.length - 2)))}@${d}`;
}

const PURPOSE_TEXT: Record<StepPurpose, string> = {
  cancel: "إلغاء الحجز",
  addendum: "الموافقة على ملحق الاتفاق",
};

export async function issueStepUpCode(token: string, purpose: StepPurpose) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const admin = supabaseAdmin as any;
  const { data: bk } = await admin.from("bookings")
    .select("id, client_name, client_email, verified_via, deleted_at")
    .eq("client_tracking_token", token).maybeSingle();
  if (!bk || bk.deleted_at) throw new Error("invalid token");
  if (!stepUpApplies(bk)) return { required: false as const };

  const { allow, TOO_MANY } = await import("@/lib/abuse.server");
  if (!(await allow(`stepup:${bk.id}`, "stepup_min", 1, 60))) throw new Error("انتظري دقيقة قبل طلب رمز جديد.");
  if (!(await allow(`stepup:${bk.id}`, "stepup_hour", 5, 3600))) throw new Error(TOO_MANY);

  const { sixDigits, isEmailConfigured } = await import("@/lib/verification.server");
  if (!isEmailConfigured()) throw new Error("الإرسال بالإيميل غير متاح حالياً. راسلي فريق ميموريا.");
  const code = sixDigits();
  await admin.from("bride_action_codes").insert({
    booking_id: bk.id, purpose, code_hash: await sha(`${bk.id}:${purpose}:${code}`),
    expires_at: new Date(Date.now() + TTL_MIN * 60_000).toISOString(),
  });

  const { sendEmail, tplMessage } = await import("@/lib/email.server");
  const m = tplMessage({
    subject: `رمز تأكيد ${PURPOSE_TEXT[purpose]} — ميموريا`,
    title: "رمز التأكيد",
    lines: [
      `مرحباً ${bk.client_name || ""}،`.trim(),
      `رمز تأكيد ${PURPOSE_TEXT[purpose]}: ${code}`,
      `صالح لمدة ${TTL_MIN} دقيقة. إن لم تطلبيه أنتِ فتجاهلي هذه الرسالة ولا تشاركيه مع أحد، بمن فيهم المصوّرة.`,
    ],
  });
  const r = await sendEmail({ to: bk.client_email, subject: m.subject, html: m.html, template: "bride_step_up", related_booking_id: bk.id });
  if (!r.ok) throw new Error("تعذّر إرسال الرمز إلى بريدكِ. راسلي فريق ميموريا ونكمل لكِ العملية.");
  return { required: true as const, hint: maskEmail(bk.client_email) };
}

/** يتحقق من الرمز ويستهلكه. يرمي خطأ بالعربي عند الفشل. */
export async function consumeStepUpCode(bookingId: string, purpose: StepPurpose, rawCode: unknown) {
  const code = String(rawCode ?? "").replace(/\D/g, "");
  if (code.length !== 6) throw new Error("اكتبي رمز التأكيد المكوّن من 6 أرقام المرسل إلى بريدكِ.");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const admin = supabaseAdmin as any;
  const { data: row } = await admin.from("bride_action_codes")
    .select("id, code_hash, attempts, expires_at, used_at")
    .eq("booking_id", bookingId).eq("purpose", purpose).is("used_at", null)
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!row) throw new Error("اطلبي رمز تأكيد جديداً أولاً.");
  if (new Date(row.expires_at).getTime() < Date.now()) throw new Error("انتهت صلاحية الرمز. اطلبي رمزاً جديداً.");
  if (row.attempts >= MAX_ATTEMPTS) throw new Error("تجاوزتِ عدد المحاولات. اطلبي رمزاً جديداً.");
  if (row.code_hash !== (await sha(`${bookingId}:${purpose}:${code}`))) {
    await admin.from("bride_action_codes").update({ attempts: row.attempts + 1 }).eq("id", row.id);
    throw new Error("الرمز غير صحيح.");
  }
  const { data: used } = await admin.from("bride_action_codes")
    .update({ used_at: new Date().toISOString() }).eq("id", row.id).is("used_at", null).select("id").maybeSingle();
  if (!used) throw new Error("اطلبي رمز تأكيد جديداً أولاً.");
}
