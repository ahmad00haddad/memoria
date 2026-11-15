// وعود الباقة المثبّتة على الحجز بعد إنشائه (لقطة الباقة، الصور الموعودة، موعد التسليم، سعر الساعة الإضافية).
// يُستعمل من طلب العروس العادي ومن قبول عرض سعر، فيخرج الحجزان بنفس الاكتمال.
import { t as tr } from "@/i18n";

export type PromiseItem = { rule_id: string; label: string; price: number; qty: number; kind: "main" | "addon" };

export async function applyPackagePromises(
  admin: any,
  a: {
    bookingId: string;
    eventDate: string;
    mainRule: any;
    items: PromiseItem[];
    profile: { gender?: string | null };
    bookedMinutes: number;
    clientNotes?: string | null;
    /** طلب العروس العادي يمر بموافقة المصوّرة؛ عرض السعر المقبول لا (هي من عرضته) */
    needsApproval: boolean;
  },
): Promise<{ error: any }> {
  const m: any = a.mainRule;
  const days = m.delivery_days != null ? Number(m.delivery_days) : null;
  const snapshot = {
    label: m.label, price: Number(m.price), service: m.service, subtitle: m.subtitle ?? null, description: m.description ?? null,
    hours: m.hours != null ? Number(m.hours) : null, deliverable_count: m.deliverable_count ?? null, delivery_days: days,
    shooter: m.shooter ?? null, overtime_fee: m.overtime_fee != null ? Number(m.overtime_fee) : null,
    excludes: m.excludes ?? null, unedited_included: !!m.unedited_included, revision_rounds: m.revision_rounds ?? null,
    addons: a.items.filter((x) => x.kind === "addon"), gender: (a.profile as any).gender ?? "female", taken_at: new Date().toISOString(),
  };
  const promised: Record<string, unknown> = { package_snapshot: snapshot };
  if ((m.service === "photography" || m.service === "photo_video") && m.deliverable_count != null) promised.photos_promised = m.deliverable_count;
  if (days != null) {
    promised.delivery_days_promised = days;
    const due = new Date(`${a.eventDate}T12:00:00Z`);
    due.setUTCDate(due.getUTCDate() + days);
    promised.delivery_due_at = due.toISOString();
  }
  if (m.overtime_fee != null) promised.overtime_fee_per_hour = Number(m.overtime_fee);
  // مدة مطلوبة أطول من ساعات الباقة: تنبيه ظاهر للمصوّرة بملاحظات الطلب (الفرق يُتفق عليه كساعات إضافية)
  if (m.hours != null && a.bookedMinutes > Number(m.hours) * 60 + 15) {
    const extra = Math.round(((a.bookedMinutes - Number(m.hours) * 60) / 60) * 10) / 10;
    promised.client_notes = `${a.clientNotes ? a.clientNotes + "\n\n" : ""}[تنبيه آلي] المدة المطلوبة ${Math.round(a.bookedMinutes / 6) / 10} ساعة وباقة "${m.label}" ${m.hours} ساعة؛ الفرق ${extra} ساعة يُتفق عليه كساعات إضافية${m.overtime_fee ? ` (${m.overtime_fee} د.أ للساعة)` : ""}.`;
  }
  const { error } = await admin.from("bookings")
    .update({ ...(a.needsApproval ? { needs_approval: true } : {}), ...promised } as any).eq("id", a.bookingId);
  return { error };
}

export const PROMISES_FAILED_MESSAGE = () => tr("تعذّر إرسال الطلب، حاولي مرة أخرى");
