import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getAdminPlatformStats } from "@/lib/admin.functions";
import {
  Users, CreditCard, AlertCircle, Star, ShieldAlert, Bell,
  FileText, TrendingUp, CheckCircle2, XCircle, Clock,
  BarChart3, MessageSquare, Award, RefreshCw,
} from "lucide-react";
import { PageLoader } from "@/components/ui/loading";
import { toast } from "sonner";
import { locale } from "@/i18n";
import { t, tx } from "@/i18n";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const getFn = useServerFn(getAdminPlatformStats);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const data = await getFn();
      setStats(data);
    } catch (e: any) {
      toast.error(e.message ?? t("فشل تحميل الإحصاءات"));
    }
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  if (loading) return <PageLoader />;
  if (!stats) return <div className="py-12 text-center text-muted-foreground">{t("لا توجد بيانات.")}</div>;

  const s = stats;

  return (
    <div className="space-y-8">
      {/* ─── إحصاءات المصورات ─── */}
      <section>
        <h2 className="font-serif text-lg mb-3 text-muted-foreground uppercase tracking-widest text-xs">{t("المصوّرات")}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard label={t("إجمالي المصوّرات")} value={s.photographers.total} icon={<Users className="h-5 w-5 text-gold" />} to="/admin/photographers" color="gold" />
          <StatCard label={t("منشورات")} value={s.photographers.published} icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />} to="/admin/photographers" color="emerald" />
          <StatCard label={t("موثّقات")} value={s.photographers.verified} icon={<Award className="h-5 w-5 text-blue-600" />} to="/admin/photographers" color="blue" />
        </div>
      </section>

      {/* ─── إحصاءات الحجوزات ─── */}
      <section>
        <h2 className="font-serif text-lg mb-3 text-muted-foreground uppercase tracking-widest text-xs">{t("الحجوزات")}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label={t("إجمالي الحجوزات")} value={s.bookings.total} icon={<CreditCard className="h-5 w-5 text-charcoal" />} to="/admin/bookings" color="charcoal" />
          <StatCard label={t("مؤكّدة")} value={s.bookings.confirmed} icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />} to="/admin/bookings" color="emerald" />
          <StatCard label={t("مكتملة")} value={s.bookings.completed} icon={<Star className="h-5 w-5 text-gold" />} to="/admin/bookings" color="gold" />
          <StatCard label={t("ملغاة")} value={s.bookings.cancelled} icon={<XCircle className="h-5 w-5 text-destructive" />} to="/admin/bookings" color="red" />
        </div>
      </section>

      {/* ─── المالية والاشتراكات ─── */}
      <section>
        <h2 className="font-serif text-lg mb-3 text-muted-foreground uppercase tracking-widest text-xs">{t("المالية والاشتراكات")}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <RevenueCard label={t("إجمالي الإيرادات")} value={`${s.payments.totalRevenue.toLocaleString(locale("ar-JO"))} JD`} icon={<TrendingUp className="h-5 w-5 text-emerald-600" />} to="/admin/subscriptions" />
          <RevenueCard label={t("إجمالي العربون")} value={`${s.payments.totalDeposits.toLocaleString(locale("ar-JO"))} JD`} icon={<BarChart3 className="h-5 w-5 text-blue-600" />} to="/admin/subscriptions" />
          <StatCard label={t("اشتراكات نشطة")} value={s.payments.activeSubscriptions} icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />} to="/admin/subscriptions" color="emerald" />
          <StatCard label={t("دفعات قيد المراجعة")} value={s.payments.pendingCount} icon={<AlertCircle className="h-5 w-5 text-amber-600" />} to="/admin/subscriptions" color="amber" badge={s.payments.pendingCount > 0} />
        </div>
      </section>

      {/* ─── المحتوى والنشاط ─── */}
      <section>
        <h2 className="font-serif text-lg mb-3 text-muted-foreground uppercase tracking-widest text-xs">{t("المحتوى والنشاط")}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <StatCard label={t("إجمالي التقييمات")} value={s.reviews.total} icon={<Star className="h-5 w-5 text-gold" />} to="/admin/reviews" color="gold" />
          <StatCard label={t("تقييمات قيد المراجعة")} value={s.reviews.pending} icon={<Clock className="h-5 w-5 text-amber-600" />} to="/admin/reviews" color="amber" badge={s.reviews.pending > 0} />
          <StatCard label={t("نزاعات مفتوحة")} value={s.disputes.open} icon={<ShieldAlert className="h-5 w-5 text-destructive" />} to="/admin/disputes" color="red" badge={s.disputes.open > 0} />
          <StatCard label={t("الإشعارات")} value={s.platform.totalNotifications} icon={<Bell className="h-5 w-5 text-charcoal" />} to="/admin/notifications" color="charcoal" />
          <StatCard label={t("الرسائل")} value={s.platform.totalMessages} icon={<MessageSquare className="h-5 w-5 text-charcoal" />} to="/admin/bookings" color="charcoal" />
          <StatCard label={t("العقود")} value={s.platform.totalContracts} icon={<FileText className="h-5 w-5 text-charcoal" />} to="/admin/contracts" color="charcoal" />
        </div>
      </section>

      {/* ─── آخر 7 أيام ─── */}
      <section>
        <h2 className="font-serif text-lg mb-3 text-muted-foreground uppercase tracking-widest text-xs">{t("النشاط — آخر 7 أيام")}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <StatCard label={t("حجوزات جديدة")} value={s.activity.recentBookings} icon={<TrendingUp className="h-5 w-5 text-emerald-600" />} to="/admin/bookings" color="emerald" />
          <StatCard label={t("مصوّرات جديدة")} value={s.activity.recentSignups} icon={<Users className="h-5 w-5 text-gold" />} to="/admin/photographers" color="gold" />
        </div>
      </section>

      {/* ─── روابط سريعة ─── */}
      <section>
        <h2 className="font-serif text-lg mb-3 text-muted-foreground uppercase tracking-widest text-xs">{t("إجراءات سريعة")}</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <QuickLink to="/admin/photographers" label={t("إدارة المصوّرات")} desc={t("نشر، إخفاء، توثيق")} icon={<Users className="h-5 w-5" />} />
          <QuickLink to="/admin/subscriptions" label={t("مراجعة الدفعات")} desc={t("قبول أو رفض الاشتراكات")} icon={<CreditCard className="h-5 w-5" />} badge={s.payments.pendingCount} />
          <QuickLink to="/admin/reviews" label={t("مراجعة التقييمات")} desc={t("نشر أو رفض التقييمات")} icon={<Star className="h-5 w-5" />} badge={s.reviews.pending} />
          <QuickLink to="/admin/disputes" label={t("حل النزاعات")} desc={t("مراجعة وحل النزاعات")} icon={<ShieldAlert className="h-5 w-5" />} badge={s.disputes.open} />
          <QuickLink to="/admin/bookings" label={t("جميع الحجوزات")} desc={t("عرض وإلغاء الحجوزات")} icon={<FileText className="h-5 w-5" />} />
          <QuickLink to="/admin/contracts" label={t("العقود")} desc={t("عرض العقود الموقّعة")} icon={<FileText className="h-5 w-5" />} />
          <QuickLink to="/admin/referrals" label={t("الإحالات")} desc={t("نظام الإحالة والمكافآت")} icon={<Award className="h-5 w-5" />} />
          <QuickLink to="/admin/roles" label={t("إدارة الأدوار")} desc={t("منح وسحب صلاحيات الأدمن")} icon={<ShieldAlert className="h-5 w-5" />} />
          <QuickLink to="/admin/notifications" label={t("الإشعارات")} desc={t("عرض جميع إشعارات المنصة")} icon={<Bell className="h-5 w-5" />} />
          <QuickLink to="/admin/email-log" label={t("سجل البريد")} desc={t("رسائل الإيميل المُرسَلة")} icon={<MessageSquare className="h-5 w-5" />} />
          <QuickLink to="/admin/audit-log" label={t("سجل العمليات")} desc={t("تتبع كل تغيير في المنصة")} icon={<RefreshCw className="h-5 w-5" />} />
          <QuickLink to="/admin/refunds" label={t("طلبات الاسترداد")} desc={t("مراجعة طلبات الاسترداد")} icon={<BarChart3 className="h-5 w-5" />} />
        </div>
      </section>
    </div>
  );
}

