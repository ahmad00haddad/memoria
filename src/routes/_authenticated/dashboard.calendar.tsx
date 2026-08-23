import { Lightbulb } from "lucide-react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { PageLoader } from "@/components/ui/loading";
import { useEffect, useState } from "react";
import { Header } from "@/components/site/Header";
import { BackToDashboard } from "@/components/site/BackToDashboard";
import { Footer } from "@/components/site/Footer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { X, RefreshCw, Copy, Check, Download, Upload, RefreshCcw } from "lucide-react";
import { syncExternalIcal } from "@/lib/ical-sync.functions";
import { useServerFn } from "@tanstack/react-start";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { ar } from "date-fns/locale";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/dashboard/calendar")({ component: CalendarPage });

let cachedCalendarData: {
  unavail: any[];
  bookings: any[];
  icalUrl: string;
  lastSync: string | null;
  autoSync: boolean;
  exportToken: string | null;
} | null = null;

function CalendarPage() {
  const nav = useNavigate();
  const [uid, setUid] = useState("");
  const [unavail, setUnavail] = useState<{ id: string; date: string; reason: string | null }[]>(cachedCalendarData?.unavail ?? []);
  const [bookings, setBookings] = useState<{ event_date: string; start_time: string; end_time: string; status: string; client_name: string }[]>(cachedCalendarData?.bookings ?? []);
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");
  const [weekday, setWeekday] = useState<string>("5"); // 5 = الجمعة
  const [weeks, setWeeks] = useState<number>(26); // ~6 أشهر
  const [recurringReason, setRecurringReason] = useState("عطلة أسبوعية");
  const [loading, setLoading] = useState(!cachedCalendarData);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [icalUrl, setIcalUrl] = useState(cachedCalendarData?.icalUrl ?? "");
  const [lastSync, setLastSync] = useState<string | null>(cachedCalendarData?.lastSync ?? null);
  const [syncing, setSyncing] = useState(false);
  const [autoSync, setAutoSync] = useState(cachedCalendarData?.autoSync ?? false);
  const [exportToken, setExportToken] = useState<string | null>(cachedCalendarData?.exportToken ?? null);
  const [copied, setCopied] = useState(false);
  const runSync = useServerFn(syncExternalIcal);

  const load = async (id: string) => {
    const [{ data: u }, { data: b }, { data: p }] = await Promise.all([
      supabase.from("photographer_unavailability").select("*").eq("photographer_id", id).order("date"),
      supabase.from("bookings").select("event_date,start_time,end_time,status,client_name").eq("photographer_id", id).is("deleted_at", null).order("event_date"),
      supabase.from("photographer_private").select("external_ical_url,external_ical_synced_at,external_ical_auto_sync,ical_token").eq("user_id", id).maybeSingle(),
    ]);
    const unavailList = (u ?? []) as any;
    const bookingsList = (b ?? []) as any;
    const ical = p?.external_ical_url ?? "";
    const sync = p?.external_ical_synced_at ?? null;
    const auto = !!(p as any)?.external_ical_auto_sync;
    const token = (p as any)?.ical_token ?? null;

    cachedCalendarData = {
      unavail: unavailList,
      bookings: bookingsList,
      icalUrl: ical,
      lastSync: sync,
      autoSync: auto,
      exportToken: token,
    };

    setUnavail(unavailList);
    setBookings(bookingsList);
    setIcalUrl(ical);
    setLastSync(sync);
    setAutoSync(auto);
    setExportToken(token);
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
    const { error } = await supabase.from("photographer_private").upsert({ user_id: uid, external_ical_url: icalUrl || null, external_ical_auto_sync: autoSync }, { onConflict: "user_id" });
    if (error) return toast.error(error.message);
    toast.success("تم الحفظ");
  };

  const toggleAutoSync = async (val: boolean) => {
    setAutoSync(val);
    const { error } = await supabase.from("photographer_private").upsert({ user_id: uid, external_ical_url: icalUrl || null, external_ical_auto_sync: val }, { onConflict: "user_id" });
    if (error) { setAutoSync(!val); return toast.error(error.message); }
    toast.success(val ? "تم تفعيل المزامنة التلقائية كل ٣٠ دقيقة" : "تم إيقاف المزامنة التلقائية");
  };

  const exportUrl = exportToken ? `${typeof window !== "undefined" ? window.location.origin : ""}/api/public/ical/${exportToken}` : "";
  const webcalUrl = exportUrl.replace(/^https?:/, "webcal:");
  const copyExport = async () => {
    if (!exportUrl) return;
    try {
      await navigator.clipboard.writeText(exportUrl);
      setCopied(true); setTimeout(() => setCopied(false), 2000);
      toast.success("تم نسخ الرابط");
    } catch { toast.error("تعذّر النسخ"); }
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

  if (loading) return <PageLoader />;
  if (loadError) return <div className="min-h-screen grid place-items-center px-4 text-sm text-destructive">{loadError}</div>;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <section className="container-editorial py-12 max-w-3xl">
        <BackToDashboard />
        <h1 className="font-serif text-4xl mt-2 mb-8">التقويم وإدارة التوفر</h1>

        <div className="rounded-sm border border-border bg-card p-6 shadow-soft mb-8">
          <h2 className="font-serif text-xl mb-3">حجب يوم</h2>
          <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
            استخدمي هذا القسم لإغلاق الأيام غير المتاحة عليكِ، مثل السفر أو الحجوزات الخارجية. الأيام المحجوبة ستمنع العميل من اختيارها أثناء الطلب.
          </p>
          <div className="flex flex-wrap gap-3 items-end">
            <Popover>
              <PopoverTrigger asChild>
                <button className={`flex items-center gap-2 border border-border rounded-sm px-3 py-2 bg-background w-[240px] text-right ${!date && "text-muted-foreground"}`}>
                  <CalendarIcon className="h-4 w-4 opacity-50" />
                  {date ? format(new Date(date), "PPP", { locale: ar }) : <span>اختر يوماً...</span>}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date ? new Date(date) : undefined}
                  onSelect={(d) => setDate(d ? format(d, "yyyy-MM-dd") : "")}
                  locale={ar}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <input placeholder="السبب (اختياري)" value={reason} onChange={(e) => setReason(e.target.value)} className="border border-border rounded-sm px-3 py-2 bg-background flex-1 min-w-[200px]" />
            <button onClick={block} className="bg-charcoal text-ivory px-6 py-2 rounded-sm hover:opacity-90 active:scale-95 transition-transform duration-200">حجب</button>
          </div>
          {unavail.length >= 7 && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-4 bg-sky-50 text-sky-800 border border-sky-200 rounded-sm p-3 text-sm flex items-start gap-2">
              <span className="text-lg">🌴</span>
              <p>💡 <strong>تلميح الإجازة:</strong> يبدو أنكِ قمتِ بحجب أيام عديدة! هذا ممتاز لمنع الحجوزات أثناء إجازتكِ. لن تظهر هذه الأيام للعرائس في نموذج الحجز أبداً.</p>
            </motion.div>
          )}
        </div>

        <div className="rounded-sm border border-border bg-card p-6 shadow-soft mb-8">
          <h2 className="font-serif text-2xl mb-2">مزامنة التقويم مع Google / Apple</h2>
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
            اختاري الطريقة الأنسب لكِ. كل الخيارات تعمل مع Google Calendar و Apple Calendar و Outlook.
          </p>

          {/* خيار 1: تصدير إلى تقويمك */}
          <div className="rounded-sm border border-border p-5 mb-5 bg-background/50">
            <div className="flex items-center gap-2 mb-2">
              <Download className="h-5 w-5 text-gold" />
              <h3 className="font-serif text-lg">الخيار ١ — تصدير حجوزاتي إلى تقويمي الشخصي</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
              <strong>الأنسب لكِ إذا:</strong> تريدين رؤية الحجوزات والأيام المحجوبة داخل Google/Apple Calendar الخاص بكِ مباشرة (للقراءة فقط).
              أي حجز جديد أو تعديل سيظهر تلقائياً في تقويمك خلال دقائق دون أي إعداد إضافي.
            </p>
            <p className="text-xs text-muted-foreground mb-3">
              <strong>الطريقة:</strong> انسخي الرابط أدناه ثم في Google Calendar → إضافة تقويم → من URL → الصقي الرابط. في iPhone: الإعدادات → التقويم → الحسابات → اشتراك بتقويم.
            </p>
            <div className="flex flex-wrap gap-2 items-center">
              <input readOnly value={exportUrl} className="border border-border rounded-sm px-3 py-2 bg-secondary/30 flex-1 min-w-[260px] text-xs ltr:font-mono active:scale-95 transition-transform duration-200" dir="ltr" />
              <button onClick={copyExport} className="inline-flex items-center gap-2 border border-border px-3 py-2 rounded-sm hover:bg-secondary active:scale-95 transition-transform duration-200">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "تم النسخ" : "نسخ"}
              </button>
              <a href={webcalUrl} className="inline-flex items-center gap-2 bg-charcoal text-ivory px-3 py-2 rounded-sm hover:opacity-90 text-sm active:scale-95 transition-transform duration-200">
                فتح في تطبيق التقويم
              </a>
            </div>
          </div>

          {/* خيار 2: استيراد يدوي */}
          <div className="rounded-sm border border-border p-5 mb-5 bg-background/50">
            <div className="flex items-center gap-2 mb-2">
              <Upload className="h-5 w-5 text-gold" />
              <h3 className="font-serif text-lg">الخيار ٢ — استيراد مشاغلي من Google يدوياً</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
              <strong>الأنسب لكِ إذا:</strong> تريدين منع العميل من حجز يوم لديكِ فيه ارتباط شخصي مسجّل في Google Calendar.
              تضغطين زر "مزامنة الآن" متى ما أحببتِ، وسنحجب الأيام التي عليها فعاليات.
            </p>
            <p className="text-xs text-muted-foreground mb-3">
              <strong>الطريقة:</strong> Google Calendar → إعدادات التقويم → العنوان السرّي بتنسيق iCal → انسخي الرابط والصقيه هنا.
            </p>
            <div className="flex flex-wrap gap-2 items-end">
              <input value={icalUrl} onChange={(e) => setIcalUrl(e.target.value)} placeholder="https://calendar.google.com/calendar/ical/.../basic.ics" className="border border-border rounded-sm px-3 py-2 bg-background flex-1 min-w-[260px] text-xs" dir="ltr" />
              <button onClick={saveIcalUrl} className="border border-border px-4 py-2 rounded-sm hover:bg-secondary text-sm active:scale-95 transition-transform duration-200">حفظ</button>
              <button onClick={doSync} disabled={syncing || !icalUrl} className="inline-flex items-center gap-2 bg-charcoal text-ivory px-4 py-2 rounded-sm disabled:opacity-60 text-sm active:scale-95 transition-transform duration-200">
                <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} /> مزامنة الآن
              </button>
            </div>
            {lastSync && <p className="text-xs text-muted-foreground mt-2">آخر مزامنة: {new Date(lastSync).toLocaleString("ar-JO")}</p>}
          </div>

          {/* خيار 3: مزامنة تلقائية */}
          <div className="rounded-sm border-2 border-gold/40 p-5 bg-gold/5">
            <div className="flex items-center gap-2 mb-2">
              <RefreshCcw className="h-5 w-5 text-gold" />
              <h3 className="font-serif text-lg">الخيار ٣ — مزامنة تلقائية ثنائية الاتجاه (موصى به)</h3>
              <span className="ml-auto text-[10px] px-2 py-0.5 bg-gold text-charcoal rounded-sm font-medium">الأقوى</span>
            </div>
            <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
              <strong>الأنسب لكِ إذا:</strong> تريدين كل شيء يحصل من نفسه دون أي تدخّل يومي.
              نقوم بسحب مشاغلكِ من Google كل <strong>٣٠ دقيقة</strong> تلقائياً، وفي نفس الوقت تكون حجوزاتك ظاهرة في تقويم Google عبر رابط الخيار ١.
            </p>
            <p className="text-xs text-muted-foreground mb-3">
              <strong>الطريقة:</strong> فعّلي الزرّ أدناه + استخدمي رابط الخيار ١ في تقويمك = مزامنة كاملة في الاتجاهين.
            </p>
            <div className="flex flex-wrap items-center justify-between gap-3 mt-3">
              <div>
                <div className="text-sm font-medium">المزامنة التلقائية كل ٣٠ دقيقة</div>
                <div className="text-xs text-muted-foreground">يجب أن يكون رابط iCal في الخيار ٢ محفوظاً</div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={autoSync}
                onClick={() => toggleAutoSync(!autoSync)}
                disabled={!icalUrl}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${autoSync ? "bg-gold" : "bg-secondary"}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${autoSync ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>
            {!icalUrl && <p className="text-xs text-destructive mt-2">احفظي رابط iCal أولاً في الخيار ٢ لتفعيل المزامنة التلقائية.</p>}
          </div>
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
          <button onClick={blockRecurring} className="mt-4 bg-charcoal text-ivory px-6 py-2 rounded-sm hover:opacity-90 active:scale-95 transition-transform duration-200">حجب جميع الأيام</button>
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
                <span className="text-xs px-2 py-1 bg-secondary rounded-sm active:scale-95 transition-transform duration-200">{b.status}</span>
              </div>
            ))}
        </div>
      </section>
      <Footer />
    </div>
  );
}