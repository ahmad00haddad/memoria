import { createServerFn } from "@tanstack/react-start";
import { t as tr } from "@/i18n";

// ============================================================================
// contact.functions.ts — فورم «تواصلي معنا» عبر السيرفر (حدّ معدّل + حدود أطوال)
// بدل الإدراج المباشر من المتصفح في contact_messages.
// ============================================================================

export const sendContactMessage = createServerFn({ method: "POST" })
  .inputValidator((d: { name: string; email: string; phone?: string; message: string }) => {
    const name = String(d?.name ?? "").trim();
    const email = String(d?.email ?? "").trim().toLowerCase();
    const phone = String(d?.phone ?? "").trim();
    const message = String(d?.message ?? "").trim();
    if (!name || !email || !message) throw new Error(tr("يرجى تعبئة جميع الحقول المطلوبة"));
    if (name.length > 120) throw new Error(tr("الاسم طويل جداً"));
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 200) throw new Error(tr("اكتبي إيميلاً صحيحاً"));
    if (phone.length > 40) throw new Error(tr("رقم الهاتف طويل جداً"));
    if (message.length > 3000) throw new Error(tr("الرسالة طويلة جداً"));
    return { name, email, phone: phone || null, message };
  })
  .handler(async ({ data }) => {
    const ab = await import("@/lib/abuse.server");
    if (!(await ab.allow(`ip:${ab.clientIp()}`, "contact_ip", 5, 3600))) throw new Error(ab.TOO_MANY);
    if (!(await ab.allow(`mail:${data.email}`, "contact_email", 3, 86400))) throw new Error(ab.TOO_MANY);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as any).from("contact_messages").insert(data);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
