import { createFileRoute, useParams } from "@tanstack/react-router";
import { PageLoader } from "@/components/ui/loading";
import { useEffect, useRef, useState, useCallback } from "react";
import { Header } from "@/components/site/Header";
import { VerifyBookingPanel } from "@/components/VerifyBookingPanel";
import { Footer } from "@/components/site/Footer";
import { useServerFn } from "@tanstack/react-start";
import {
  getBookingByToken,
  clientMarkDepositSent,
  clientMarkReceived,
  clientAddNote,
} from "@/lib/booking.functions";
import { clientCancelBooking } from "@/lib/cancellation.functions";
import { Term } from "@/components/Term";
import { getGalleryByToken, getMessagesByToken, sendMessageByToken } from "@/lib/gallery.functions";
import { supabase } from "@/integrations/supabase/client";
import { PackageFacts, hasFacts } from "@/components/PackageFacts";
import { PaymentMethodsView } from "@/components/PaymentMethods";
import { BrideExtras, BrideEditDetails, BrideEmailFix } from "@/components/BookingExtras";
import { externalHosts } from "@/lib/chat-links";
import { ChatReport } from "@/components/ChatReport";
import { reportChatByToken } from "@/lib/profile-reports.functions";
import { parseMethods, type PaymentMethod } from "@/lib/payment-methods";
import { CheckCircle2, CalendarPlus, LockKeyhole, Unlock, Clock, Upload, Copy, Camera, Image as ImageIcon, Truck, MessageSquare, Download, Send as SendIcon, X, XCircle } from "lucide-react";
import { Lightbox } from "@/components/Lightbox";
import { WeddingCountdown } from "@/components/WeddingCountdown";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { CopyButton } from "@/components/ui/copy-button";
import { ChevronDown, Paperclip } from "lucide-react";

import { AlertTriangle, RefreshCcw, Home } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { locale } from "@/i18n";
import { t, tx } from "@/i18n";
import { StepUpBox } from "@/components/StepUpBox";

