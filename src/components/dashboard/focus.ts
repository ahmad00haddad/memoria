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
  if (days === 0) return "اليوم";
  if (days === 1) return "غداً";
  if (days === -1) return "أمس";
  if (days === 2) return "بعد يومين";
  if (days > 0) return `بعد ${days} أيام`;
  return `منذ ${Math.abs(days)} أيام`;
}

export function ageLabel(iso: string) {
  const hours = Math.floor((Date.now() - new Date(iso).getTime()) / 3600000);
  if (hours < 1) return "الآن";
  if (hours < 24) return `منذ ${hours} ساعة`;
  const d = Math.floor(hours / 24);
  return d === 1 ? "منذ يوم" : `منذ ${d} أيام`;
}

export function computeFocusItems(bookings: FocusBooking[], sub: any): FocusItem[] {
  const items: FocusItem[] = [];
  const now = Date.now();

  for (const b of bookings) {
    const name = b.client_name || "العميلة";
    const link = { to: "/dashboard/bookings/$id", params: { id: b.id } };

    // ١) عربون وصل وينتظر التأكيد — أعلى أولوية لأنه مال ينتظر
    if (b.status === "pending_deposit" && (b.deposit_proof_url || b.deposit_sent_at)) {
      items.push({
        id: `proof-${b.id}`, tone: "urgent", priority: 100,
        title: `عربون ${name} وصل`,
        detail: `${b.deposit_amount ? `${b.deposit_amount} د.أ · ` : ""}أُرسل ${ageLabel(b.deposit_sent_at ?? b.created_at)} — راجعي الإثبات وأكّدي الحجز`,
        cta: "راجعي الإثبات", ...link,
      });
      continue;
    }

    // ٢) تسليم متأخر
    if (b.delivery_due_at && b.production_stage !== "delivered" && b.status !== "cancelled") {
      const d = daysFromToday(b.delivery_due_at);
      if (d < 0) {
        items.push({
          id: `late-${b.id}`, tone: "urgent", priority: 90 + Math.min(9, -d),
          title: `تسليم ${name} متأخر ${-d === 1 ? "يوماً" : `${-d} أيام`}`,
          detail: "حدّثي مرحلة الإنتاج أو تواصلي مع العميلة بموعد جديد",
          cta: "افتحي الحجز", ...link,
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
          title: `تصوير ${name} ${relativeDay(d)}`,
          detail: "راجعي ملاحظات العميلة وقائمة اللقطات قبل اليوم",
          cta: "تفاصيل الحجز", ...link,
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
          title: `طلب حجز من ${name}`,
          detail: `وصل ${ageLabel(b.created_at)} · بانتظار العربون`,
          cta: "افتحي الطلب", ...link,
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
          title: `تسليم ${name} ${relativeDay(d)}`,
          detail: "تابعي التحرير في لوحة الإنتاج",
          cta: "لوحة الإنتاج", to: "/dashboard/production",
        });
        continue;
      }
    }

    // ٦) سُلّم ولم تصل الدفعة النهائية
    if (b.production_stage === "delivered" && !b.final_paid_at && b.status !== "cancelled") {
      items.push({
        id: `final-${b.id}`, tone: "info", priority: 30,
        title: `الدفعة النهائية من ${name} لم تصل`,
        detail: "المعرض سيبقى بعلامة مائية حتى تسجيل الدفعة",
        cta: "سجّلي الدفعة", ...link,
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
          title: sub.status === "trial" ? `الفترة التجريبية تنتهي ${relativeDay(d)}` : `اشتراكك ينتهي ${relativeDay(d)}`,
          detail: "جدّدي الآن ليبقى ملفك ظاهراً للعرائس دون انقطاع",
          cta: "جدّدي", to: "/dashboard/subscription",
        });
      }
    }
  }

  return items.sort((a, b) => b.priority - a.priority);
}