function StatCard({
  label, value, icon, to, color, badge,
}: { label: string; value: number; icon: React.ReactNode; to: string; color?: string; badge?: boolean }) {
  return (
    <Link to={to} className="relative rounded-sm border border-border bg-card p-5 hover:shadow-soft transition group">
      {badge && (
        <span className="absolute top-3 start-3 w-2.5 h-2.5 rounded-full bg-destructive animate-pulse" />
      )}
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs uppercase tracking-[0.15em] text-muted-foreground leading-snug">{tx(label)}</div>
        {tx(icon)}
      </div>
      <div className="font-serif text-3xl">{value.toLocaleString(locale("ar-JO"))}</div>
    </Link>
  );
}

function RevenueCard({ label, value, icon, to }: { label: string; value: string; icon: React.ReactNode; to: string }) {
  return (
    <Link to={to} className="rounded-sm border border-border bg-card p-5 hover:shadow-soft transition">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs uppercase tracking-[0.15em] text-muted-foreground">{tx(label)}</div>
        {tx(icon)}
      </div>
      <div className="font-serif text-2xl">{tx(value)}</div>
    </Link>
  );
}

function QuickLink({ to, label, desc, icon, badge }: { to: string; label: string; desc: string; icon: React.ReactNode; badge?: number }) {
  return (
    <Link
      to={to}
      className="relative rounded-sm border border-border bg-card p-4 hover:border-gold/60 hover:shadow-soft transition flex items-start gap-3"
    >
      {!!badge && (
        <span className="absolute top-3 start-3 bg-destructive text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
          {tx(badge)}
        </span>
      )}
      <div className="text-muted-foreground mt-0.5">{tx(icon)}</div>
      <div>
        <div className="font-medium text-sm">{tx(label)}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{tx(desc)}</div>
      </div>
    </Link>
  );
}