export const Route = createFileRoute("/track/$token")({
  head: () => ({
    meta: [
      { title: t("متابعة حجزك — ميموريا") },
      { name: "description", content: t("تابعي حالة حجز التصوير، الدفعات، والصور خطوة بخطوة.") },
      { property: "og:title", content: t("متابعة حجزك — ميموريا") },
      { property: "og:description", content: t("تابعي حالة حجز التصوير، الدفعات، والصور خطوة بخطوة.") },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TrackingPage,
  errorComponent: ClientError,
});

function ClientError({ error, reset }: any) {
  // A stale deploy chunk failed to load: reload into the new build instead of showing an error
  if (typeof window !== "undefined") (window as any).__memoriaChunkReload?.(error);
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-6">
        <div className="h-24 w-24 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
          <AlertTriangle className="h-12 w-12 text-red-500" />
        </div>
        <div className="space-y-2 max-w-md">
          <h1 className="font-serif text-3xl">{t("عذراً! رابط التتبع واجه مشكلة")}</h1>
          <p className="text-muted-foreground">{t("الرابط غير صحيح أو حدث خطأ في النظام.")}</p>
        </div>
        <div className="flex gap-4">
          <button onClick={reset} className="inline-flex items-center gap-2 bg-charcoal text-ivory px-6 py-3 rounded-sm hover:opacity-90 transition">
            <RefreshCcw className="h-4 w-4" />{" "}{t("تحديث الصفحة")}
          </button>
        </div>
      </div>
    </div>
  );
}

type Booking = any;

function TrackingPage() {
  const { token } = useParams({ from: "/track/$token" });
  const confirm = useConfirm();
  const get = useServerFn(getBookingByToken);
  const sendDeposit = useServerFn(clientMarkDepositSent);
  const markReceived = useServerFn(clientMarkReceived);
  const addNote = useServerFn(clientAddNote);
  const cancelFn = useServerFn(clientCancelBooking);

  const [b, setB] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const isExpired = b?.status === 'pending_deposit' && !!b?.deposit_due_at && new Date(b.deposit_due_at).getTime() < Date.now();
  // طلب ينتظر موافقة المصوّرة: لا تفاصيل دفع ولا عربون قبل الموافقة
  const awaitingApproval = !!b?.needs_approval && !b?.approved_at && (b?.status === "pending_deposit" || b?.status === "quote");
  // نسخت بيانات الدفع ولم ترفع الإيصال بعد → تذكير ظاهر + تأكيد قبل مغادرة الصفحة
  const [payTouched, setPayTouched] = useState(false);
  useEffect(() => {
    if (!payTouched || b?.deposit_sent_at) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [payTouched, b?.deposit_sent_at]);
  const hoursLeft = (iso?: string | null) => iso ? Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 3600_000)) : null;
  // قواعد واضحة من البداية: العربون بين العروس والمصوّرة، والمنصّة لا تستلمه ولا تُرجعه
  const todayYmd = new Date().toLocaleDateString("en-CA");
  const depositPaid = !!(b?.deposit_sent_at || b?.deposit_confirmed_at) && Number(b?.deposit_amount || 0) > 0;
  const canCancel = !!b && ["quote", "pending_deposit", "confirmed"].includes(b.status) && b.event_date >= todayYmd;
  const remainingDue = b ? Math.max(0, Number(b.total_price || 0) - Number(b.deposit_amount || 0)) : 0;
  const showBalanceDue = !!b && ["confirmed", "completed"].includes(b.status) && !b.final_paid_at && remainingDue > 0
    && (b.event_date < todayYmd || (!!b.production_stage && b.production_stage !== "awaiting"));
  const refundLine = () => {
    const dep = Number(b?.deposit_amount || 0);
    const pol = b?.photographer?.deposit_refund_policy;
    if (pol === "full") return t("سياسة المصوّرة: إذا ألغيتِ بعد دفع العربون، تُرجع لكِ العربون كاملاً ({0} د.أ).", [dep]);
    if (pol === "partial") {
      const pct = Number(b?.photographer?.deposit_refund_percent || 0);
      return t("سياسة المصوّرة: إذا ألغيتِ بعد دفع العربون، تُرجع لكِ {0}% منه ({1} د.أ).", [pct, Math.round(dep * pct) / 100]);
    }
    return t("سياسة المصوّرة: العربون لا يُرجَع إذا ألغيتِ بعد دفعه.");
  };
  const platformNote = t("العربون يُحوَّل مباشرة للمصوّرة، والمنصّة لا تستلمه ولا تُرجعه. أي استرجاع أو مسامحة يتم بينكِ وبين المصوّرة، والقرار لها.");
  const postponeNote = t("التأجيل غير متاح من المنصّة: تغيير الموعد يعني إلغاء الحجز، إلا إذا وافقت المصوّرة على نقل العربون لموعد جديد بعد تواصلكما.");

  const [reference, setReference] = useState("");
  const [pickedFile, setPickedFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [newNote, setNewNote] = useState("");

  const addToCalendar = () => {
    if (!b) return;
    const date = b.event_date.replace(/-/g, '');
    const start = (b.start_time || "09:00").replace(/:/g, '') + '00';
    const end = (b.end_time || "12:00").replace(/:/g, '') + '00';
    const text = encodeURIComponent(t("جلسة تصوير مع {0}", [b.photographer.display_name]));
    const details = encodeURIComponent(t("رابط التتبع: {0}", [window.location.href]));
    const location = encodeURIComponent(b.venue_address || t("موقع التصوير"));
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${date}T${start}/${date}T${end}&details=${details}&location=${location}`;
    window.open(url, '_blank');
  };

  
  // ✅ إصلاح: Dialog حقيقي بدلاً من window.prompt
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelCode, setCancelCode] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [cancelAck, setCancelAck] = useState(false);
  const [termsOk, setTermsOk] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  // حارس polling: لا نستبدل الحالة أثناء تفاعل المستخدم مع رفع/إلغاء/دفع
  const busyRef = useRef(false);
  busyRef.current = uploading || cancelLoading;

  const load = async () => {
    try {
      const data = await get({ data: { token } });
      // المصوّرة قد تثبّت العربون بدون إيصال (رأته بحسابها): عند العروس يُعتبر مُرسَلاً
      if (data && data.deposit_confirmed_at && !data.deposit_sent_at) data.deposit_sent_at = data.deposit_confirmed_at;
      setB(data);
      if ((data as any)?.deposit_terms_accepted_at) setTermsOk(true);
    } catch (e: any) {
      console.error("[track] load failed", e);
      toast.error(t("تعذّر تحميل الحجز، حاولي التحديث بعد قليل"));
    }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [token]);


  // عرض إشعار عند العودة من بوّابة الدفع
  useEffect(() => {
    const u = new URL(window.location.href);
    const status = u.searchParams.get("payment");
    if (status === "success") {
      toast.success(t("استلمنا دفعتكِ 🤍 نثبّت موعدكِ الآن…"));
      u.searchParams.delete("payment");
      window.history.replaceState({}, "", u.toString());
    } else if (status === "cancelled") {
      toast.message(t("أُلغي الدفع. يمكنك المحاولة مجدّداً أو استخدام طريقة CliQ اليدوية."));
      u.searchParams.delete("payment");
      window.history.replaceState({}, "", u.toString());
    }
  }, []);

  // Polling refresh — keeps gallery/messages live without realtime RLS gymnastics
  useEffect(() => {
    const id = setInterval(() => { if (!busyRef.current) load(); }, 120000);
    return () => clearInterval(id);
  }, []);

  if (loading) return <PageLoader />;
  if (b && b.expired) return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container-editorial py-24 text-center max-w-xl mx-auto">
        <h1 className="font-serif text-3xl mb-2">{t("انتهت صلاحية الرابط")}</h1>
        <p className="text-muted-foreground mb-4">{t("هذا الرابط أصبح غير فعّال. يرجى التواصل مع المصورة للحصول على رابط جديد.")}</p>
        {b.photographer?.whatsapp && (
          <button onClick={async () => {
            const ok = await confirm({ title: t("التحويل لواتساب"), description: t("سيتم نقلك لتطبيق واتساب للتواصل مع المصورة."), confirmText: t("حسناً") });
            if (ok) window.open(`https://wa.me/${String(b.photographer.whatsapp).replace(/\D/g, "")}`, "_blank");
          }}
             className="inline-block bg-charcoal text-ivory px-5 py-2 rounded-sm">{t("تواصل عبر واتساب")}</button>
        )}
      </div>
      <Footer />
    </div>
  );
  if (b && b.deleted_at) return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container-editorial py-24 text-center">
        <h1 className="font-serif text-3xl mb-2 text-destructive">{t("تم حذف هذا الحجز")}</h1>
        <p className="text-muted-foreground">{t("لا يمكن الوصول إلى تفاصيل هذا الحجز لأنه تم حذفه من قبل المصوّرة.")}</p>
      </div>
      <Footer />
    </div>
  );
  if (!b) return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container-editorial py-24 text-center">
        <h1 className="font-serif text-3xl mb-2">{t("رابط غير صالح")}</h1>
        <p className="text-muted-foreground">{t("قد يكون الرابط منتهي الصلاحية أو غير صحيح.")}</p>
      </div>
      <Footer />
    </div>
  );

  const onSendDeposit = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      toast.error(t("ارفعي صورة إيصال التحويل (لقطة شاشة من تطبيق البنك تكفي)."), { id: "upload-receipt" });
      return;
    }
    if (reference.trim().length < 3) {
      toast.error(t("اكتبي رقم العملية المرجعي الظاهر في إيصال التحويل."), { id: "upload-receipt" });
      return;
    }
    if (!termsOk) {
      toast.error(t("اقرئي شروط العربون ووافقي عليها أولاً."), { id: "upload-receipt" });
      return;
    }
    if (note.trim().length < 3) {
      toast.error(t("اكتبي اسم صاحب الحساب الذي حوّلتِ منه."), { id: "upload-receipt" });
      return;
    }

    // File validation — نقبل أيضاً HEIC/WebP لأن معظم الإيصالات تُلتقط من الجوال
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast.error(t("صيغة الملف غير مدعومة. يرجى رفع صورة (JPG/PNG/WebP) أو ملف PDF."), { id: "upload-receipt" });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error(t("حجم الملف كبير جداً (الحد الأقصى 10 ميجابايت)."), { id: "upload-receipt" });
      return;
    }

    setUploading(true);
    toast.loading(t("جاري رفع الإيصال..."), { id: "upload-receipt" });
    try {
      // ضغط الصور قبل الرفع (إيصالات الجوال قد تصل 8-12 ميجا)
      let finalFile: File = file;
      if (file.type.startsWith('image/')) {
        try {
          const { default: imageCompression } = await import('browser-image-compression');
          finalFile = await imageCompression(file, {
            maxSizeMB: 0.4,
            maxWidthOrHeight: 1600,
            useWebWorker: true,
            fileType: 'image/jpeg',
          });
        } catch (err) {
          console.warn('receipt compression failed', err);
        }
      }
      // Never store a big file: if compression couldn't shrink it, ask for a screenshot instead
      if (finalFile.size > 2 * 1024 * 1024) {
        throw new Error(t("تعذّر تصغير الملف. التقطي لقطة شاشة للإيصال وارفعيها بدلاً منه."));
      }

      // 1. Upload to storage — المسار يجب أن يبدأ بـ public-tokens/<token>
      //    لأن سياسة RLS للزوّار غير المسجّلين تسمح بهذا المسار فقط.
      const ext = finalFile.type === 'application/pdf'
        ? 'pdf'
        : (finalFile.type === 'image/png' ? 'png' : 'jpg');
      const path = `public-tokens/${token}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('deposit-proofs')
        .upload(path, finalFile, { contentType: finalFile.type, upsert: false });

      if (uploadError) throw uploadError;


      // 2. Update booking
      // The RPC drops _reference, so it also goes in the note the photographer sees
      await sendDeposit({ data: { token, terms_accepted: true, proof_path: path, reference: reference.trim(),
          note: t("رقم العملية: {0} اسم المحوِّل: {1}", [reference.trim(), note.trim()]) } });
      toast.success(t("وصل إيصالكِ. تتأكّد المصوّرة من وصول المبلغ لحسابها ثم تثبّت حجزكِ، ويصلكِ إشعار."), { id: "upload-receipt" });
      setReference(""); setNote(""); setPickedFile(null);
      if (fileRef.current) fileRef.current.value = "";
      load();
    } catch (e: any) {
      toast.error(e.message || t("حدث خطأ أثناء رفع الملف"), { id: "upload-receipt" });
    } finally {
      setUploading(false);
    }
  };

  const onAddNote = async () => {
    if (!newNote.trim()) return;
    try {
      await addNote({ data: { token, note: newNote.trim() } });
      toast.success(t("وصلت ملاحظتكِ للمصوّرة"));
      setNewNote("");
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  const onReceived = async () => {
    if (!(await confirm({ title: t("تأكيد الاستلام"), description: t("هل تأكدتِ من استلام جميع الصور؟"), confirmText: t("تأكيد") }))) return;
    try {
      await markReceived({ data: { token } });
      toast.success(t("مبروك على صوركِ 🤍 ذكرى تبقى معكِ"));
      load();
    } catch (e: any) { toast.error(e.message); }
  };


  // ✅ إصلاح: فتح Dialog بدلاً من window.prompt (يعمل في PWA + كل المتصفحات)
  const onClientCancel = () => {
    setShowCancelDialog(true);
  };

  const handleConfirmCancel = async () => {
    setCancelLoading(true);
    toast.loading(t("جاري إلغاء الحجز..."), { id: "cancel-booking" });
    try {
      await cancelFn({ data: { token, reason: cancelReason, code: cancelCode } });
      toast.success(t("تم إلغاء الحجز بنجاح"), { id: "cancel-booking" });
      setShowCancelDialog(false);
      setCancelReason("");
      setCancelCode("");
      load();
    } catch (e: any) {
      toast.error(e.message, { id: "cancel-booking" });
    } finally {
      setCancelLoading(false);
    }
  };

  const ph = b.photographer;
  // طرق العربون؛ للحجوزات القديمة قبل القائمة نعرض CliQ والنص البنكي كما كانا
  const payMethods: PaymentMethod[] = (() => {
    const list = parseMethods((ph as any).payment_methods);
    if (list.length) return list;
    const legacy: PaymentMethod[] = [];
    if (ph.cliq_alias) legacy.push({ kind: "cliq", alias: ph.cliq_alias });
    if ((ph as any).bank_info) legacy.push({ kind: "bank", note: (ph as any).bank_info });
    return legacy;
  })();
  const stages = [
    { key: "request", label: t("طلب الحجز"), done: true, icon: <CheckCircle2 className="h-5 w-5" /> },
    { key: "approval", label: t("موافقة المصوّرة"), done: !awaitingApproval, icon: <CheckCircle2 className="h-5 w-5" /> },
    { key: "deposit", label: t("إرسال العربون"), done: !!b.deposit_sent_at, icon: <Upload className="h-5 w-5" /> },
    { key: "confirmed", label: t("تأكيد الحجز"), done: !!b.deposit_confirmed_at || ["confirmed","completed"].includes(b.status), icon: <CheckCircle2 className="h-5 w-5" /> },
    { key: "shoot", label: t("يوم التصوير"), done: b.production_stage !== "awaiting" || !!b.delivered_at || b.status === "completed", icon: <Camera className="h-5 w-5" /> },
    ...(Math.max(0, Number(b.total_price || 0) - Number(b.deposit_amount || 0)) > 0
      ? [{ key: "balance", label: t("باقي المبلغ"), done: !!b.final_paid_at || b.status === "completed", icon: <CheckCircle2 className="h-5 w-5" /> }]
      : []),
    { key: "editing", label: t("التحرير"), done: ["editing","delivered","completed"].includes(b.production_stage) || !!b.delivered_at || b.status === "completed", icon: <ImageIcon className="h-5 w-5" /> },
    { key: "delivered", label: t("التسليم"), done: !!b.delivered_at || b.status === "completed", icon: <Truck className="h-5 w-5" /> },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <section className="container-editorial py-10 max-w-4xl">
        <div className="text-xs uppercase tracking-[0.3em] text-gold mb-1">{t("تتبع الحجز")}</div>
        <h1 className="font-serif text-3xl mb-1">
          {new Date().getHours() < 12 ? t("صباح الخير") : t("مساء الخير")}{t("، {0}", [b.client_name])}
        </h1>
        <p className="text-muted-foreground text-sm mb-4">{t("حجز مع {0} (@{1})", [ph.display_name, ph.username])}</p>

        {b.verify && b.status !== "cancelled" && (
          <div className="mb-6">
            <VerifyBookingPanel
              token={token}
              verify={b.verify}
              onVerified={() => { load(); }}
              onRecheck={async () => {
                const r: any = await get({ data: { token } });
                if (r?.phone_verified) setB(r);
                return !!r?.phone_verified;
              }}
            />
          </div>
        )}

        {b.status !== "cancelled" && !b.verify && (() => {
          const currentIdx = Math.max(0, stages.findIndex((x) => !x.done));
          const allDone = stages.every((x) => x.done);
          const daysToEvent = b.event_date ? Math.ceil((new Date(b.event_date).getTime() - Date.now()) / 86400000) : null;
          const here = (() => {
            if (awaitingApproval) return { title: t("بانتظار موافقة {0}", [ph.display_name]), body: t("التاريخ محجوز لكِ. المصوّرة تردّ خلال {0} ساعة كحد أقصى، ويصلك إشعار فور ردّها. لا تحوّلي أي مبلغ قبل موافقتها.", [hoursLeft(b.approval_due_at) ?? 24]), cta: null, target: null };
            if (!b.deposit_sent_at) return { title: t("الخطوة التالية: إرسال العربون"), body: hoursLeft(b.deposit_due_at) ? t("المصوّرة وافقت ✓ حوّلي {0} د.أ خلال {1} ساعة، ثم ارفعي صورة الإيصال هنا.", [Number(b.deposit_amount).toLocaleString(locale("ar-JO")), hoursLeft(b.deposit_due_at)]) : t("حوّلي {0} د.أ لتثبيت موعدك، ثم ارفعي الإيصال.", [Number(b.deposit_amount).toLocaleString(locale("ar-JO"))]), cta: t("إرسال العربون"), target: "deposit-step" };
            if (!(b.deposit_confirmed_at || ["confirmed", "completed"].includes(b.status))) return { title: t("وصل إيصالك — بانتظار تأكيد المصوّرة"), body: t("تصلك رسالة فور التأكيد. عادةً خلال ساعات."), cta: null, target: null };
            if (!b.delivered_at && b.status !== "completed" && daysToEvent !== null && daysToEvent >= 0) return { title: daysToEvent === 0 ? t("اليوم يومك 🤍") : t("باقي {0} {1} على يومك", [daysToEvent, daysToEvent === 1 ? "يوم" : "يوماً"]), body: t("حجزك مؤكَّد. أضيفي الموعد لتقويمك، واكتبي للمصوّرة أي تفاصيل تهمّك."), cta: null, target: null };
            if (!b.delivered_at && b.status !== "completed") return { title: t("صورك قيد التحرير"), body: t("تعمل المصوّرة على اختيار صورك وتحريرها. ستصلك رسالة عند جاهزيتها."), cta: null, target: null };
            if (!b.client_received_at) return { title: t("صورك جاهزة"), body: t("حمّلي صورك ثم أكّدي الاستلام."), cta: b.delivery_link ? t("تحميل الصور") : null, target: b.delivery_link ? "delivery-link" : null };
            if (b.has_review) return { title: t("اكتمل حجزك"), body: t("شكراً لثقتك ولتقييمك."), cta: null, target: null };
            return { title: t("اكتمل حجزك"), body: t("شكراً لثقتك. رأيك يساعد عرائس أخريات."), cta: t("قيّمي المصوّرة"), target: "review-step" };
          })();
          return (
            <div className="mb-8 overflow-hidden rounded-2xl bg-charcoal text-ivory grain-overlay dark:bg-card dark:text-foreground dark:ring-1 dark:ring-gold/30">
              <div className="relative z-10 p-6 sm:p-8">
                <div className="mb-2 text-xs tracking-wide text-gold">{t("أنتِ هنا")}</div>
                <h2 className="font-serif text-3xl leading-tight text-balance">{tx(here.title)}</h2>
                <p className="mt-2 max-w-lg text-sm text-ivory/70 dark:text-muted-foreground">{tx(here.body)}</p>
                {here.cta && here.target && (
                  <button
                    onClick={() => document.getElementById(here.target!)?.scrollIntoView({ behavior: "smooth", block: "start" })}
                    className="mt-5 inline-flex items-center gap-2 rounded-full bg-gold px-6 py-2.5 text-sm font-medium text-charcoal transition-transform active:scale-95"
                  >
                    {tx(here.cta)}
                  </button>
                )}
                {(b.status === "confirmed" || b.status === "completed") && daysToEvent !== null && daysToEvent >= 0 && (
                  <button onClick={addToCalendar} className="mt-5 ms-2 inline-flex items-center gap-2 rounded-full border border-ivory/20 px-5 py-2.5 text-sm hover:border-gold hover:text-gold transition-colors dark:border-border">
                    <CalendarPlus className="h-4 w-4" />{" "}{t("أضيفي لتقويمك")}
                  </button>
                )}

                {/* خط المراحل: المنجز ذهبي، والحالي ينبض */}
                <ol className={`mt-8 grid gap-1 ${stages.length > 7 ? "grid-cols-8" : "grid-cols-7"}`} aria-label={t("مراحل الحجز")}>
                  {stages.map((st, i) => {
                    const current = !allDone && i === currentIdx;
                    return (
                      <li key={st.key} className="flex flex-col items-center gap-2 text-center">
                        <motion.div
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: 1 }}
                          transition={{ delay: 0.1 + i * 0.08, duration: 0.4 }}
                          className={`h-1 w-full origin-right rounded-full ${st.done ? "bg-gold" : current ? "bg-gold/40" : "bg-ivory/15 dark:bg-border"}`}
                        />
                        <span className={`text-[10px] leading-tight ${current ? "text-gold font-medium" : st.done ? "text-ivory/80 dark:text-foreground" : "text-ivory/40 dark:text-muted-foreground"}`}>{tx(st.label)}</span>
                      </li>
                    );
                  })}
                </ol>
              </div>
            </div>
          );
        })()}

        {b.status !== "cancelled" && !b.verify && b.event_date && (
          <WeddingCountdown
            eventDate={b.event_date}
            startTime={b.start_time}
            photographerName={ph.display_name}
            steps={[
              { label: t("موافقة المصوّرة على الطلب"), done: !awaitingApproval },
              { label: t("إرسال العربون"), done: !!b.deposit_sent_at, target: "deposit-step" },
              { label: t("تأكيد المصوّرة للحجز"), done: !!b.deposit_confirmed_at || ["confirmed", "completed"].includes(b.status) },
              ...(b.contract?.sign_token ? [{ label: t("توقيع العقد"), done: b.contract.status === "signed", target: "contract-step" }] : []),
              { label: t("إخبار المصوّرة بتفاصيل يومكِ"), done: !!b.event_day_info || !!b.client_notes, target: ["confirmed", "completed"].includes(b.status) ? "eventday-step" : "chat-step" },
            ]}
          />
        )}

        {/* رابط تسليم الصور الخارجي (Drive / WeTransfer / Dropbox) */}
        {b.delivery_link && (
          <div id="delivery-link" className="scroll-mt-24 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 mb-6 dark:bg-emerald-500/10 dark:border-emerald-500/20">
            <h2 className="font-serif text-lg mb-1">{t("صورك جاهزة للتحميل")}</h2>
            <p className="text-sm text-muted-foreground mb-3">{t("أرسلت لكِ المصوّرة رابط تحميل الصور بجودتها الكاملة.")}</p>
            <a
              href={b.delivery_link}
              target="_blank"
              rel="noreferrer"
              className="inline-block bg-charcoal text-ivory px-5 py-2 rounded-sm text-sm"
            >
              {t("تحميل الصور")}
            </a>
            {(() => { try { return <p className="mt-2 text-xs text-muted-foreground" dir="ltr">{new URL(b.delivery_link).hostname}</p>; } catch { return null; } })()}
            <p className="mt-1 text-xs text-muted-foreground">{t("الرابط يفتح موقعاً خارجياً. لا تدخلي أي بيانات دفع أو كلمات مرور فيه.")}</p>
          </div>
        )}

          {/* Sneak Peek Gamification */}
          {b.sneak_peek_url && (
            <div className="rounded-sm border border-border bg-card overflow-hidden mb-6 relative">
              <div className="p-5 border-b border-border/50 bg-secondary/20 flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-[var(--gold)]" />
                <h2 className="font-serif text-lg font-bold">{t("لمحة من صورك!")}</h2>
              </div>
              <div className="relative h-64 w-full">
                <img 
                  src={b.sneak_peek_url} 
                  className={`w-full h-full object-cover transition-all duration-700 ${b.status === 'completed' ? '' : 'blur-xl scale-110 opacity-70 grayscale'}`} 
                  alt="Sneak Peek" 
                />
                {b.status !== 'completed' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/30 backdrop-blur-[2px]">
                    <div className="bg-background/90 p-6 rounded-2xl shadow-elegant text-center max-w-xs border border-border animate-fade-in-up">
                      <LockKeyhole className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
                      <h3 className="font-bold text-lg mb-2">{t("الصورة مقفلة")}</h3>
                      <p className="text-sm text-muted-foreground mb-4">{t("ادفعي الدفعة الأخيرة لفتح اللمحة السريعة لصورك!")}</p>
                    </div>
                  </div>
                )}
                {b.status === 'completed' && (
                  <div className="absolute top-4 start-4 bg-background/80 backdrop-blur-sm p-2 rounded-full animate-bounce">
                    <Unlock className="h-5 w-5 text-emerald-500" />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Booking summary */}
        <details className="group rounded-2xl border border-border bg-card mb-6 text-sm" open={!b.deposit_sent_at}>
          <summary className="flex cursor-pointer list-none items-center justify-between p-5">
            <span className="font-serif text-lg">{t("تفاصيل الحجز")}</span>
            <span className="flex items-center gap-3 text-xs text-muted-foreground">
              {t("{0} · {1} د.أ", [new Date(b.event_date).toLocaleDateString(locale("ar-JO"), { day: "numeric", month: "long" }), Number(b.total_price).toLocaleString(locale("ar-JO"))])}<ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
            </span>
          </summary>
          <div className="px-5 pb-5">
          <div className="grid sm:grid-cols-2 gap-3 mb-4">
            <Info label={t("التاريخ")} v={b.event_date} />
            <Info label={t("الوقت")} v={`${(b.start_time||"").slice(0,5)} - ${(b.end_time||"").slice(0,5)}`} />
            <Info label={t("الموقع")} v={b.venue_address || "—"} />
            <Info label={t("الخدمة")} v={b.service === "cinematic_video" ? t("فيديو سينمائي") : t("تصوير")} />
          </div>
          <BrideEditDetails b={b} token={token} onChange={load} />
          {b.status !== "cancelled" && <BrideEmailFix token={token} />}
          {Array.isArray(b.addons) && b.addons.length > 0 && (
            <div className="border-t border-border pt-3 mb-3">
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">{t("تفاصيل الباقة")}</div>
              <ul className="space-y-1">
                {b.addons.map((it: any, i: number) => {
                  const qty = Number(it.qty || 1);
                  const price = Number(it.price || 0);
                  return (
                    <li key={i} className="flex justify-between">
                      <span className={it.kind === "main" ? "font-medium" : "text-muted-foreground"}>
                        {tx(it.label)}{qty > 1 ? ` × ${qty}` : ""}
                      </span>
                      {price > 0 && <span>{t("{0} د.أ", [(price * qty).toLocaleString(locale("ar-JO"))])}</span>}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          <div className="border-t border-border pt-3 grid sm:grid-cols-2 gap-3">
            <Info label={t("المبلغ الإجمالي")} v={t("{0} د.أ", [Number(b.total_price).toLocaleString(locale("ar-JO"))])} />
            <Info label={t("العربون المطلوب")} v={t("{0} د.أ", [Number(b.deposit_amount).toLocaleString(locale("ar-JO"))])} />
          </div>
          {b.package_snapshot && hasFacts(b.package_snapshot) && (
            <div className="border-t border-border pt-3 mt-3">
              <div className="mb-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">{t("باقتكِ كما طلبتِها — {0}", [b.package_snapshot.label])}</div>
              <PackageFacts d={b.package_snapshot} compact gender={b.package_snapshot.gender} />
              <p className="mt-2 text-[11px] text-muted-foreground">{t("محفوظة من لحظة طلبكِ ولا تتغيّر بتعديل المصوّرة لباقاتها.")}</p>
            </div>
          )}
          </div>
        </details>

        {/* Deposit step */}
        {!b.deposit_sent_at && !b.verify && !awaitingApproval && b.is_demo && (
          <div id="deposit-step" className="scroll-mt-24 rounded-2xl border border-gold/30 bg-gold/5 p-5 mb-6">
            <h2 className="font-serif text-xl mb-2">{t("نسخة تجريبية")}</h2>
            <p className="text-sm">{t("هذا حساب تجريبي للمصوّرات فقط ليروا كيف سيبدو حسابهن، لذلك التحويل وإرسال العربون غير متاحين هنا. الحجز وصفحة التتبع تعمل كما هي.")}</p>
          </div>
        )}
        {!b.deposit_sent_at && !b.verify && !awaitingApproval && !b.is_demo && b.status !== "cancelled" && (
          <div id="deposit-step" className="scroll-mt-24 rounded-2xl border border-gold/30 bg-gold/5 p-5 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-5 w-5 text-gold" />
              <h2 className="font-serif text-xl">{t("إرسال العربون")} <Term k="deposit" /></h2>
            </div>
            <p className="text-sm mb-4">{t("حوّلي مبلغ")}{" "}<span className="font-semibold">{t("{0} د.أ", [Number(b.deposit_amount).toLocaleString(locale("ar-JO"))])}</span>{" "}{t("ثم ارفعي إثبات التحويل أدناه.")}</p>

            <div className="mb-4 rounded-sm border border-amber-300/60 bg-amber-50 dark:bg-amber-950/30 p-3 text-sm text-amber-900 dark:text-amber-200 space-y-1.5">
              <div className="font-medium">{t("قبل التحويل، اقرئي هذا:")} <Term k="refund" /></div>
              <p>{refundLine()}</p>
              <p>{postponeNote}</p>
              <p>{platformNote}</p>
              <label className="flex items-start gap-2 pt-1 font-medium cursor-pointer">
                <input type="checkbox" className="mt-1 h-4 w-4" checked={termsOk} onChange={(e) => setTermsOk(e.target.checked)} />
                <span>{t("قرأت وفهمت، وأوافق على هذه الشروط.")}</span>
              </label>
            </div>


            <div className="mb-3 rounded-sm border border-border bg-background/60 p-3 text-xs leading-relaxed text-muted-foreground">
              <div className="mb-1 font-medium text-foreground">{t("قبل التحويل، اطمئني بدقيقة:")}</div>
              <ul className="list-disc space-y-0.5 ps-4">
                <li>{t("الاسم على الحساب يطابق اسم المصوّرة.")}</li>
                <li>{t("شاهدي أعمالها على إنستغرام وتأكّدي أن أسلوبها يعجبكِ.")}</li>
                <li>{t("اسألي عنها أو اقرئي تقييماتها إن وُجدت.")}</li>
              </ul>
              <p className="mt-1">{t("تشكّين بشيء؟ أبلغينا من أسفل صفحتها ونراجع فوراً.")}</p>
            </div>

            <div className="mb-3" onClickCapture={() => setPayTouched(true)}><PaymentMethodsView methods={payMethods} amount={Number(b.deposit_amount) || undefined} reference={String(token).slice(0, 8).toUpperCase()} /></div>
            {payTouched && (
              <div className="mb-3 rounded-sm border border-gold bg-gold/10 p-3 text-sm font-medium">{t("حوّلتِ؟ لا تنسي رفع صورة الإيصال هنا 👇 حتى تثبّت المصوّرة حجزكِ بسرعة.")}</div>
            )}

            <div className="grid gap-3">
              <input type="text" placeholder={t("رقم العملية المرجعي (مطلوب)")} required value={reference}
                     onChange={(e) => setReference(e.target.value)}
                     className="border border-border rounded-sm px-3 py-2 text-sm bg-background" />
              <input type="text" placeholder={t("اسم صاحب الحساب الذي حوّلتِ منه (مطلوب)")} required value={note}
                        onChange={(e) => setNote(e.target.value)}
                        className="border border-border rounded-sm px-3 py-2 text-sm bg-background" />
              <label className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed p-4 text-sm transition-colors ${pickedFile ? "border-gold/60 bg-card" : "border-border hover:border-gold/40"}`}>
                <input ref={fileRef} type="file" accept="image/*,application/pdf" className="sr-only"
                       onChange={(e) => setPickedFile(e.target.files?.[0] ?? null)} />
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-secondary">
                  {pickedFile ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <Paperclip className="h-5 w-5 text-muted-foreground" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium truncate">{pickedFile ? pickedFile.name : t("اختاري صورة الإيصال")}</span>
                  <span className="block text-xs text-muted-foreground">{pickedFile ? t("{0} ميجا — اضغطي للتغيير", [(pickedFile.size / 1024 / 1024).toFixed(1)]) : t("مطلوب — صورة أو لقطة شاشة للإيصال")}</span>
                </span>
              </label>
              <button onClick={onSendDeposit} disabled={uploading || !termsOk}
                      className="bg-gold text-charcoal py-3 rounded-sm font-medium hover:opacity-90 disabled:opacity-60 inline-flex items-center justify-center gap-2">
                <Upload className="h-4 w-4" /> {uploading ? t("جاري الإرسال…") : t("تم إرسال العربون")}
              </button>
              {!termsOk && !uploading && <p className="text-center text-xs text-muted-foreground">{t("أشّري «قرأت وفهمت» على الشروط أعلاه حتى يتفعّل الزر.")}</p>}

            </div>
          </div>
        )}

        {/* Bride cancellation — free before the deposit; after it the photographer's declared policy applies */}
        {canCancel && (
          <div className="rounded-sm border border-border bg-card p-4 mb-6 text-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-medium">{depositPaid ? t("تحتاجين لإلغاء الحجز؟") : t("تحتاجين لإلغاء الطلب؟")}</div>
                <div className="text-xs text-muted-foreground">{depositPaid ? refundLine() : t("لم تدفعي عربوناً بعد، فالإلغاء بدون أي تبعات.")}</div>
              </div>
              <button onClick={onClientCancel} className="text-destructive border border-destructive/30 px-3 py-2 rounded-sm hover:bg-destructive/10 inline-flex items-center gap-2 shrink-0">
                <XCircle className="h-4 w-4" />{" "}{depositPaid ? t("إلغاء الحجز") : t("إلغاء الطلب")}
              </button>
            </div>
            {depositPaid && <p className="mt-3 text-xs text-muted-foreground">{postponeNote}</p>}
          </div>
        )}

        {showBalanceDue && (
          <div className="rounded-2xl border border-gold/40 bg-gold/5 p-5 mb-6 text-sm">
            <div className="font-serif text-lg mb-1">{t("باقي المبلغ: {0} د.أ", [remainingDue.toLocaleString(locale("ar-JO"))])} <Term k="balance" /></div>
            <p className="text-muted-foreground mb-3">{t("حوّلي باقي المبلغ للمصوّرة بنفس طريقة العربون، حتى تحفظي حقّها وحقّكِ وتستلمي صورك. بعض المصوّرات يسلّمن الصور بعد وصول المبلغ فقط.")}</p>
            <PaymentMethodsView methods={payMethods} amount={remainingDue || undefined} reference={String(token).slice(0, 8).toUpperCase()} />
          </div>
        )}

        {b.status === "cancelled" && (
          <div className="rounded-sm border border-destructive/30 bg-destructive/5 p-4 mb-6 text-sm">
            <div className="font-medium text-destructive mb-1">{t("تم إلغاء هذا الحجز")}</div>
            {b.cancellation_reason && <div className="mb-1">{t("السبب:")}{" "}{tx(b.cancellation_reason)}</div>}
            {!b.deposit_sent_at && <div className="text-muted-foreground">{t("لم يُدفع أي مبلغ على هذا الطلب.")}</div>}
            {b.deposit_sent_at && !Number(b.refund_amount || 0) && <div className="text-muted-foreground">{t("حسب سياسة العربون التي وافقتِ عليها، لا يُرجَع العربون في هذه الحالة.")}</div>}
            {!b.deposit_sent_at && b.event_date >= new Date().toISOString().slice(0, 10) && (
              <a href={`/search?date=${b.event_date}`} className="mt-3 inline-flex items-center gap-2 rounded-full bg-gold px-5 py-2 text-sm font-medium text-charcoal">{t("مصوّرات متاحات بنفس التاريخ")}</a>
            )}
            {Number(b.refund_amount || 0) > 0 && (
              <div>
                {b.refund_status === "refunded"
                  ? t("سجّلت المصوّرة إرجاع {0} د.أ لكِ.", [b.refund_amount])
                  : t("على المصوّرة إرجاع {0} د.أ لكِ مباشرة، فالعربون وصل لحسابها ولا يمرّ عبر المنصّة. إذا تأخّر الإرجاع، راسليها من هذه الصفحة أو تواصلي معنا.", [b.refund_amount])}
              </div>
            )}
          </div>
        )}



        {/* المنصّة لا تستلم العربون: الدفع الإلكتروني للعربون أُزيل من صفحة العروس، والتحويل عبر CliQ فقط */}

        {/* Delivered → mark received */}
        {!!b.delivered_at && !b.client_received_at && (
          <div className="rounded-sm border border-emerald-200 bg-emerald-50 p-5 mb-6">
            <h2 className="font-serif text-xl mb-2">{t("تم تسليم الصور")}</h2>
            <p className="text-sm mb-3">{t("إذا استلمتِ الصور بشكل كامل، اضغطي للتأكيد.")}</p>
            <button onClick={onReceived} className="bg-emerald-600 text-white px-4 py-2 rounded-sm text-sm inline-flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />{" "}{t("تأكيد استلام الصور")}
            </button>
          </div>
        )}

        {/* Completed → review link */}
        {!!b.client_received_at && !b.has_review && (
          <div id="review-step" className="scroll-mt-24 rounded-2xl border border-gold/30 bg-gold/5 p-5 mb-6 shadow-sm">
            <h2 className="font-serif text-xl mb-2 text-gold">{t("شكراً لثقتك! 🌟")}</h2>
            <p className="text-sm mb-3">{t("يسعدنا أن تكون تجربتك رائعة.")}</p>
            <div className="mb-4 bg-background border border-border p-3 rounded-sm text-xs text-muted-foreground flex items-start gap-2">
              <span className="text-lg">💡</span>
              <p><strong>{t("تلميح:")}</strong>{" "}{t("دقيقة واحدة لتقييم المصورة ستصنع فارقاً حقيقياً وتساعد عشرات العرائس الأخريات في قرارهن!")}</p>
            </div>
            <Link to="/review/$token" params={{ token }} className="bg-charcoal text-ivory px-4 py-2 rounded-sm text-sm inline-flex items-center gap-2">
              {t("قيّمي المصورة")}
            </Link>
          </div>
        )}

        {/* Notes */}
        <div className="rounded-sm border border-border bg-card p-5 mb-6">
          <h2 className="font-serif text-lg mb-3 inline-flex items-center gap-2"><MessageSquare className="h-4 w-4" />{" "}{t("ملاحظاتي")}</h2>
          {b.client_notes && (
            <div className="bg-secondary/40 rounded-sm p-3 text-sm whitespace-pre-line mb-3">{tx(b.client_notes)}</div>
          )}
          <textarea placeholder={t("أضيفي ملاحظة جديدة…")} value={newNote} rows={3}
                    onChange={(e) => setNewNote(e.target.value)}
                    className="w-full border border-border rounded-sm px-3 py-2 text-sm bg-background" />
          <button onClick={onAddNote} disabled={!newNote.trim()}
                  className="mt-2 bg-charcoal text-ivory px-4 py-2 rounded-sm text-sm disabled:opacity-50">
            {t("إرسال ملاحظة")}
          </button>
        </div>

        {b.contract?.sign_token && b.status !== "cancelled" && (
          <a id="contract-step" href={`/contracts/${b.contract.sign_token}`} className={`scroll-mt-24 mb-6 flex items-center justify-between gap-3 rounded-2xl border p-5 text-sm ${b.contract.status === "signed" ? "border-border bg-card" : "border-gold bg-gold/10"}`}>
            <div>
              <div className="font-semibold">{b.contract.status === "signed" ? t("✅ عقد التصوير موقَّع") : t("✍️ وقّعي عقد التصوير")}</div>
              <div className="text-xs text-muted-foreground mt-1">{b.contract.status === "signed" ? t("اضغطي لعرض العقد.") : t("اقرئي شروط الحجز ووقّعي العقد إلكترونياً — يحمي حقّكِ وحقّ المصوّرة.")}</div>
            </div>
            <span className="shrink-0 text-gold">←</span>
          </a>
        )}

        <BrideExtras b={b} token={token} onChange={load} />

        {/* Photographer contact */}
        <div className="rounded-sm border border-border bg-card p-5 text-sm">
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">{t("للتواصل عند الحاجة")}</div>
          <div className="space-y-1">
            {ph.whatsapp && <div>{t("واتساب:")}{" "}<button className="text-gold underline" onClick={async () => {
              const ok = await confirm({ title: t("التحويل لواتساب"), description: t("سيتم نقلك لتطبيق واتساب للتواصل مع المصورة."), confirmText: t("حسناً") });
              if (ok) window.open(`https://wa.me/${ph.whatsapp.replace(/[^0-9]/g,'')}`, "_blank");
            }}>{tx(ph.whatsapp)}</button></div>}
            {ph.phone && <div>{t("هاتف: {0}", [ph.phone])}</div>}
            {!ph.whatsapp && !ph.phone && b.status !== "cancelled" && <div className="text-muted-foreground">{t("يظهر رقم المصوّرة هنا بعد موافقتها على طلبكِ. حتى ذلك الحين راسليها من هذه الصفحة.")}</div>}
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-8">{t("هذا الرابط خاص بكِ — احفظيه للعودة لاحقاً ولا تشاركيه حفاظاً على خصوصية صورك.")}</p>

        <ClientGallery token={token} />
        <ClientChat token={token} clientName={b.client_name} />
      </section>

      {/* ✅ Dialog إلغاء الطلب — بديل window.prompt يعمل في PWA وكل المتصفحات */}
      {showCancelDialog && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="cancel-dialog-title" className="bg-background border border-border rounded-xl shadow-2xl max-w-md w-full p-6">
            <h2 id="cancel-dialog-title" className="font-serif text-xl mb-2">{depositPaid ? t("إلغاء الحجز") : t("إلغاء طلب الحجز")}</h2>
            <p className="text-sm text-muted-foreground mb-4">
              {t("سيتم إلغاء الحجز نهائياً ويُفتح التاريخ لغيرك.")}
            </p>

            {/* سياسة الاسترداد */}
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-4 text-sm">
              <p className="font-medium text-amber-800 dark:text-amber-300 mb-1">{t("سياسة العربون:")}</p>
              {depositPaid ? (
                <div className="space-y-1.5 text-amber-700 dark:text-amber-400">
                  <p>{refundLine()}</p>
                  <p>{platformNote}</p>
                  <label className="flex items-start gap-2 pt-1 font-medium text-amber-900 dark:text-amber-200 cursor-pointer">
                    <input type="checkbox" className="mt-1 h-4 w-4" checked={cancelAck} onChange={(e) => setCancelAck(e.target.checked)} />
                    <span>{t("فهمت، وأريد الإلغاء.")}</span>
                  </label>
                </div>
              ) : (
                <p className="text-amber-700 dark:text-amber-400">{t("لم تدفعي عربوناً بعد، فالإلغاء بدون أي تبعات.")}</p>
              )}
            </div>

            {depositPaid && b.step_up && (
              <div className="mb-4">
                <StepUpBox token={token} purpose="cancel" code={cancelCode} onCode={setCancelCode} />
              </div>
            )}

            <label className="block text-sm font-medium mb-2">
              {t("سبب الإلغاء")}{" "}<span className="text-muted-foreground">{t("(اختياري)")}</span>
            </label>
            <textarea
              autoFocus
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder={t("اكتبي سبب الإلغاء هنا…")}
              rows={3}
              maxLength={2000}
              className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-destructive/30"
            />
            <p className="text-xs text-muted-foreground mt-1 mb-4">
              {tx(cancelReason.length)}/2000
            </p>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setShowCancelDialog(false); setCancelReason(""); setCancelAck(false); }}
                disabled={cancelLoading}
                className="px-4 py-2 text-sm border border-border rounded-md hover:bg-muted transition-colors disabled:opacity-50"
              >
                {t("تراجع")}
              </button>
              <button
                onClick={handleConfirmCancel}
                disabled={cancelLoading || (depositPaid && !cancelAck) || (depositPaid && b.step_up && cancelCode.length !== 6)}
                className="px-4 py-2 text-sm bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {cancelLoading && <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {cancelLoading ? t("جاري الإلغاء…") : t("تأكيد الإلغاء")}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}

