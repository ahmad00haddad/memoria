import { g } from "@/hooks/use-gender";
import { arCount } from "@/lib/ar-count";
import { t } from "@/i18n";
// يحسب "مهام اليوم" للمصوّرة من بيانات الحجوزات والاشتراك.
// كل مهمة لها أولوية؛ الأعلى يظهر كـ"مهمة اليوم" والباقي في قائمة مطويّة.

export type FocusTone = "urgent" | "soon" | "info";

export type FocusItem = {
  id: string;
  tone: FocusTone;
  title: string;
  detail: string;
  cta: string;
  to: string;
  params?: Record<string, string>;
  priority: number;
};

export type FocusBooking = {
  id: string;
  client_name: string;
  status: string;
  created_at: string;
  event_date: string | null;
  delivery_due_at: string | null;
  production_stage: string | null;
  deposit_proof_url: string | null;
  deposit_sent_at: string | null;
  final_paid_at: string | null;
  deposit_amount: number | null;
  needs_approval?: boolean | null;
  approved_at?: string | null;
  phone_verified_at?: string | null;
};

const DAY = 86400000;

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

/** عدد الأيام بين اليوم وتاريخ معيّن (سالب = في الماضي). */
export function daysFromToday(date: string | Date) {
  return Math.round((startOfDay(new Date(date)) - startOfDay(new Date())) / DAY);
}

export function relativeDay(days: number) {
  if (days === 0) return t("اليوم");
  if (days === 1) return t("غداً");
  if (days === -1) return t("أمس");
  if (days === 2) return t("بعد يومين");
  if (days > 0) return t("بعد {0} أيام", [days]);
  return t("منذ {0} أيام", [Math.abs(days)]);
}

export function ageLabel(iso: string) {
  const hours = Math.floor((Date.now() - new Date(iso).getTime()) / 3600000);
  if (hours < 1) return t("الآن");
  if (hours < 24) return t("منذ {0} ساعة", [hours]);
  const d = Math.floor(hours / 24);
  return t("منذ {0}", [arCount(d, "يوم", "يومين", "أيام", "يوماً")]);
}

