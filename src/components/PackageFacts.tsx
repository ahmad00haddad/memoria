import { Clock, Images, Film, CalendarClock, User, Timer, XCircle, CheckCircle2, RefreshCw } from "lucide-react";
import { t as tr, tx, locale } from "@/i18n";

// ============================================================================
// إفصاحات الباقة — ما يجب أن تعرفه العروس قبل الطلب (ولا يتغيّر بعده: لقطة ثابتة)
// ============================================================================

export type PackageDisclosure = {
  service?: "photography" | "cinematic_video" | string;
  package?: string;
  hours?: number | null;
  deliverable_count?: number | null;
  delivery_days?: number | null;
  shooter?: "me" | "me_team" | "team" | string | null;
  overtime_fee?: number | null;
  excludes?: string | null;
  unedited_included?: boolean | null;
  revision_rounds?: number | null;
};

export const SHOOTER_LABEL: Record<string, string> = {
  me: "المصوّرة نفسها",
  me_team: "المصوّرة مع فريقها",
  team: "مصوّرة من فريقها",
};

/** الحقول الإلزامية الناقصة في باقة أساسية (الإضافات معفاة). */
export function missingDisclosures(r: PackageDisclosure): string[] {
  if (r.package === "addon") return [];
  const out: string[] = [];
  const num = (v: unknown) => v !== null && v !== undefined && String(v).trim() !== "" && !Number.isNaN(Number(v));
  if (!num(r.hours) || Number(r.hours) <= 0) out.push(tr("مدة التصوير"));
  if (!num(r.deliverable_count) || Number(r.deliverable_count) <= 0) out.push(r.service === "cinematic_video" ? tr("مدة الفيلم") : tr("عدد الصور المعدّلة"));
  if (!num(r.delivery_days) || Number(r.delivery_days) <= 0) out.push(tr("مدة التسليم"));
  if (!r.shooter) out.push(tr("من يصوّر"));
  if (!num(r.overtime_fee) || Number(r.overtime_fee) < 0) out.push(tr("سعر الساعة الإضافية"));
  return out;
}

const n = (v: number) => v.toLocaleString(locale("ar-JO"));

/** قائمة الإفصاحات كما تراها العروس. compact = سطور صغيرة داخل بطاقة الباقة. */
export function PackageFacts({ d, compact = false, className = "" }: { d: PackageDisclosure; compact?: boolean; className?: string }) {
  const video = d.service === "cinematic_video";
  const rows: { icon: typeof Clock; text: string; tone?: "no" | "yes" }[] = [];
  if (d.hours) rows.push({ icon: Clock, text: tr("{0} ساعات تصوير", [n(Number(d.hours))]) });
  if (d.deliverable_count) rows.push(video
    ? { icon: Film, text: tr("فيلم نهائي حوالي {0} دقيقة", [n(Number(d.deliverable_count))]) }
    : { icon: Images, text: tr("حوالي {0} صورة معدّلة", [n(Number(d.deliverable_count))]) });
  if (d.unedited_included && !video) rows.push({ icon: CheckCircle2, text: tr("وكل الصور الصالحة غير المعدّلة"), tone: "yes" });
  if (d.delivery_days) rows.push({ icon: CalendarClock, text: tr("التسليم خلال {0} يوماً من المناسبة", [n(Number(d.delivery_days))]) });
  if (d.shooter) rows.push({ icon: User, text: tr("يصوّر: {0}", [tr(SHOOTER_LABEL[d.shooter] ?? d.shooter)]) });
  if (d.overtime_fee != null && String(d.overtime_fee) !== "") rows.push({ icon: Timer, text: Number(d.overtime_fee) > 0
    ? tr("الساعة الإضافية: {0} د.أ", [n(Number(d.overtime_fee))])
    : tr("لا يوجد تمديد بعد انتهاء الوقت") });
  if (d.revision_rounds) rows.push({ icon: RefreshCw, text: tr("{0} جولة تعديل مجانية", [n(Number(d.revision_rounds))]) });
  const excludes = (d.excludes ?? "").split(/\n|،|,/).map((x) => x.trim()).filter(Boolean);
  if (!rows.length && !excludes.length) return null;

  return (
    <div className={`${compact ? "space-y-1.5 text-[13px]" : "space-y-2 text-sm"} ${className}`}>
      {rows.map((r, i) => {
        const Icon = r.icon;
        return (
          <div key={i} className="flex items-start gap-2">
            <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${r.tone === "yes" ? "text-emerald-600" : "text-gold"}`} />
            <span>{tx(r.text)}</span>
          </div>
        );
      })}
      {excludes.length > 0 && (
        <div className="flex items-start gap-2 text-muted-foreground">
          <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive/70" />
          <span>{tr("لا تشمل:")}{" "}{excludes.map((x) => tx(x)).join("، ")}</span>
        </div>
      )}
    </div>
  );
}
