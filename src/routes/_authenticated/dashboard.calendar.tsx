import { friendlyError } from "@/lib/friendlyErrors";
import { g } from "@/hooks/use-gender";
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
import { syncExternalIcal, getIcalStatus, type IcalStatus } from "@/lib/ical-sync.functions";
import { useServerFn } from "@tanstack/react-start";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { ar } from "date-fns/locale";
import { format } from "date-fns";
import { MonthGrid } from "@/components/dashboard/MonthGrid";
import { GoogleConnectCard } from "@/components/dashboard/GoogleConnectCard";
import { hapticVibrate } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

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
  const [bookings, setBookings] = useState<{ id?: string; event_date: string; start_time: string; end_time: string; status: string; client_name: string }[]>(cachedCalendarData?.bookings ?? []);
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
  const fetchStatus = useServerFn(getIcalStatus);
  const [status, setStatus] = useState<IcalStatus | null>(null);
  useEffect(() => { fetchStatus().then(setStatus).catch(() => {}); }, []);

  const load = async (id: string) => {
    const [{ data: u }, { data: b }, { data: p }] = await Promise.all([
      supabase.from("photographer_unavailability").select("*").eq("photographer_id", id).order("date"),
      supabase.from("bookings").select("id,event_date,start_time,end_time,status,client_name").eq("photographer_id", id).is("deleted_at", null).not("phone_verified_at" as any, "is", null).order("event_date"),
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
    const row = unavail.find((u) => u.id === id);
    setUnavail((l) => l.filter((u) => u.id !== id));
    const { error } = await supabase.from("photographer_unavailability").delete().eq("id", id);
    if (error) { load(uid); return toast.error(error.message); }
    if (row) {
      toast(`فُتح يوم ${new Date(row.date).toLocaleDateString("ar-JO", { day: "numeric", month: "long" })}`, {
        action: { label: "تراجع", onClick: async () => { await supabase.from("photographer_unavailability").insert({ photographer_id: uid, date: row.date, reason: row.reason }); load(uid); } },
      });
    }
    load(uid);
  };

  // نقرة على يوم في التقويم: حجب أو فتح، مع تراجع
  const toggleDay = async (d: string, blockedId?: string) => {
    hapticVibrate("light");
    if (blockedId) return unblock(blockedId);
    const tmp = { id: `tmp-${d}`, date: d, reason: null };
    setUnavail((l) => [...l, tmp]);
    const { data, error } = await supabase.from("photographer_unavailability").insert({ photographer_id: uid, date: d, reason: null }).select("id").maybeSingle();
    if (error) { setUnavail((l) => l.filter((u) => u.id !== tmp.id)); return toast.error(error.message); }
    toast(`حُجب يوم ${new Date(d).toLocaleDateString("ar-JO", { day: "numeric", month: "long" })} — لن يظهر للعرائس`, {
      action: { label: "تراجع", onClick: async () => { if (data?.id) await supabase.from("photographer_unavailability").delete().eq("id", data.id); load(uid); } },
    });
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

  const toggleAutoSync = async (val: boolean) => {
    setAutoSync(val);
    const { error } = await supabase.from("photographer_private").upsert({ user_id: uid, external_ical_url: icalUrl || null, external_ical_auto_sync: val }, { onConflict: "user_id" });
    if (error) { setAutoSync(!val); return toast.error(error.message); }
    toast.success(val ? "تم تفعيل المزامنة التلقائية كل ٣٠ دقيقة" : "تم إيقاف المزامنة التلقائية");
  };

  const exportUrl = exportToken ? `${typeof window !== "undefined" ? window.location.origin : ""}/api/public/ical/${exportToken}` : "";
  const webcalUrl = exportUrl.replace(/^https?:/, "webcal:");
  const googleSubscribeUrl = exportUrl ? `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcalUrl)}` : "#";
  const outlookSubscribeUrl = exportUrl ? `https://outlook.live.com/calendar/0/addfromweb?url=${encodeURIComponent(exportUrl)}&name=${encodeURIComponent("Memoria")}` : "#";
  const copyExport = async () => {
    if (!exportUrl) return;
    try {
      await navigator.clipboard.writeText(exportUrl);
      setCopied(true); setTimeout(() => setCopied(false), 2000);
      toast.success("تم نسخ الرابط");
    } catch { toast.error("تعذّر النسخ"); }
  };

  // «ربط»: يحفظ الرابط ويفعّل المزامنة التلقائية ويزامن فوراً — نقرة واحدة بدل ثلاث.
  const connectGoogle = async () => {
    const url = icalUrl.trim();
    if (!url) return toast.error(g("ألصقي رابط iCal من Google أولاً", "ألصق رابط iCal من Google أولاً"));
    setSyncing(true);
    try {
      const { error } = await supabase.from("photographer_private").upsert({ user_id: uid, external_ical_url: url, external_ical_auto_sync: true }, { onConflict: "user_id" });
      if (error) throw error;
      setAutoSync(true);
      const r = await runSync();
      toast.success(`تم الربط — ${r.blocked} يوماً مشغولاً من Google`);
      load(uid);
    } catch (e: any) {
      toast.error(e?.message || "تعذّرت المزامنة");
    } finally {
      setSyncing(false);
      fetchStatus().then(setStatus).catch(() => {});
    }
  };

  const disconnectGoogle = async () => {
    const { error } = await supabase.from("photographer_private").upsert({ user_id: uid, external_ical_url: null, external_ical_auto_sync: false }, { onConflict: "user_id" });
    if (error) return toast.error(error.message);
    await supabase.from("photographer_unavailability").delete().eq("photographer_id", uid).like("reason", "Google:%");
    setIcalUrl(""); setAutoSync(false); setStatus(null); setLastSync(null);
    toast.success("أُلغي الربط");
    load(uid);
  };

  if (loading) return <PageLoader />;
  if (loadError) return <div className="min-h-screen grid place-items-center px-4 text-sm text-destructive">{friendlyError(loadError)}</div>;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <section className="container-editorial py-12 max-w-3xl">
        <BackToDashboard />
        <div className="mt-2 mb-6 flex flex-wrap items-end justify-between gap-3">
          <h1 className="font-serif text-4xl">التقويم</h1>
          {lastSync && (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <RefreshCw className={`h-3 w-3 ${syncing ? "animate-spin" : ""}`} /> آخر مزامنة مع Google {new Date(lastSync).toLocaleString("ar-JO", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" })}
            </span>
          )}
        </div>

        <div className="mb-8">
          <MonthGrid
            bookings={bookings}
            blocked={unavail}
            onToggle={toggleDay}
            onOpenBooking={(b) => b.id && nav({ to: "/dashboard/bookings/$id", params: { id: b.id } })}
          />
        </div>

        <details className="group rounded-2xl border border-border bg-card mb-4">
          <summary className="flex cursor-pointer list-none items-center justify-between p-5 font-serif text-lg">
            حجب يوم مع سبب
            <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
          </summary>
          <div className="px-5 pb-5">
          <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
            {g("للسفر أو ارتباط خارجي. السبب لكِ فقط ولا يظهر للعرائس.", "للسفر أو ارتباط خارجي. السبب لك فقط ولا يظهر للعرائس.")}
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
            <button onClick={block} disabled={!date} className="bg-charcoal text-ivory px-6 py-2 rounded-full hover:opacity-90 disabled:opacity-50 active:scale-95 transition-transform duration-200">حجب</button>
          </div>
          </div>
        </details>

        <details className="group rounded-2xl border border-border bg-card mb-4">
          <summary className="flex cursor-pointer list-none items-center justify-between p-5 font-serif text-lg">
            <span>مزامنة مع Google / Apple {autoSync && <span className="ms-2 rounded-full bg-emerald-100 px-2 py-0.5 font-sans text-[11px] text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">تلقائية</span>}</span>
            <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
          </summary>
          <div className="px-5 pb-5">
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
            {g("اختاري الطريقة الأنسب لكِ. كل الخيارات تعمل مع Google Calendar و Apple Calendar و Outlook.", "اختر الطريقة الأنسب لك. كل الخيارات تعمل مع Google Calendar و Apple Calendar و Outlook.")}
          </p>

          <GoogleConnectCard onChanged={() => uid && load(uid)} />
          <p className="mb-3 text-xs text-muted-foreground">أو بدون تسجيل دخول (Apple / Outlook / رابط iCal):</p>

          {/* الخطوة ١: إظهار الحجوزات في تقويمها — اشتراك بنقرة واحدة */}
          <div className="rounded-xl border border-border p-5 mb-5 bg-background/50">
            <div className="flex items-center gap-2 mb-1">
              <Download className="h-5 w-5 text-gold" />
              <h3 className="font-serif text-lg">١. إظهار حجوزاتي في تقويم الهاتف</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
              {g("نقرة واحدة واختاري تطبيقكِ. الحجوزات والأيام المحجوبة تظهر كتقويم «Memoria» منفصل للقراءة فقط.", "نقرة واحدة واختر تطبيقك. الحجوزات والأيام المحجوبة تظهر كتقويم «Memoria» منفصل للقراءة فقط.")}
            </p>
            <div className="grid gap-2 sm:grid-cols-3">
              <a href={googleSubscribeUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-charcoal px-4 text-sm text-ivory hover:opacity-90 active:scale-95 transition dark:bg-gold dark:text-charcoal">
                Google Calendar
              </a>
              <a href={webcalUrl} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-border px-4 text-sm hover:bg-secondary active:scale-95 transition">
                iPhone / Apple
              </a>
              <a href={outlookSubscribeUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-border px-4 text-sm hover:bg-secondary active:scale-95 transition">
                Outlook
              </a>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <button onClick={copyExport} className="inline-flex items-center gap-1.5 underline-offset-2 hover:underline">
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "تم النسخ" : "نسخ الرابط يدوياً"}
              </button>
              <span>·</span>
              <span>Google يحدّث التقاويم المشترَكة كل بضع ساعات، وiPhone كل ساعة تقريباً.</span>
            </div>
          </div>

          {/* الخطوة ٢: سحب المشاغل من Google لمنع الحجز في الأيام المشغولة */}
          <div className="rounded-xl border-2 border-gold/40 p-5 bg-gold/5">
            <div className="flex items-center gap-2 mb-1">
              <RefreshCcw className="h-5 w-5 text-gold" />
              <h3 className="font-serif text-lg">٢. منع الحجز في أيامي المشغولة على Google</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
              {g("نقرأ تقويم Google الخاص بكِ كل ٣٠ دقيقة ونحجب الأيام التي فيها مواعيد، فلا تحجزها عروس بالخطأ. المواعيد المعلَّمة «متاح» في Google لا تُحجب.", "نقرأ تقويم Google الخاص بك كل ٣٠ دقيقة ونحجب الأيام التي فيها مواعيد، فلا تحجزها عروس بالخطأ. المواعيد المعلَّمة «متاح» في Google لا تُحجب.")}
            </p>
            <ol className="mb-3 space-y-1 text-xs text-muted-foreground list-decimal ps-5">
              <li>
                <a href="https://calendar.google.com/calendar/r/settings" target="_blank" rel="noopener noreferrer" className="text-gold underline">{g("افتحي إعدادات Google Calendar", "افتح إعدادات Google Calendar")}</a>
                {" "}← {g("اختاري تقويمكِ من القائمة الجانبية", "اختر تقويمك من القائمة الجانبية")}.
              </li>
              <li>{g("انزلي إلى «العنوان السرّي بتنسيق iCal» وانسخيه (ينتهي بـ basic.ics).", "انزل إلى «العنوان السرّي بتنسيق iCal» وانسخه (ينتهي بـ basic.ics).")}</li>
              <li>{g("الصقيه هنا واضغطي «ربط».", "الصقه هنا واضغط «ربط».")}</li>
            </ol>
            <div className="flex flex-wrap gap-2 items-center">
              <input value={icalUrl} onChange={(e) => setIcalUrl(e.target.value)} placeholder="https://calendar.google.com/calendar/ical/.../private-.../basic.ics" className="min-h-11 border border-border rounded-full px-4 bg-background flex-1 min-w-[240px] text-xs" dir="ltr" />
              <button onClick={connectGoogle} disabled={syncing || !icalUrl.trim()} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-charcoal px-5 text-sm text-ivory disabled:opacity-60 active:scale-95 transition dark:bg-gold dark:text-charcoal">
                <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} /> {status?.ok || lastSync ? "مزامنة الآن" : "ربط"}
              </button>
            </div>
            {icalUrl.trim() && !/\/private-[^/]+\/basic\.ics/i.test(icalUrl) && /calendar\.google\.com/i.test(icalUrl) && (
              <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">{g("يبدو أن هذا العنوان العام وليس السرّي — العنوان السرّي يحتوي على «private-».", "يبدو أن هذا العنوان العام وليس السرّي — العنوان السرّي يحتوي على «private-».")}</p>
            )}

            {/* حالة الربط */}
            {(status || lastSync) && (
              <div className={`mt-4 rounded-xl border p-3 text-sm ${status && !status.ok ? "border-destructive/40 bg-destructive/10" : "border-emerald-300/60 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30"}`}>
                {status && !status.ok ? (
                  <>
                    <div className="font-medium text-destructive">فشلت آخر مزامنة</div>
                    <div className="text-xs text-destructive/90 mt-0.5">{status.error}</div>
                  </>
                ) : (
                  <>
                    <div className="font-medium text-emerald-800 dark:text-emerald-300">✓ مربوط ويعمل</div>
                    <div className="text-xs text-emerald-800/80 dark:text-emerald-300/80 mt-0.5">
                      {typeof status?.blocked === "number" && <>{status.blocked} يوماً محجوباً من Google · </>}
                      آخر مزامنة {new Date(status?.at ?? lastSync!).toLocaleString("ar-JO", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" })}
                    </div>
                  </>
                )}
                <label className="mt-3 flex items-center justify-between gap-3 text-xs">
                  <span>المزامنة التلقائية كل ٣٠ دقيقة</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={autoSync}
                    aria-label="المزامنة التلقائية"
                    onClick={() => toggleAutoSync(!autoSync)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${autoSync ? "bg-gold" : "bg-secondary"}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${autoSync ? "translate-x-6" : "translate-x-1"}`} />
                  </button>
                </label>
                <button onClick={disconnectGoogle} className="mt-2 text-xs text-muted-foreground underline-offset-2 hover:underline">إلغاء الربط وفتح الأيام المستوردة</button>
              </div>
            )}
          </div>
          </div>
        </details>

        <details className="group rounded-2xl border border-border bg-card mb-8">
          <summary className="flex cursor-pointer list-none items-center justify-between p-5 font-serif text-lg">
            عطلة أسبوعية متكرّرة
            <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
          </summary>
          <div className="px-5 pb-5">
          <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
            {g("مثال: حجب كل أيام الجمعة كعطلة رسمية دائمة لكِ، بحيث لا يستطيع العملاء اختيارها.", "مثال: حجب كل أيام الجمعة كعطلة رسمية دائمة لك، بحيث لا يستطيع العملاء اختيارها.")}
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
          <button onClick={blockRecurring} className="mt-4 bg-charcoal text-ivory px-6 py-2 rounded-full hover:opacity-90 active:scale-95 transition-transform duration-200">حجب كل أيام {["الأحد","الإثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"][Number(weekday)]}</button>
          </div>
        </details>

        <h2 className="font-serif text-xl mb-3">الأيام المحجوبة القادمة</h2>
        <div className="rounded-sm border border-border bg-card overflow-hidden mb-8">
          {unavail.filter((u) => u.date >= format(new Date(), "yyyy-MM-dd")).length === 0 ? <p className="p-4 text-sm text-muted-foreground">{g("لا أيام محجوبة. انقري على أي يوم في التقويم لحجبه.", "لا أيام محجوبة. انقر على أي يوم في التقويم لحجبه.")}</p> : unavail.filter((u) => u.date >= format(new Date(), "yyyy-MM-dd")).map((u) => (
            <div key={u.id} className="flex items-center justify-between p-3 border-b border-border last:border-0">
              <div><div className="text-sm">{new Date(u.date).toLocaleDateString("ar-JO", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</div>{u.reason && <div className="text-xs text-muted-foreground">{u.reason}</div>}</div>
              <button onClick={() => unblock(u.id)} aria-label="فتح اليوم" className="rounded-full p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><X className="h-4 w-4" /></button>
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
                <span className="text-xs px-2 py-1 bg-secondary rounded-full">{({ quote: "عرض سعر", pending_deposit: "بانتظار العربون", confirmed: "مؤكّد", completed: "مكتمل", cancelled: "ملغى" } as Record<string, string>)[b.status] ?? b.status}</span>
              </div>
            ))}
        </div>
      </section>
      <Footer />
    </div>
  );
}