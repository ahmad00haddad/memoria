import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { t } from "@/i18n";

// ============================================================================
// manual-booking.functions.ts — حجز يدوي سريع لعميلة جاءت من خارج المنصة
// ----------------------------------------------------------------------------
// المصوّرة تضيف حجزاً وصلها على الواتساب/الهاتف ليصبح كل عملها في مكان واحد:
// تقويم بلا تعارض، رابط متابعة للعميلة، وعقد تلقائي عند تأكيد العربون.
//
// قواعد:
//   * photographer_id من الجلسة فقط (لا يُقبل من المتصفح).
//   * فحص التعارض مع الحجوزات الأخرى (has_booking_conflict). الأيام المغلقة
//     يدوياً لا تمنع — غالباً أغلقتها المصوّرة لهذا الحجز نفسه.
//   * الحجز اليدوي يُعتبر موثّقاً (verified_via = "manual") لأن المصوّرة هي من
//     أضافته؛ لا تُرسل له إشعارات "طلب جديد".
//   * لا يحتاج اشتراكاً نشطاً: تنظيم الحجوزات القائمة مسموح دائماً.
// ============================================================================

type Input = {
  client_name: string;
  client_phone: string;
  client_email?: string;
  service: "photography" | "cinematic_video";
  event_date: string; // YYYY-MM-DD
  start_time: string; // HH:MM
  end_time: string; // HH:MM
  venue_name?: string;
  total_price: number;
  deposit_amount: number;
  deposit_received: boolean;
  package_label?: string;
  notes?: string;
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function validate(d: Input): Input {
  if (!d || typeof d !== "object") throw new Error(t("بيانات غير صالحة"));
  const name = String(d.client_name ?? "").trim();
  const phone = String(d.client_phone ?? "").replace(/[^\d+]/g, "");
  const email = String(d.client_email ?? "").trim().toLowerCase();
  if (name.length < 2 || name.length > 80) throw new Error(t("اكتبي اسم العميلة"));
  if (phone.replace(/\D/g, "").length < 9 || phone.length > 16) throw new Error(t("رقم الهاتف غير صحيح"));
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error(t("البريد الإلكتروني غير صحيح"));
  if (d.service !== "photography" && d.service !== "cinematic_video") throw new Error(t("نوع الخدمة غير صالح"));
  if (!DATE_RE.test(d.event_date)) throw new Error(t("اختاري تاريخ المناسبة"));
  if (!TIME_RE.test(d.start_time) || !TIME_RE.test(d.end_time)) throw new Error(t("الوقت غير صالح"));
  if (d.end_time <= d.start_time) throw new Error(t("وقت النهاية يجب أن يكون بعد البداية"));
  const total = Number(d.total_price);
  const deposit = Number(d.deposit_amount);
  if (!Number.isFinite(total) || total < 0 || total > 100000) throw new Error(t("السعر غير صالح"));
  if (!Number.isFinite(deposit) || deposit < 0 || deposit > total) throw new Error(t("العربون لا يمكن أن يتجاوز السعر"));
  return {
    client_name: name,
    client_phone: phone,
    client_email: email,
    service: d.service,
    event_date: d.event_date,
    start_time: d.start_time,
    end_time: d.end_time,
    venue_name: String(d.venue_name ?? "").trim().slice(0, 120),
    total_price: Math.round(total * 1000) / 1000,
    deposit_amount: Math.round(deposit * 1000) / 1000,
    deposit_received: !!d.deposit_received,
    package_label: String(d.package_label ?? "").trim().slice(0, 120),
    notes: String(d.notes ?? "").trim().slice(0, 1000),
  };
}

export const createManualBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: Input) => validate(d))
  .handler(async ({ data, context }) => {
    const { userId } = context as any;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: prof } = await supabaseAdmin.from("profiles").select("id, display_name").eq("id", userId).maybeSingle();
    if (!prof) throw new Error(t("الحساب غير موجود"));

    const { data: conflict, error: cErr } = await (supabaseAdmin.rpc as any)("has_booking_conflict", {
      _pid: userId,
      _date: data.event_date,
      _start: data.start_time,
      _end: data.end_time,
      _exclude: null,
    });
    if (cErr) console.error("[manual-booking] conflict check failed:", cErr.message);
    if (conflict === true) throw new Error(t("عندك حجز آخر في هذا اليوم"));

    const deposit = data.deposit_amount;
    const confirmed = data.deposit_received || deposit === 0;
    const now = new Date().toISOString();
    const addons = data.package_label
      ? [{ label: data.package_label, price: data.total_price, qty: 1, kind: "main" }]
      : [];

    const { data: row, error } = await (supabaseAdmin as any)
      .from("bookings")
      .insert({
        photographer_id: userId,
        client_name: data.client_name,
        client_phone: data.client_phone,
        client_email: data.client_email || "",
        service: data.service,
        event_date: data.event_date,
        start_time: data.start_time,
        end_time: data.end_time,
        venue_name: data.venue_name || null,
        base_price: data.total_price,
        travel_fee: 0,
        total_price: data.total_price,
        deposit_amount: deposit,
        privacy_level: "no_publish",
        photographer_can_publish: false,
        photographer_notes: [t("حجز يدوي (من خارج المنصة)"), data.notes].filter(Boolean).join("\n"),
        contract_agreed: false,
        status: confirmed ? "confirmed" : "pending_deposit",
        deposit_confirmed_at: confirmed ? now : null,
        addons,
        phone_verified_at: now,
        verified_via: "manual",
      })
      .select("id, client_tracking_token")
      .single();
    if (error || !row) throw new Error(error?.message || t("تعذّر إنشاء الحجز"));

    // عقد تلقائي من قالب المصوّرة عند التأكيد (إن وُجد قالب)
    let contractToken: string | null = null;
    if (confirmed) {
      try {
        await (supabaseAdmin.rpc as any)("auto_generate_contract", { _booking_id: row.id });
        const { data: c } = await supabaseAdmin.from("contracts").select("sign_token")
          .eq("booking_id", row.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
        contractToken = (c as any)?.sign_token ?? null;
      } catch (e) {
        console.error("[manual-booking] auto_generate_contract failed:", e);
      }
    }

    const { data: priv } = await supabaseAdmin.from("photographer_private").select("cliq_alias").eq("user_id", userId).maybeSingle();

    await supabaseAdmin.from("audit_logs").insert({
      action: "booking.manual_create",
      actor_id: userId,
      entity_type: "booking",
      entity_id: row.id,
      after_data: { event_date: data.event_date, total: data.total_price, deposit, confirmed },
    } as any);

    return {
      booking_id: row.id as string,
      tracking_token: row.client_tracking_token as string,
      contract_token: contractToken,
      confirmed,
      cliq_alias: (priv as any)?.cliq_alias ?? null,
      photographer_name: (prof as any).display_name ?? "",
    };
  });