export function computeFocusItems(bookings: FocusBooking[], sub: any): FocusItem[] {
  const items: FocusItem[] = [];
  const now = Date.now();

  for (const b of bookings) {
    const name = b.client_name || t("العميلة");
    const link = { to: "/dashboard/bookings/$id", params: { id: b.id } };

    // ٠) طلب ينتظر موافقتها — أعلى أولوية: بعد 24 ساعة يُلغى تلقائياً
    if (b.needs_approval && !b.approved_at && b.phone_verified_at && (b.status === "pending_deposit" || b.status === "quote")) {
      const left = Math.max(0, Math.ceil((new Date(b.phone_verified_at).getTime() + DAY - now) / 3600000));
      items.push({
        id: `approve-${b.id}`, tone: "urgent", priority: 110,
        title: t("طلب {0} بانتظار موافقتك", [name]),
        detail: t("باقي {0} ساعة — بعدها يُلغى الطلب تلقائياً", [left]),
        cta: g(t("وافقي أو ارفضي"), t("وافق أو ارفض")), ...link,
      });
      continue;
    }

    // ١) عربون وصل وينتظر التأكيد — أعلى أولوية لأنه مال ينتظر
    if (b.status === "pending_deposit" && (b.deposit_proof_url || b.deposit_sent_at)) {
      items.push({
        id: `proof-${b.id}`, tone: "urgent", priority: 100,
        title: t("عربون {0} وصل", [name]),
        detail: t("{0}أُرسل {1} — {2}", [b.deposit_amount ? `${b.deposit_amount} د.أ · ` : "", ageLabel(b.deposit_sent_at ?? b.created_at), g("راجعي الإثبات وأكّدي الحجز", "راجع الإثبات وأكّد الحجز")]),
        cta: g(t("راجعي الإثبات"), t("راجع الإثبات")), ...link,
      });
      continue;
    }

    // ٢) تسليم متأخر
    if (b.delivery_due_at && b.production_stage !== "delivered" && b.status !== "cancelled") {
      const d = daysFromToday(b.delivery_due_at);
      if (d < 0) {
        items.push({
          id: `late-${b.id}`, tone: "urgent", priority: 90 + Math.min(9, -d),
          title: t("تسليم {0} متأخر {1}", [name, arCount(-d, "يوماً", "يومين", "أيام", "يوماً")]),
          detail: g(t("حدّثي مرحلة الإنتاج أو تواصلي مع العميلة بموعد جديد"), t("حدّث مرحلة الإنتاج أو تواصل مع العميلة بموعد جديد")),
          cta: g(t("افتحي الحجز"), t("افتح الحجز")), ...link,
        });
        continue;
      }
    }

    // ٣) تصوير خلال ٣ أيام
    if (b.status === "confirmed" && b.event_date) {
      const d = daysFromToday(b.event_date);
      if (d >= 0 && d <= 3) {
        items.push({
          id: `event-${b.id}`, tone: d <= 1 ? "urgent" : "soon", priority: 80 - d,
          title: t("تصوير {0} {1}", [name, relativeDay(d)]),
          detail: g(t("راجعي ملاحظات العميلة وقائمة اللقطات قبل اليوم"), t("راجع ملاحظات العميلة وقائمة اللقطات قبل اليوم")),
          cta: t("تفاصيل الحجز"), ...link,
        });
        continue;
      }
    }

    // ٤) طلب جديد لم يُرد عليه
    if (b.status === "quote" || (b.status === "pending_deposit" && !b.deposit_proof_url && !b.deposit_sent_at)) {
      const ageDays = (now - new Date(b.created_at).getTime()) / DAY;
      if (ageDays <= 5) {
        items.push({
          id: `new-${b.id}`, tone: ageDays > 2 ? "soon" : "info", priority: 60 + Math.min(9, Math.floor(ageDays * 2)),
          title: t("طلب حجز من {0}", [name]),
          detail: t("وصل {0} · بانتظار العربون", [ageLabel(b.created_at)]),
          cta: g(t("افتحي الطلب"), t("افتح الطلب")), ...link,
        });
        continue;
      }
    }

    // ٥) تسليم خلال ٧ أيام
    if (b.delivery_due_at && b.production_stage !== "delivered" && b.status !== "cancelled") {
      const d = daysFromToday(b.delivery_due_at);
      if (d >= 0 && d <= 7) {
        items.push({
          id: `due-${b.id}`, tone: d <= 2 ? "soon" : "info", priority: 50 - d,
          title: t("تسليم {0} {1}", [name, relativeDay(d)]),
          detail: g(t("تابعي التحرير في لوحة الإنتاج"), t("تابع التحرير في لوحة الإنتاج")),
          cta: t("لوحة الإنتاج"), to: "/dashboard/production",
        });
        continue;
      }
    }

    // ٦) سُلّم ولم تصل الدفعة النهائية
    if (b.production_stage === "delivered" && !b.final_paid_at && b.status !== "cancelled") {
      items.push({
        id: `final-${b.id}`, tone: "info", priority: 30,
        title: t("الدفعة النهائية من {0} لم تصل", [name]),
        detail: t("المعرض سيبقى بعلامة مائية حتى تسجيل الدفعة"),
        cta: g(t("سجّلي الدفعة"), t("سجّل الدفعة")), ...link,
      });
    }
  }

  // ٧) اشتراك يقترب من الانتهاء
  if (sub) {
    const end = sub.status === "trial" ? sub.trial_ends_at : sub.current_period_end;
    if (end) {
      const d = daysFromToday(end);
      if (d >= 0 && d <= 7 && (sub.status === "trial" || sub.status === "active")) {
        items.push({
          id: "sub", tone: d <= 3 ? "urgent" : "soon", priority: 70,
          title: sub.status === "trial" ? t("الفترة التجريبية تنتهي {0}", [relativeDay(d)]) : t("اشتراكك ينتهي {0}", [relativeDay(d)]),
          detail: g(t("جدّدي الآن ليبقى ملفك ظاهراً للعرائس دون انقطاع"), t("جدّد الآن ليبقى ملفك ظاهراً للعرائس دون انقطاع")),
          cta: g(t("جدّدي"), t("جدّد")), to: "/dashboard/subscription",
        });
      }
    }
  }

  return items.sort((a, b) => b.priority - a.priority);
}
