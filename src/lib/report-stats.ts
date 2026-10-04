// حسابات تقارير المصوّرة — دالة نقية مشتركة بين الخادم والمتصفح.
// الخادم يستخدمها في getReportStats، والصفحة تستخدمها كبديل إذا تعذّر الوصول للخادم.

export type ReportStats = {
  totalRevenue: number;
  completedRevenue: number;
  upcomingRevenue: number;
  pendingDeposits: number;
  avgTicket: number;
  conversionRate: number;
  cancelRate: number;
  topService: string | null;
  thisMonthRevenue: number;
  lastMonthRevenue: number;
  revenueGrowth: number | null;
  monthly: { label: string; revenue: number; count: number }[];
  services: [string, { revenue: number; count: number }][];
  statusCounts: Record<string, number>;
  funnel: { stage: string; label: string; count: number }[];
  referralSources: { referrer_id: string; count: number }[];
  count: number;
};

export function statusLabel(s: string): string {
  switch (s) {
    case "quote": return "عرض سعر";
    case "pending_deposit": return "بانتظار العربون";
    case "confirmed": return "مؤكّد";
    case "completed": return "مكتمل";
    case "cancelled": return "ملغى";
    default: return s;
  }
}

export type ReportBooking = {
  id?: string; client_name?: string | null; event_date: string | null; service: string | null; status: string;
  total_price: number | null; deposit_amount: number | null; deposit_confirmed_at?: string | null;
  delivered_at?: string | null; created_at: string; cancelled_at?: string | null;
};

export function computeReportStats(
  bookings: ReportBooking[],
  range: string,
  referralSources: { referrer_id: string; count: number }[] = [],
): ReportStats {
  const data = { range };
    const all = bookings ?? [];
  const now = Date.now();

  // 2) فلترة حسب النطاق الزمني.
  const filtered = data.range === "all"
    ? all
    : all.filter((b: any) => {
        const d = b.event_date ? new Date(b.event_date).getTime() : new Date(b.created_at).getTime();
        return d >= now - Number(data.range) * 86400000;
      });

  // 3) حسابات الإيرادات.
  const earned = filtered.filter((b: any) => b.status === "completed" || b.status === "confirmed");
  const totalRevenue = earned.reduce((s: number, b: any) => s + Number(b.total_price ?? 0), 0);
  const completedRevenue = filtered.filter((b: any) => b.status === "completed")
    .reduce((s: number, b: any) => s + Number(b.total_price ?? 0), 0);
  const upcomingRevenue = filtered.filter((b: any) =>
    b.status === "confirmed" && b.event_date && new Date(b.event_date).getTime() >= now)
    .reduce((s: number, b: any) => s + Number(b.total_price ?? 0), 0);
  const pendingDeposits = filtered.filter((b: any) => b.status === "pending_deposit")
    .reduce((s: number, b: any) => s + Number(b.deposit_amount ?? 0), 0);

  // 4) معدل التحويل.
  const totalRequests = filtered.length;
  const confirmedCount = filtered.filter((b: any) =>
    ["confirmed", "completed"].includes(b.status)).length;
  const conversionRate = totalRequests > 0 ? Math.round((confirmedCount / totalRequests) * 100) : 0;

  // 5) معدل الإلغاء.
  const cancelledCount = filtered.filter((b: any) => b.status === "cancelled").length;
  const cancelRate = totalRequests > 0 ? Math.round((cancelledCount / totalRequests) * 100) : 0;

  // 6) أعلى خدمة.
  const svcCount: Record<string, number> = {};
  for (const b of filtered as any[]) {
    if (b.service) svcCount[b.service] = (svcCount[b.service] || 0) + 1;
  }
  const topService = Object.entries(svcCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  // 7) مقارنة شهرية.
  const startOfThisMonth = new Date(); startOfThisMonth.setDate(1); startOfThisMonth.setHours(0, 0, 0, 0);
  const startOfLastMonth = new Date(startOfThisMonth); startOfLastMonth.setMonth(startOfLastMonth.getMonth() - 1);
  const thisMonthBks = all.filter((b: any) => b.event_date && new Date(b.event_date) >= startOfThisMonth);
  const lastMonthBks = all.filter((b: any) => {
    const d = b.event_date ? new Date(b.event_date) : null;
    return d && d >= startOfLastMonth && d < startOfThisMonth;
  });
  const thisMonthRevenue = thisMonthBks.filter((b: any) => ["confirmed", "completed"].includes(b.status))
    .reduce((s: number, b: any) => s + Number(b.total_price ?? 0), 0);
  const lastMonthRevenue = lastMonthBks.filter((b: any) => ["confirmed", "completed"].includes(b.status))
    .reduce((s: number, b: any) => s + Number(b.total_price ?? 0), 0);
  const revenueGrowth = lastMonthRevenue > 0
    ? Math.round(((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100) : null;

  // 8) متوسط التذكرة.
  const avgTicket = earned.length ? totalRevenue / earned.length : 0;

  // 9) تجميع شهري (آخر 12 شهر).
  const months: Record<string, { label: string; revenue: number; count: number }> = {};
  for (let i = 11; i >= 0; i--) {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    months[key] = { label: d.toLocaleDateString("ar-JO", { month: "short", year: "2-digit" }), revenue: 0, count: 0 };
  }
  earned.forEach((b: any) => {
    if (!b.event_date) return;
    const d = new Date(b.event_date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (months[key]) { months[key].revenue += Number(b.total_price ?? 0); months[key].count += 1; }
  });
  const monthly = Object.values(months);

  // 10) حسب الخدمة.
  const byService: Record<string, { revenue: number; count: number }> = {};
  earned.forEach((b: any) => {
    const k = b.service || "غير محدد";
    byService[k] = byService[k] ?? { revenue: 0, count: 0 };
    byService[k].revenue += Number(b.total_price ?? 0);
    byService[k].count += 1;
  });
  const services = Object.entries(byService).sort((a, b) => b[1].revenue - a[1].revenue) as
    [string, { revenue: number; count: number }][];

  // 11) أعداد الحالات.
  const statusCounts: Record<string, number> = {};
  filtered.forEach((b: any) => { statusCounts[b.status] = (statusCounts[b.status] ?? 0) + 1; });

  // 12) قمع الحجز (Funnel).
  const funnel = [
    { stage: "quote", label: statusLabel("quote"), count: filtered.filter((b: any) => b.status === "quote").length },
    { stage: "pending_deposit", label: statusLabel("pending_deposit"), count: filtered.filter((b: any) => b.status === "pending_deposit").length },
    { stage: "confirmed", label: statusLabel("confirmed"), count: filtered.filter((b: any) => b.status === "confirmed").length },
    { stage: "delivered", label: "تم التسليم", count: filtered.filter((b: any) => b.status === "completed" && b.delivered_at).length },
    { stage: "completed", label: statusLabel("completed"), count: filtered.filter((b: any) => b.status === "completed").length },
    { stage: "cancelled", label: statusLabel("cancelled"), count: cancelledCount },
  ];

  return {
    totalRevenue,
    completedRevenue,
    upcomingRevenue,
    pendingDeposits,
    avgTicket,
    conversionRate,
    cancelRate,
    topService,
    thisMonthRevenue,
    lastMonthRevenue,
    revenueGrowth,
    monthly,
    services,
    statusCounts,
    funnel,
    referralSources,
    count: earned.length,
  } satisfies ReportStats;
}
