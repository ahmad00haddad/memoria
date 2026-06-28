// ============================================================================
// whatsapp.server.ts — مساعد WhatsApp Cloud API (خادمي فقط، env-gated)
// ----------------------------------------------------------------------------
// السلوك (على نمط email.server.ts):
//   * عند غياب WHATSAPP_API_TOKEN أو WHATSAPP_PHONE_ID → no-op آمن (skipped=true)
//     ولا يرمي خطأً إطلاقاً، حتى لا يتعطّل تدفق الحجز/الدفع.
//   * Workers-safe: يستخدم fetch فقط.
//
// sendWhatsAppNotification — المحرك الذكي للإشعارات التلقائية:
//   يبحث أولاً عن قالب مخصص للمصورة (whatsapp_templates)، فإن لم يجد
//   يستخدم القالب الافتراضي للنظام. يستبدل المتغيرات تلقائياً.
// ============================================================================

export function isWhatsAppConfigured(): boolean {
  return Boolean(process.env.WHATSAPP_API_TOKEN && process.env.WHATSAPP_PHONE_ID);
}

/** تطبيع رقم الهاتف إلى الصيغة الدولية التي يتوقعها واتساب (أرقام فقط). */
function normalizePhone(phone: string): string {
  let p = (phone || "").replace(/[^\d+]/g, "");
  if (p.startsWith("+")) p = p.slice(1);
  if (p.startsWith("00")) p = p.slice(2);
  if (p.startsWith("0")) p = "962" + p.slice(1);
  return p;
}

export type WhatsAppResult = { ok: boolean; id?: string; error?: string; skipped?: boolean };

/**
 * إرسال رسالة نصية بسيطة عبر WhatsApp Cloud API.
 * يُفضّل لاحقاً استخدام القوالب المعتمدة (templates) للرسائل خارج نافذة 24 ساعة؛
 * أُبقيت الواجهة بسيطة لتسهيل التوسعة من Lovable.
 */
export async function sendWhatsAppText(to: string, body: string): Promise<WhatsAppResult> {
  const token = process.env.WHATSAPP_API_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;

  if (!token || !phoneId) return { ok: false, skipped: true };

  const recipient = normalizePhone(to);
  if (!recipient || recipient.length < 8) return { ok: false, error: "invalid recipient phone" };

  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: recipient,
        type: "text",
        text: { body },
      }),
    });
    const json: any = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: json?.error?.message || `HTTP ${res.status}` };
    }
    return { ok: true, id: json?.messages?.[0]?.id };
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) };
  }
}

// ============================================================================
// sendWhatsAppNotification — المحرك الذكي للإشعارات التلقائية
// ─────────────────────────────────────────────────────────────────────────────
// الفئات المدعومة (categories):
//   "welcome"       — استقبال طلب الحجز (للعروس)
//   "confirmed"     — تأكيد الحجز بعد استلام العربون
//   "shooting"      — تذكير يوم التصوير
//   "editing"       — إعلام بأن الصور في مرحلة المونتاج
//   "delivery"      — إعلام بجاهزية الصور للمشاهدة/التحميل
//   "review"        — طلب تقييم المصورة
//   "cancellation"  — إشعار الإلغاء
// ─────────────────────────────────────────────────────────────────────────────
// القوالب الافتراضية للنظام (بالعربية الاحترافية)
// ─────────────────────────────────────────────────────────────────────────────

type NotificationCategory =
  | "welcome"
  | "confirmed"
  | "shooting"
  | "editing"
  | "delivery"
  | "review"
  | "cancellation";

type TemplateVars = {
  client_name: string;
  photographer_name: string;
  event_date: string;
  deposit_amount?: string;
  total_price?: string;
  service?: string;
  tracking_url?: string;
  venue?: string;
  refund_note?: string;
};

