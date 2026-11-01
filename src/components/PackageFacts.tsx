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

/**
 * سطر «من يصوّر» يظهر فقط إذا لم تكن هي وحدها (الافتراضي المتوقّع):
 * مع فريقها، أو فريقها بدونها — وهذا الأخير مهم جداً للعروس فيُبرز.
 */
function shooterLine(shooter: string | null | undefined, gender: "female" | "male"): { text: string; warn: boolean } | null {
  const m = gender === "male";
  if (shooter === "me_team") return { text: m ? tr("يصوّر بنفسه مع فريقه") : tr("تصوّر بنفسها مع فريقها"), warn: false };
  if (shooter === "team") return { text: m ? tr("يصوّر فريقه — هو لن يحضر بنفسه") : tr("يصوّر فريقها — هي لن تحضر بنفسها"), warn: true };
  return null;
}

/**
 * الإلزامي الوحيد: من يصوّر فعلياً (أهم ما تسأل عنه العروس). الباقي اختياري حتى
 * لا تثقل التعبئة على المصوّرة؛ مدة التسليم تُحسب من تسليماتها الفعلية بدل أن تكتبها.
 */
export function missingDisclosures(r: PackageDisclosure): string[] {
  if (r.package === "addon") return [];
  return r.shooter ? [] : [tr("من يصوّر")];
}

/** هل في الباقة أي تفصيل يستحق العرض؟ («أنا بنفسي» وحدها افتراضية فلا تُعرض) */
export function hasFacts(d: PackageDisclosure): boolean {
  const set = (v: unknown) => v !== null && v !== undefined && String(v).trim() !== "";
  return !!(d.hours || d.deliverable_count || set(d.overtime_fee) || d.revision_rounds || set(d.excludes) || d.unedited_included
    || (d.shooter && d.shooter !== "me"));
}

const n = (v: number) => v.toLocaleString(locale("ar-JO"));

/** قائمة الإفصاحات كما تراها العروس. compact = سطور صغيرة داخل بطاقة الباقة. */
export function PackageFacts({ d, compact = false, className = "", gender = "female" }: { d: PackageDisclosure; compact?: boolean; className?: string; gender?: "female" | "male" | string | null }) {
  const video = d.service === "cinematic_video";
  const rows: { icon: typeof Clock; text: string; tone?: "no" | "yes" | "warn" }[] = [];
  const who = shooterLine(d.shooter, gender === "male" ? "male" : "female");
  if (who) rows.push({ icon: User, text: who.text, tone: who.warn ? "warn" : undefined });
  if (d.hours) rows.push({ icon: Clock, text: tr("{0} ساعات تصوير", [n(Number(d.hours))]) });
  if (d.deliverable_count) rows.push(video
    ? { icon: Film, text: tr("فيلم نهائي حوالي {0} دقيقة", [n(Number(d.deliverable_count))]) }
    : { icon: Images, text: tr("حوالي {0} صورة معدّلة", [n(Number(d.deliverable_count))]) });
  if (d.unedited_included && !video) rows.push({ icon: CheckCircle2, text: tr("وكل الصور الصالحة غير المعدّلة"), tone: "yes" });
  if (d.delivery_days) rows.push({ icon: CalendarClock, text: tr("التسليم خلال {0} يوماً من المناسبة", [n(Number(d.delivery_days))]) });
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
          <div key={i} className={`flex items-start gap-2 ${r.tone === "warn" ? "rounded-sm bg-amber-500/10 px-2 py-1 font-medium text-amber-800 dark:text-amber-300" : ""}`}>
            <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${r.tone === "yes" ? "text-emerald-600" : r.tone === "warn" ? "text-amber-600" : "text-gold"}`} />
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
