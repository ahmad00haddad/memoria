import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { photographerFunnelAdmin } from "@/lib/admin.functions";
import { PageLoader } from "@/components/ui/loading";
import { t } from "@/i18n";

export const Route = createFileRoute("/_authenticated/admin/funnel")({ component: Funnel });

const STAGES = [
  { key: "onboarding", label: "لم تكمل الإعداد" },
  { key: "onboarded", label: "أكملت الإعداد بلا باقة" },
  { key: "package", label: "عندها باقة، غير منشورة" },
  { key: "published", label: "منشورة، بلا حجوزات" },
  { key: "booking", label: "وصلها حجز" },
] as const;

// خطوات معالج الإعداد (onboarding_step) كما في onboarding.tsx
const STEP_NAMES = ["الترحيب", "معلوماتك الأساسية", "أول باقة أسعار", "الدفع والعربون", "نشر ملفك"];

function Funnel() {
  const fn = useServerFn(photographerFunnelAdmin);
  const [rows, setRows] = useState<any[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { fn().then(setRows).catch((e) => setErr(e?.message ?? "error")); }, [fn]);
  if (err) return <p className="text-destructive">{err}</p>;
  if (!rows) return <PageLoader />;

  const total = rows.length || 1;
  const counts = STAGES.map((s) => ({ ...s, n: rows.filter((r) => r.stage === s.key).length }));
  const stuck = rows.filter((r) => r.stage === "onboarding");
  const byStep = STEP_NAMES.map((name, i) => ({ name, n: stuck.filter((r) => Math.min(r.step, STEP_NAMES.length - 1) === i).length }));
  const times = rows.map((r) => r.hoursToOnboard).filter((h) => h !== null).sort((a, b) => a - b);
  const median = times.length ? times[Math.floor(times.length / 2)] : null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl">{t("وين بيتعثّروا")}</h1>
        <p className="text-sm text-muted-foreground">{t("{0} مصوّرة (بدون الحسابات التجريبية). كل مصوّرة في أبعد مرحلة وصلتها.", [rows.length])}</p>
      </div>

      <section className="space-y-2">
        {counts.map((c) => (
          <div key={c.key} className="flex items-center gap-3 text-sm">
            <span className="w-44 shrink-0">{t(c.label)}</span>
            <div className="h-3 flex-1 overflow-hidden rounded-full bg-secondary">
              <div className="h-full rounded-full bg-gold" style={{ width: `${(c.n / total) * 100}%` }} />
            </div>
            <span className="w-10 text-end tabular-nums">{c.n}</span>
          </div>
        ))}
      </section>

      <section>
        <h2 className="mb-2 font-serif text-xl">{t("اللواتي لم يكملن الإعداد: آخر خطوة وصلنها")}</h2>
        <ul className="divide-y divide-border rounded-xl border border-border text-sm">
          {byStep.map((s, i) => <li key={i} className="flex justify-between px-4 py-2"><span>{i + 1}. {t(s.name)}</span><span className="tabular-nums">{s.n}</span></li>)}
        </ul>
        <p className="mt-2 text-xs text-muted-foreground">{median !== null ? t("الوسيط من التسجيل حتى إكمال الإعداد: {0} ساعة", [median]) : t("لا بيانات كافية بعد")}</p>
      </section>

      <section>
        <h2 className="mb-2 font-serif text-xl">{t("كل المصوّرات")}</h2>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-xs text-muted-foreground">
              <tr><th className="p-2 text-start">{t("الاسم")}</th><th className="p-2">{t("التسجيل")}</th><th className="p-2">{t("المرحلة")}</th><th className="p-2">{t("صور")}</th><th className="p-2">{t("أول حجز")}</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.sort((a, b) => (a.created_at < b.created_at ? 1 : -1)).map((r) => (
                <tr key={r.id}>
                  <td className="p-2">{r.name}</td>
                  <td className="p-2 text-center tabular-nums" dir="ltr">{String(r.created_at).slice(0, 10)}</td>
                  <td className="p-2 text-center">{t(STAGES.find((s) => s.key === r.stage)?.label ?? r.stage)}{r.stage === "onboarding" ? ` (${Math.min(r.step, STEP_NAMES.length - 1) + 1}/${STEP_NAMES.length})` : ""}</td>
                  <td className="p-2 text-center tabular-nums">{r.photos}</td>
                  <td className="p-2 text-center tabular-nums" dir="ltr">{r.firstBookingAt ? String(r.firstBookingAt).slice(0, 10) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