function buildDefaultMessage(category: NotificationCategory, vars: TemplateVars): string {
  const {
    client_name, photographer_name, event_date,
    deposit_amount, total_price, service,
    tracking_url, venue, refund_note,
  } = vars;

  switch (category) {
    case "welcome":
      return [
        `مرحباً ${client_name} 👋`,
        ``,
        `تم استلام طلب حجزك مع المصورة *${photographer_name}* بتاريخ *${event_date}* بنجاح.`,
        service ? `الخدمة: ${service}` : null,
        venue ? `المكان: ${venue}` : null,
        deposit_amount ? `مبلغ العربون: *${deposit_amount} دينار*` : null,
        ``,
        `يمكنك متابعة حالة حجزك في أي وقت من الرابط التالي:`,
        tracking_url ? tracking_url : null,
        ``,
        `سيتواصل معك فريق Memoria قريباً لتأكيد الحجز. ✨`,
      ].filter(Boolean).join("\n");

    case "confirmed":
      return [
        `تهانينا ${client_name}! 🎉`,
        ``,
        `تم *تأكيد حجزك* مع المصورة *${photographer_name}* بتاريخ *${event_date}*.`,
        total_price ? `المبلغ الإجمالي: ${total_price} دينار` : null,
        ``,
        `يمكنك متابعة تفاصيل حجزك:`,
        tracking_url ? tracking_url : null,
        ``,
        `نتطلع لتصوير يومك الاستثنائي! 📸`,
      ].filter(Boolean).join("\n");

    case "shooting":
      return [
        `تذكير: ${client_name} 📅`,
        ``,
        `موعد جلسة التصوير مع *${photographer_name}* غداً *${event_date}*.`,
        venue ? `المكان: ${venue}` : null,
        ``,
        `نتمنى لكِ يوماً رائعاً مليئاً بالذكريات الجميلة! 💐`,
        tracking_url ? `\nرابط تتبع حجزك: ${tracking_url}` : null,
      ].filter(Boolean).join("\n");

    case "editing":
      return [
        `مرحباً ${client_name} 🎨`,
        ``,
        `صورك مع *${photographer_name}* في مرحلة المونتاج والمعالجة حالياً.`,
        `سنُبلغك فور اكتمالها وجاهزيتها للمشاهدة.`,
        ``,
        tracking_url ? `متابعة الحجز: ${tracking_url}` : null,
      ].filter(Boolean).join("\n");

    case "delivery":
      return [
        `صورك جاهزة! ${client_name} 🌟`,
        ``,
        `يسعدنا إبلاغك بأن *${photographer_name}* قد أنهت تصوير وتعديل صور يومك الخاص.`,
        ``,
        `اضغطي على الرابط أدناه لمشاهدة معرضك الخاص:`,
        tracking_url ? tracking_url : null,
        ``,
        total_price ? `لتحميل الصور بجودة عالية كاملة، يُرجى إتمام الدفعة النهائية.` : null,
        ``,
        `نتمنى أن تكوني راضية عن هذه الذكريات الثمينة. 💞`,
      ].filter(Boolean).join("\n");

    case "review":
      return [
        `مرحباً ${client_name} ⭐`,
        ``,
        `نأمل أنكِ أحببتِ صورك مع *${photographer_name}*!`,
        ``,
        `رأيكِ يُساعد العرائس الأخريات في الاختيار. هل يمكنكِ مشاركة تجربتك؟`,
        tracking_url ? `\nتقييم المصورة: ${tracking_url}` : null,
      ].filter(Boolean).join("\n");

    case "cancellation":
      return [
        `إشعار إلغاء: ${client_name}`,
        ``,
        `تم إلغاء حجزك مع *${photographer_name}* بتاريخ *${event_date}*.`,
        refund_note ? `\n${refund_note}` : null,
        ``,
        `لأي استفسار، يُرجى التواصل معنا عبر Memoria.`,
      ].filter(Boolean).join("\n");

    default:
      return `مرحباً ${client_name}، تحديث من Memoria بخصوص حجزك مع ${photographer_name}.`;
  }
}

/** استبدال المتغيرات في قالب مخصص من المصورة */
function interpolateTemplate(template: string, vars: TemplateVars): string {
  return template
    .replace(/\{\{client_name\}\}/g, vars.client_name || "")
    .replace(/\{\{photographer_name\}\}/g, vars.photographer_name || "")
    .replace(/\{\{event_date\}\}/g, vars.event_date || "")
    .replace(/\{\{deposit_amount\}\}/g, vars.deposit_amount || "")
    .replace(/\{\{total_price\}\}/g, vars.total_price || "")
    .replace(/\{\{service\}\}/g, vars.service || "")
    .replace(/\{\{tracking_url\}\}/g, vars.tracking_url || "")
    .replace(/\{\{venue\}\}/g, vars.venue || "");
}

/**
 * محرك الإشعارات الذكي — يُرسل رسالة واتساب مخصصة أو افتراضية
 * للعميل بناءً على حالة الحجز.
 *
 * @param photographerId - معرّف المصورة (لجلب قوالبها المخصصة)
 * @param to             - رقم هاتف العميل
 * @param category       - فئة الحدث
 * @param vars           - متغيرات الرسالة
 */
export async function sendWhatsAppNotification(
  photographerId: string,
  to: string | null | undefined,
  category: NotificationCategory,
  vars: TemplateVars,
): Promise<WhatsAppResult> {
  if (!isWhatsAppConfigured()) return { ok: false, skipped: true };
  if (!to) return { ok: false, error: "no phone number" };

  let messageBody: string;

  try {
    // حاول جلب قالب مخصص للمصورة من قاعدة البيانات
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: tpl } = await supabaseAdmin
      .from("whatsapp_templates")
      .select("body")
      .eq("photographer_id", photographerId)
      .eq("category", category)
      .order("sort_order", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (tpl?.body) {
      // استخدم القالب المخصص مع استبدال المتغيرات
      messageBody = interpolateTemplate(tpl.body, vars);
    } else {
      // القالب الافتراضي للنظام
      messageBody = buildDefaultMessage(category, vars);
    }
  } catch (e) {
    // إذا فشل جلب القالب، استخدم الافتراضي (لا تكسر الإشعار)
    messageBody = buildDefaultMessage(category, vars);
  }

  return sendWhatsAppText(to, messageBody);
}
