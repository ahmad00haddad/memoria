import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { X, RefreshCw } from "lucide-react";
import { syncExternalIcal } from "@/lib/ical-sync.functions";
import { useServerFn } from "@tanstack/react-start";

export const Route = createFileRoute("/dashboard/calendar")({ component: CalendarPage });

function CalendarPage() {
  const nav = useNavigate();
  const [uid, setUid] = useState("");
  const [unavail, setUnavail] = useState<{ id: string; date: string; reason: string | null }[]>([]);
  const [bookings, setBookings] = useState<{ event_date: string; start_time: string; end_time: string; status: string; client_name: string }[]>([]);
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");
  const [weekday, setWeekday] = useState<string>("5"); // 5 = الجمعة
  const [weeks, setWeeks] = useState<number>(26); // ~6 أشهر
  const [recurringReason, setRecurringReason] = useState("عطلة أسبوعية");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [icalUrl, setIcalUrl] = useState("");
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const runSync = useServerFn(syncExternalIcal);

  const load = async (id: string) => {
    const [{ data: u }, { data: b }, { data: p }] = await Promise.all([
      supabase.from("photographer_unavailability").select("*").eq("photographer_id", id).order("date"),
      supabase.from("bookings").select("event_date,start_time,end_time,status,client_name").eq("photographer_id", id).order("event_date"),
      supabase.from("profiles").select("external_ical_url,external_ical_synced_at").eq("id", id).maybeSingle(),
    ]);
    setUnavail((u ?? []) as any);
    setBookings((b ?? []) as any);
    setIcalUrl(p?.external_ical_url ?? "");
    setLastSync(p?.external_ical_synced_at ?? null);
  };

  useEffect(() => {
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return nav({ to: "/login" });
        setUid(session.user.id);
        await load(session.user.id);
      } catch (error: any) {
        setLoadError(error?.message || "تعذّر تحميل التقويم.");
      } finally {
        setLoading(false);
      }
    })();
  }, [nav]);

  const block = async () => {
    if (!date) return;
    const { error } = await supabase.from("photographer_unavailability").insert({ photographer_id: uid, date, reason });
    if (error) return toast.error(error.message);
    setDate(""); setReason(""); toast.success("تم حجب اليوم");
    load(uid);
  };
  const unblock = async (id: string) => {
    await supabase.from("photographer_unavailability").delete().eq("id", id);
    load(uid);
  };

  const blockRecurring = async () => {
    const wd = Number(weekday);
    const total = Math.max(1, Math.min(104, Number(weeks) || 26));
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const dates: string[] = [];
    // ابدئي من أول وقوع للأسبوع المختار ابتداءً من اليوم
    const start = new Date(today);
    const diff = (wd - start.getDay() + 7) % 7;
    start.setDate(start.getDate() + diff);
    for (let i = 0; i < total; i++) {
      const d = new Date(start); d.setDate(start.getDate() + i * 7);
      dates.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
    }
    const existing = new Set(unavail.map((u) => u.date));
    const rows = dates.filter((d) => !existing.has(d)).map((d) => ({ photographer_id: uid, date: d, reason: recurringReason || "عطلة أسبوعية" }));
    if (!rows.length) return toast.info("جميع هذه الأيام محجوبة مسبقاً");
    const { error } = await supabase.from("photographer_unavailability").insert(rows);
    if (error) return toast.error(error.message);
    toast.success(`تم حجب ${rows.length} يوماً`);
    load(uid);
  };

  const saveIcalUrl = async () => {
    const { error } = await supabase.from("profiles").update({ external_ical_url: icalUrl || null }).eq("id", uid);
    if (error) return toast.error(error.message);
    toast.success("تم الحفظ");
  };

  const doSync = async () => {
    if (!icalUrl) return toast.error("ألصقي رابط iCal من Google أولاً");
    setSyncing(true);
    try {
      const r = await runSync();
      toast.success(`تمت المزامنة: ${r.inserted} حدث`);
      load(uid);
    } catch (e: any) {
      toast.error(e?.message || "تعذّرت المزامنة");
    } finally { setSyncing(false); }
  };

  if (loading) return <div className="min-h-screen grid place-items-center">جاري التحميل…</div>;
  if (loadError) return <div className="min-h-screen grid place-items-center px-4 text-sm text-destructive">{loadError}</div>;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <section className="container-editorial py-12 max-w-3xl">
        <Link to="/dashboard" className="text-xs text-muted-foreground hover:text-gold">← اللوحة</Link>
        <h1 className="font-serif text-4xl mt-2 mb-8">التقويم وإدارة التوفر</h1>

        <div className="rounded-sm border border-border bg-card p-6 shadow-soft mb-8">
          <h2 className="font-serif text-xl mb-3">حجب يوم</h2>
          <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
            استخدمي هذا القسم لإغلاق الأيام غير المتاحة عليكِ، مثل السفر أو الحجوزات الخارجية. الأيام المحجوبة ستمنع العميل من اختيارها أثناء الطلب.
          </p>
          <div className="flex flex-wrap gap-3 items-end">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="border border-border rounded-sm px-3 py-2 bg-background" />
            <input placeholder="السبب (اختياري)" value={reason} onChange={(e) => setReason(e.target.value)} className="border border-border rounded-sm px-3 py-2 bg-background flex-1 min-w-[200px]" />
            <button onClick={block} className="bg-charcoal text-ivory px-6 py-2 rounded-sm hover:opacity-90">حجب</button>
          </div>
        </div>

        <div className="rounded-sm border border-border bg-card p-6 shadow-soft mb-8">
          <h2 className="font-serif text-xl mb-3">مزامنة Google Calendar</h2>
          <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
            ألصقي رابط <strong>Secret iCal address</strong> من إعدادات تقويم Google. سنجلب فعالياتك تلقائياً ونحجب أيامها لديكِ كي لا يتمكّن العميل من اختيارها.
            (Google Calendar → إعدادات التقويم → عنوان iCal الخاص بالتنسيق السرّي)
          </p>
          <div className="flex flex-wrap gap-3 items-end">
            <input value={icalUrl} onChange={(e) => setIcalUrl(e.target.value)} placeholder="https://calendar.google.com/calendar/ical/.../basic.ics" className="border border-border rounded-sm px-3 py-2 bg-background flex-1 min-w-[260px]" />
            <button onClick={saveIcalUrl} className="border border-border px-4 py-2 rounded-sm hover:bg-secondary">حفظ</button>
            <button onClick={doSync} disabled={syncing} className="inline-flex items-center gap-2 bg-charcoal text-ivory px-4 py-2 rounded-sm disabled:opacity-60">
              <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} /> مزامنة الآن
            </button>
          </div>
          {lastSync && <p className="text-xs text-muted-foreground mt-2">آخر مزامنة: {new Date(lastSync).toLocaleString("ar-JO")}</p>}
        </div>

        <div className="rounded-sm border border-border bg-card p-6 shadow-soft mb-8">
          <h2 className="font-serif text-xl mb-3">حجب يوم أسبوعي متكرر</h2>
          <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
            مثال: حجب كل أيام الجمعة كعطلة رسمية دائمة لكِ، بحيث لا يستطيع العملاء اختيارها.
          </p>
          <div className="grid sm:grid-cols-4 gap-3 items-end">
            <div>
              <label className="text-xs text-muted-foreground">اليوم</label>
              <select value={weekday} onChange={(e) => setWeekday(e.target.value)} className="w-full mt-1 border border-border rounded-sm px-3 py-2 bg-background">
                <option value="0">الأحد</option>
                <option value="1">الإثنين</option>
                <option value="2">الثلاثاء</option>
                <option value="3">الأربعاء</option>
                <option value="4">الخميس</option>
                <option value="5">الجمعة</option>
                <option value="6">السبت</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">عدد الأسابيع</label>
              <input type="number" min={1} max={104} value={weeks} onChange={(e) => setWeeks(Number(e.target.value))} className="w-full mt-1 border border-border rounded-sm px-3 py-2 bg-background" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-muted-foreground">السبب</label>
              <input value={recurringReason} onChange={(e) => setRecurringReason(e.target.value)} className="w-full mt-1 border border-border rounded-sm px-3 py-2 bg-background" />
            </div>
          </div>
          <button onClick={blockRecurring} className="mt-4 bg-charcoal text-ivory px-6 py-2 rounded-sm hover:opacity-90">حجب جميع الأيام</button>
        </div>

        <h2 className="font-serif text-xl mb-3">الأيام المحجوبة</h2>
        <div className="rounded-sm border border-border bg-card overflow-hidden mb-8">
          {unavail.length === 0 ? <p className="p-4 text-sm text-muted-foreground">لا توجد أيام محجوبة حاليًا.</p> : unavail.map((u) => (
            <div key={u.id} className="flex items-center justify-between p-3 border-b border-border last:border-0">
              <div><div className="text-sm">{new Date(u.date).toLocaleDateString("ar-JO", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</div>{u.reason && <div className="text-xs text-muted-foreground">{u.reason}</div>}</div>
              <button onClick={() => unblock(u.id)} className="text-destructive p-2"><X className="h-4 w-4" /></button>
            </div>
          ))}
        </div>

        <h2 className="font-serif text-xl mb-3">الحجوزات القادمة</h2>
        <div className="rounded-sm border border-border bg-card overflow-hidden">
          {bookings.filter((b) => new Date(b.event_date) >= new Date(Date.now() - 86400000)).length === 0
            ? <p className="p-4 text-sm text-muted-foreground">لا حجوزات قادمة.</p>
            : bookings.filter((b) => new Date(b.event_date) >= new Date(Date.now() - 86400000)).map((b, i) => (
              <div key={i} className="flex items-center justify-between p-3 border-b border-border last:border-0">
                <div>
                  <div className="text-sm">{new Date(b.event_date).toLocaleDateString("ar-JO")} · {b.start_time?.slice(0,5)}–{b.end_time?.slice(0,5)}</div>
                  <div className="text-xs text-muted-foreground">{b.client_name}</div>
                </div>
                <span className="text-xs px-2 py-1 bg-secondary rounded-sm">{b.status}</span>
              </div>
            ))}
        </div>
      </section>
      <Footer />
    </div>
  );
}