function Info({ label, v }: { label: string; v: any }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{tx(label)}</div>
      <div className="font-medium">{v ?? "—"}</div>
    </div>
  );
}

function ClientGallery({ token }: { token: string }) {
  const fetchG = useServerFn(getGalleryByToken);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [finalPaid, setFinalPaid] = useState(false);
  const [dlProgress, setDlProgress] = useState<number | null>(null);

  // تحميل كل الصور واحدة ورا الثانية (المتصفح قد يسأل مرة عن السماح بعدة تنزيلات)
  const downloadAll = async () => {
    const photos = (data?.photos ?? []).filter((p: any) => p.url);
    let failed = 0;
    for (let i = 0; i < photos.length; i++) {
      setDlProgress(i + 1);
      try {
        const resp = await fetch(photos[i].url);
        const href = URL.createObjectURL(await resp.blob());
        const ext = (resp.headers.get("content-type") || "image/jpeg").split("/")[1]?.replace(/[^a-z0-9]/gi, "") || "jpg";
        const a = document.createElement("a");
        a.href = href;
        a.download = `memoria-${String(i + 1).padStart(3, "0")}.${ext}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(href), 2000);
        await new Promise((r) => setTimeout(r, 400));
      } catch { failed++; }
    }
    setDlProgress(null);
    if (failed) toast.error(t("تعذّر تحميل {0} صورة، حاولي مرة أخرى", [failed]));
    else toast.success(t("اكتمل التحميل"));
  };

  const load = async () => {
    try {
      const result = await fetchG({ data: { token } });
      setData(result);
      if (result?.final_paid != null) setFinalPaid(!!result.final_paid);
    }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [token]);

  if (loading) return null;
  if (data?.expired) return <div className="mt-8 rounded-sm border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{t("انتهت صلاحية معرض الصور.")}</div>;
  if (!data?.gallery) return null;

  return (
    <div className="mt-8 rounded-sm border border-border bg-card p-5">
      <h2 className="font-serif text-xl mb-4 flex items-center gap-2"><ImageIcon className="h-5 w-5 text-gold" /> {data.gallery.title || t("معرض الصور")}</h2>

      {/* Payment Status Banner */}
      {!finalPaid && data.photos.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="mb-6 p-4 rounded-sm border border-gold/30 bg-gold/5
                     flex flex-col sm:flex-row items-start sm:items-center
                     justify-between gap-3"
        >
          <div>
            <p className="font-medium text-sm flex items-center gap-2">
              <span>📸</span>
              <span>{t("صورك جاهزة للمعاينة — بعلامة مائية")}</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {t("أكملي الدفع النهائي للوصول إلى صورك الكاملة بجودة عالية وبدون علامة مائية")}
            </p>
          </div>
          <button
            className="shrink-0 bg-[var(--gold)] text-white text-sm font-medium
                       px-5 py-2 rounded-sm hover:opacity-90 transition-opacity
                       whitespace-nowrap"
            onClick={() => {}}
          >
            {t("أكملي الدفع النهائي")}
          </button>
        </motion.div>
      )}

      {/* Sticky mobile payment CTA */}
      {!finalPaid && data.photos && data.photos.length > 0 && (
        <div className="md:hidden fixed bottom-0 start-0 end-0 z-40 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] bg-background/95 backdrop-blur-md border-t border-border">
          <button
            onClick={() => {}}
            className="w-full bg-[var(--gold)] text-white font-medium py-3 rounded-sm active:scale-[0.98] transition-transform"
          >
            {t("أكملي الدفع النهائي ✦")}
          </button>
        </div>
      )}

      {finalPaid && data.photos.length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="mb-6 p-4 rounded-sm border border-emerald-500/20
                     bg-emerald-500/5 text-center"
        >
          <span className="text-sm font-medium">
            {t("🌟 صورك الكاملة بجودة عالية — يمكنك التحميل الآن")}
          </span>
          {data.gallery?.expires_at && (
            <div className="mt-1 text-xs text-muted-foreground">{t("المعرض متاح حتى {0}. احفظي نسخة عندكِ.", [new Date(data.gallery.expires_at).toLocaleDateString(locale("ar-JO"), { day: "numeric", month: "long", year: "numeric" })])}</div>
          )}
          {data.gallery?.allow_downloads && data.photos.length > 1 && (
            <button onClick={downloadAll} disabled={dlProgress !== null}
              className="mt-3 inline-flex items-center gap-2 rounded-full bg-charcoal px-5 py-2 text-xs text-ivory disabled:opacity-60">
              <Download className="h-3.5 w-3.5" />
              {dlProgress !== null ? t("جاري التحميل {0} من {1}", [dlProgress, data.photos.length]) : t("حمّلي الكل ({0} صورة)", [data.photos.length])}
            </button>
          )}
        </motion.div>
      )}

      {data.photos.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("لم تُرفع صور بعد. ستظهر هنا فور التسليم.")}</p>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {data.photos.map((p: any, idx: number) => (
            <div key={p.id} className="relative group aspect-square bg-secondary rounded-sm overflow-hidden cursor-pointer" onClick={() => setLightboxIdx(idx)} style={{ touchAction: 'manipulation' }}>
              {/* Fix #3: استخدام thumbnail_url المضغوط في الشبكة — أداء أسرع بكثير */}
              {(p.thumbnail_url || p.url) && (
                <img
                  src={p.thumbnail_url ?? p.url}
                  alt={p.caption ?? ""}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover transition group-hover:scale-105"
                />
              )}
              {data.gallery.allow_downloads && p.url && (
                <button
                  type="button"
                  onClick={async (e) => {
                    e.stopPropagation();
                    try {
                      const resp = await fetch(p.url);
                      const blob = await resp.blob();
                      const href = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = href;
                      const ext = (resp.headers.get("content-type") || "image/jpeg").split("/")[1] || "jpg";
                      a.download = `photo-${p.id}.${ext.replace(/[^a-z0-9]/gi, "") || "jpg"}`;
                      document.body.appendChild(a);
                      a.click();
                      a.remove();
                      setTimeout(() => URL.revokeObjectURL(href), 1000);
                    } catch {
                      toast.error(t("تعذّر التحميل، حاولي مرة أخرى"));
                    }
                  }}
                  className="absolute bottom-1 end-1 bg-black/60 text-white p-1.5 rounded-sm opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition"
                  aria-label={t("تحميل")}
                >
                  <Download className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      <AnimatePresence>
        {lightboxIdx !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-50 bg-black/92 flex items-center justify-center p-4"
            onClick={() => setLightboxIdx(null)}
          >
            <motion.img
              key={lightboxIdx}
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.15}
              onDragEnd={(_: any, { offset, velocity }: any) => {
                if (Math.abs(offset.x) > 80 || Math.abs(velocity.x) > 400) {
                  const photos = data.photos.map((p: any) => p.url).filter(Boolean);
                  if (offset.x < 0) setLightboxIdx((prev) => prev !== null ? Math.min(prev + 1, photos.length - 1) : null);
                  else setLightboxIdx((prev) => prev !== null ? Math.max(prev - 1, 0) : null);
                }
              }}
              src={data.photos.map((p: any) => p.url).filter(Boolean)[lightboxIdx] || ""}
              alt=""
              className="max-h-[90vh] max-w-full object-contain cursor-grab active:cursor-grabbing
                         select-none rounded-sm"
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ClientChat({ token, clientName }: { token: string; clientName: string }) {
  const fetchM = useServerFn(getMessagesByToken);
  const sendM = useServerFn(sendMessageByToken);
  const reportFn = useServerFn(reportChatByToken);
  const [msgs, setMsgs] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const load = async () => {
    try { const r = await fetchM({ data: { token } }); setMsgs(r.messages); } catch { /* ignore */ }
  };
  useEffect(() => {
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
    /* eslint-disable-next-line */
  }, [token]);

  const send = async () => {
    if (!text.trim()) return;
    setSending(true);
    try { await sendM({ data: { token, body: text.trim() } }); setText(""); await load(); }
    catch (e: any) { toast.error(e.message); }
    finally { setSending(false); }
  };

  return (
    <div className="mt-8 rounded-sm border border-border bg-card p-5">
      <h2 id="chat-step" className="scroll-mt-24 font-serif text-xl mb-4 flex items-center gap-2"><MessageSquare className="h-5 w-5 text-gold" />{" "}{t("المحادثة مع المصوّرة")}</h2>
      <div className="space-y-2 max-h-96 overflow-y-auto mb-4">
        {msgs.length === 0 && <p className="text-sm text-muted-foreground">{t("ابدئي المحادثة بإرسال رسالة.")}</p>}
        {msgs.map((m) => {
          const mine = !m.sender_id; // client messages have null sender_id
          return (
            <div key={m.id} className={`p-3 rounded-sm ${mine ? "bg-charcoal text-ivory ms-8" : "bg-secondary me-8"}`}>
              <div className="text-[10px] opacity-70 mb-1 flex items-center gap-1.5">
                <span>{mine ? clientName : (m.sender_name || t("المصوّرة"))} · {new Date(m.created_at).toLocaleString(locale("ar-JO"))}</span>
                {mine && (
                  <span className={m.read_at ? "text-blue-400" : "text-ivory/50"} title={m.read_at ? t("مقروءة") : t("مرسلة")}>✓✓</span>
                )}
              </div>
              <div className="text-sm whitespace-pre-wrap">{tx(m.body)}</div>
              {!mine && externalHosts(m.body).length > 0 && (
                <div className="mt-1.5 text-[11px] text-amber-700 dark:text-amber-400">
                  {t("رابط خارجي ({0}). لا تدخلي فيه بيانات بطاقة أو كلمة سر، والدفع فقط بالطرق الظاهرة في هذه الصفحة.", [externalHosts(m.body).join("، ")])}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder={t("اكتبي رسالة…")} className="flex-1 border border-border rounded-sm px-3 py-2 bg-background text-sm" />
        <button onClick={send} disabled={sending || !text.trim()} className="bg-charcoal text-ivory px-4 rounded-sm inline-flex items-center gap-2 disabled:opacity-50">
          <SendIcon className="h-4 w-4" />{" "}{t("إرسال")}
        </button>
      </div>
      <ChatReport send={(details) => reportFn({ data: { token, details } })} />
    </div>
  );
}