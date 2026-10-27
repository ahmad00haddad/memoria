import { arCount } from "@/lib/ar-count";
import { useEffect, useState } from "react";
import { g } from "@/hooks/use-gender";
import { Link, useLocation } from "@tanstack/react-router";
import { AlertTriangle, Clock, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { t, tx } from "@/i18n";

// ============================================================================
// SubscriptionGuard — شريط تنبيه أعلى لوحة المصوّرة عند قرب/انتهاء الاشتراك.
// ----------------------------------------------------------------------------
// كل ما يُقال هنا حقيقي: عند انتهاء الاشتراك يختفي الملف العام (RLS على
// profiles) فيتوقّف رابط البايو وتتوقّف طلبات الحجز الجديدة. حجوزات العميلات
// الحالية تبقى تعمل (صفحات التتبّع والعقود عبر service role).
// يظهر: منتهٍ (دائماً، لا يُغلق) · ≤7 أيام لاشتراك مدفوع · ≤3 أيام للتجربة.
// ============================================================================

type State = {
  kind: "expired" | "ending";
  daysLeft: number;
  trial: boolean;
  upcoming: number;
  username: string | null;
};

const DISMISS_KEY = "memoria.subguard.dismissed";

export function SubscriptionGuard() {
  const [s, setS] = useState<State | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    try {
      setDismissed(sessionStorage.getItem(DISMISS_KEY) === new Date().toDateString());
    } catch { /* ignore */ }
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const uid = session.user.id;
      const [{ data: sub }, { data: prof }, { count }] = await Promise.all([
        supabase.from("subscriptions").select("status, trial_ends_at, current_period_end").eq("photographer_id", uid).maybeSingle(),
        supabase.from("profiles").select("username").eq("id", uid).maybeSingle(),
        supabase.from("bookings").select("id", { count: "exact", head: true })
          .eq("photographer_id", uid).is("deleted_at", null)
          .in("status", ["confirmed", "pending_deposit"])
          .gte("event_date", new Date().toISOString().slice(0, 10)),
      ]);
      if (!sub) return;
      const trial = sub.status === "trial";
      const endIso = trial ? sub.trial_ends_at : sub.current_period_end;
      const end = endIso ? new Date(endIso).getTime() : 0;
      const daysLeft = Math.ceil((end - Date.now()) / 86400000);
      const expired = sub.status === "expired" || sub.status === "canceled" || daysLeft <= 0;
      if (!expired && daysLeft > (trial ? 3 : 7)) return;
      setS({ kind: expired ? "expired" : "ending", daysLeft: Math.max(0, daysLeft), trial, upcoming: count ?? 0, username: (prof as any)?.username ?? null });
    })().catch(() => {});
  }, []);

  if (!s || pathname.startsWith("/dashboard/subscription")) return null;
  if (s.kind === "ending" && dismissed) return null;

  const expired = s.kind === "expired";
  const when = s.daysLeft === 0 ? t("اليوم") : s.daysLeft === 1 ? t("غداً") : s.daysLeft === 2 ? t("بعد يومين") : t("بعد {0} أيام", [s.daysLeft]);

  return (
    <div className={`border-b ${expired ? "border-destructive/40 bg-destructive/10" : "border-amber-500/40 bg-amber-50 dark:bg-amber-950/30"}`}>
      <div className="container-editorial flex flex-wrap items-center gap-3 py-2.5 sm:items-start sm:py-3">
        {expired
          ? <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          : <Clock className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />}
        <div className="min-w-0 flex-1 text-sm leading-relaxed">
          <div className={`font-semibold ${expired ? "text-destructive" : "text-amber-800 dark:text-amber-300"}`}>
            {expired
              ? t("اشتراكك منتهي — ملفك مخفي الآن عن العرائس")
              : `${s.trial ? t("تجربتك المجانية تنتهي") : t("اشتراكك ينتهي")} ${when}`}
          </div>
          {/* على الهاتف يكفي العنوان والزر؛ التفاصيل للشاشات الأكبر */}
          <div className={`text-foreground/80 ${expired ? "" : "hidden sm:block"}`}>
            {expired ? (
              <>{t("رابط ملفك")}{s.username ? <> <span dir="ltr" className="font-mono">@{tx(s.username)}</span></> : null}{" "}{t("متوقّف، ولن تصلك طلبات حجز جديدة حتى التجديد.")}</>
            ) : (
              <>{t("بعدها يختفي ملفك من البحث ويتوقف رابط البايو وطلبات الحجز الجديدة.")}</>
            )}
            {s.upcoming > 0 && (
              <>{" "}{t("لديك")}{" "}<strong>{arCount(s.upcoming, t("حجز قادم"), t("حجزان قادمان"), t("حجوزات قادمة"), t("حجزاً قادماً"))}</strong>{" "}{t("— تبقى متابعتها تعمل كالمعتاد.")}</>
            )}
          </div>
        </div>
        <Link
          to="/dashboard/subscription"
          className={`shrink-0 inline-flex min-h-10 items-center rounded-full px-4 text-sm font-medium ${expired ? "bg-destructive text-destructive-foreground" : "bg-charcoal text-ivory dark:bg-gold dark:text-charcoal"}`}
        >
          {expired ? g(t("جدّدي الآن"), t("جدّد الآن")) : g(t("جدّدي الاشتراك"), t("جدّد الاشتراك"))}
        </Link>
        {!expired && (
          <button
            aria-label={t("إخفاء لليوم")}
            onClick={() => { try { sessionStorage.setItem(DISMISS_KEY, new Date().toDateString()); } catch { /* ignore */ } setDismissed(true); }}
            className="shrink-0 rounded-full p-1.5 text-muted-foreground hover:bg-black/5"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
