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
import { createDepositCheckout, isPaymentsEnabled, reconcilePaymentStatus } from "@/lib/payments.functions";
import { getGalleryByToken, getMessagesByToken, sendMessageByToken } from "@/lib/gallery.functions";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, CalendarPlus, LockKeyhole, Unlock, Clock, Upload, Copy, Camera, Image as ImageIcon, Truck, MessageSquare, Download, Send as SendIcon, X, CreditCard, XCircle } from "lucide-react";
import { Lightbox } from "@/components/Lightbox";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { CopyButton } from "@/components/ui/copy-button";
import { ChevronDown, Paperclip } from "lucide-react";

import { AlertTriangle, RefreshCcw, Home } from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/track/$token")({
  head: () => ({
    meta: [
      { title: "متابعة حجزك — ميموريا" },
      { name: "description", content: "تابعي حالة حجز التصوير، الدفعات، والصور خطوة بخطوة." },
      { property: "og:title", content: "متابعة حجزك — ميموريا" },
      { property: "og:description", content: "تابعي حالة حجز التصوير، الدفعات، والصور خطوة بخطوة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TrackingPage,
  errorComponent: ClientError,
});

function ClientError({ error, reset }: any) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-6">
        <div className="h-24 w-24 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
          <AlertTriangle className="h-12 w-12 text-red-500" />
        </div>
        <div className="space-y-2 max-w-md">
          <h1 className="font-serif text-3xl">عذراً! رابط التتبع واجه مشكلة</h1>
          <p className="text-muted-foreground">الرابط غير صحيح أو حدث خطأ في النظام.</p>
        </div>
        <div className="flex gap-4">
          <button onClick={reset} className="inline-flex items-center gap-2 bg-charcoal text-ivory px-6 py-3 rounded-sm hover:opacity-90 transition">
            <RefreshCcw className="h-4 w-4" /> تحديث الصفحة
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
  const checkoutFn = useServerFn(createDepositCheckout);
  const isPayEnabledFn = useServerFn(isPaymentsEnabled);
  const reconcileFn = useServerFn(reconcilePaymentStatus);

  const [b, setB] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [payLoading, setPayLoading] = useState(false);
  const [reconcileLoading, setReconcileLoading] = useState(false);
  const [payEnabled, setPayEnabled] = useState(false);
  const isExpired = b?.status === 'pending_deposit' && (b as any)?.created_at && new Date((b as any).created_at).getTime() < Date.now() - 48 * 3600 * 1000;

  const [reference, setReference] = useState("");
  const [pickedFile, setPickedFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [newNote, setNewNote] = useState("");

  const addToCalendar = () => {
    if (!b) return;
    const date = b.event_date.replace(/-/g, '');
    const start = (b.start_time || "09:00").replace(/:/g, '') + '00';
    const end = (b.end_time || "12:00").replace(/:/g, '') + '00';
    const text = encodeURIComponent(`جلسة تصوير مع ${b.photographer.display_name}`);
    const details = encodeURIComponent(`رابط التتبع: ${window.location.href}`);
    const location = encodeURIComponent(b.venue_address || "موقع التصوير");
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${date}T${start}/${date}T${end}&details=${details}&location=${location}`;
    window.open(url, '_blank');
  };

  
  // ✅ إصلاح: Dialog حقيقي بدلاً من window.prompt
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelLoading, setCancelLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  // حارس polling: لا نستبدل الحالة أثناء تفاعل المستخدم مع رفع/إلغاء/دفع
  const busyRef = useRef(false);
  busyRef.current = uploading || cancelLoading || payLoading || reconcileLoading;

  const load = async () => {
    try {
      const data = await get({ data: { token } });
      setB(data);
    } catch (e: any) {
      console.error("[track] load failed", e);
      toast.error("تعذّر تحميل الحجز، حاولي التحديث بعد قليل");
    }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [token]);

  // اكتشف ما إذا كانت بوّابة الدفع الإلكترونية مهيّأة (لإظهار زر الدفع أونلاين)
  useEffect(() => {
    (async () => {
      try { const r: any = await isPayEnabledFn(); setPayEnabled(!!r?.enabled); } catch {}
    })();
    /* eslint-disable-next-line */
  }, []);

  // عرض إشعار عند العودة من بوّابة الدفع
  useEffect(() => {
    const u = new URL(window.location.href);
    const status = u.searchParams.get("payment");
    if (status === "success") {
      toast.success("تم استلام دفعتك. يتم تأكيد الحجز خلال لحظات…");
      u.searchParams.delete("payment");
      window.history.replaceState({}, "", u.toString());
    } else if (status === "cancelled") {
      toast.message("أُلغي الدفع. يمكنك المحاولة مجدّداً أو استخدام طريقة CliQ اليدوية.");
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
        <h1 className="font-serif text-3xl mb-2">انتهت صلاحية الرابط</h1>
        <p className="text-muted-foreground mb-4">هذا الرابط أصبح غير فعّال. يرجى التواصل مع المصورة للحصول على رابط جديد.</p>
        {b.photographer?.whatsapp && (
          <button onClick={async () => {
            const ok = await confirm({ title: "التحويل لواتساب", description: "سيتم نقلك لتطبيق واتساب للتواصل مع المصورة.", confirmText: "حسناً" });
            if (ok) window.open(`https://wa.me/${String(b.photographer.whatsapp).replace(/\D/g, "")}`, "_blank");
          }}
             className="inline-block bg-charcoal text-ivory px-5 py-2 rounded-sm">تواصل عبر واتساب</button>
        )}
      </div>
      <Footer />
    </div>
  );
  if (b && b.deleted_at) return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container-editorial py-24 text-center">
        <h1 className="font-serif text-3xl mb-2 text-destructive">تم حذف هذا الحجز</h1>
        <p className="text-muted-foreground">لا يمكن الوصول إلى تفاصيل هذا الحجز لأنه تم حذفه من قبل المصوّرة.</p>
      </div>
      <Footer />
    </div>
  );
  if (!b) return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container-editorial py-24 text-center">
        <h1 className="font-serif text-3xl mb-2">رابط غير صالح</h1>
        <p className="text-muted-foreground">قد يكون الرابط منتهي الصلاحية أو غير صحيح.</p>
      </div>
      <Footer />
    </div>
  );

  const onSendDeposit = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      toast.error("ارفعي صورة إيصال التحويل (لقطة شاشة من تطبيق البنك تكفي).", { id: "upload-receipt" });
      return;
    }
    if (reference.trim().length < 3) {
      toast.error("اكتبي رقم العملية المرجعي الظاهر في إيصال التحويل.", { id: "upload-receipt" });
      return;
    }
    if (note.trim().length < 3) {
      toast.error("اكتبي اسم صاحب الحساب الذي حوّلتِ منه.", { id: "upload-receipt" });
      return;
    }

    // File validation — نقبل أيضاً HEIC/WebP لأن معظم الإيصالات تُلتقط من الجوال
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast.error("صيغة الملف غير مدعومة. يرجى رفع صورة (JPG/PNG/WebP) أو ملف PDF.", { id: "upload-receipt" });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("حجم الملف كبير جداً (الحد الأقصى 10 ميجابايت).", { id: "upload-receipt" });
      return;
    }

    setUploading(true);
    toast.loading("جاري رفع الإيصال...", { id: "upload-receipt" });
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
        throw new Error("تعذّر تصغير الملف. التقطي لقطة شاشة للإيصال وارفعيها بدلاً منه.");
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
      await sendDeposit({ data: { token, proof_path: path, reference: reference.trim(), note: `اسم المحوِّل: ${note.trim()}` } });
      toast.success("تم إرسال الإيصال بنجاح. سنقوم بتأكيد الحجز قريباً.", { id: "upload-receipt" });
      setReference(""); setNote(""); setPickedFile(null);
      if (fileRef.current) fileRef.current.value = "";
      load();
    } catch (e: any) {
      toast.error(e.message || "حدث خطأ أثناء رفع الملف", { id: "upload-receipt" });
    } finally {
      setUploading(false);
    }
  };

  const onAddNote = async () => {
    if (!newNote.trim()) return;
    try {
      await addNote({ data: { token, note: newNote.trim() } });
      toast.success("تمت إضافة الملاحظة");
      setNewNote("");
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  const onReceived = async () => {
    if (!(await confirm({ title: "تأكيد الاستلام", description: "هل تأكدتِ من استلام جميع الصور؟", confirmText: "تأكيد" }))) return;
    try {
      await markReceived({ data: { token } });
      toast.success("شكرًا! تم تأكيد الاستلام.");
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  const onPayOnline = async () => {
    setPayLoading(true);
    try {
      const res: any = await checkoutFn({ data: { token } });
      if (!res?.configured || !res?.url) {
        toast.error("الدفع الإلكتروني غير متاح حالياً. استخدمي CliQ.");
        return;
      }
      window.location.href = res.url;
    } catch (e: any) {
      toast.error(e?.message || "تعذّر بدء الدفع");
    } finally {
      setPayLoading(false);
    }
  };

  // Fix #5: مصالحة مالية يدوية عند انقطاع الـ Webhook
  const onReconcile = async () => {
    setReconcileLoading(true);
    try {
      const res: any = await reconcileFn({ data: { token } });
      if (res?.updated) {
        toast.success("تم تأكيد الدفع وتحديث حالة الحجز بنجاح! تحديث الصفحة…");
        setTimeout(() => load(), 1500);
      } else if (res?.status === "already_confirmed") {
        toast.success("الحجز مؤكّد مسبقاً.");
      } else if (res?.status === "no_session") {
        toast.message("لم يتم إنشاء جلسة دفع إلكتروني لهذا الحجز.");
      } else {
        toast.message(`حالة الدفع حسب البوابة: ${res?.status ?? "unknown"}. إن كنتِ قد دفعتِ فعلاً، تواصلي مع المصوّرة.`);
      }
    } catch (e: any) {
      toast.error(e?.message || "تعذّر التحقق من حالة الدفع");
    } finally {
      setReconcileLoading(false);
    }
  };

  // ✅ إصلاح: فتح Dialog بدلاً من window.prompt (يعمل في PWA + كل المتصفحات)
  const onClientCancel = () => {
    setShowCancelDialog(true);
  };

  const handleConfirmCancel = async () => {
    setCancelLoading(true);
    toast.loading("جاري إلغاء الحجز...", { id: "cancel-booking" });
    try {
      await cancelFn({ data: { token, reason: cancelReason } });
      toast.success("تم إلغاء الحجز بنجاح", { id: "cancel-booking" });
      setShowCancelDialog(false);
      setCancelReason("");
      load();
    } catch (e: any) {
      toast.error(e.message, { id: "cancel-booking" });
    } finally {
      setCancelLoading(false);
    }
  };

  const ph = b.photographer;
  const stages = [
    { key: "request", label: "طلب الحجز", done: true, icon: <CheckCircle2 className="h-5 w-5" /> },
    { key: "deposit", label: "إرسال العربون", done: !!b.deposit_sent_at, icon: <Upload className="h-5 w-5" /> },
    { key: "confirmed", label: "تأكيد الحجز", done: !!b.deposit_confirmed_at || ["confirmed","completed"].includes(b.status), icon: <CheckCircle2 className="h-5 w-5" /> },
    { key: "shoot", label: "يوم التصوير", done: b.production_stage !== "awaiting" || !!b.delivered_at || b.status === "completed", icon: <Camera className="h-5 w-5" /> },
    { key: "editing", label: "التحرير", done: ["editing","delivered","completed"].includes(b.production_stage) || !!b.delivered_at || b.status === "completed", icon: <ImageIcon className="h-5 w-5" /> },
    { key: "delivered", label: "التسليم", done: !!b.delivered_at || b.status === "completed", icon: <Truck className="h-5 w-5" /> },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <section className="container-editorial py-10 max-w-4xl">
        <div className="text-xs uppercase tracking-[0.3em] text-gold mb-1">تتبع الحجز</div>
        <h1 className="font-serif text-3xl mb-1">
          {new Date().getHours() < 12 ? "صباح الخير" : "مساء الخير"}، {b.client_name}
        </h1>
        <p className="text-muted-foreground text-sm mb-4">حجز مع {ph.display_name} (@{ph.username})</p>

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
            if (!b.deposit_sent_at) return { title: "الخطوة التالية: إرسال العربون", body: `حوّلي ${Number(b.deposit_amount).toLocaleString("ar-JO")} د.أ لتثبيت موعدك، ثم ارفعي الإيصال.`, cta: "إرسال العربون", target: "deposit-step" };
            if (!(b.deposit_confirmed_at || ["confirmed", "completed"].includes(b.status))) return { title: "وصل إيصالك — بانتظار تأكيد المصوّرة", body: "تصلك رسالة فور التأكيد. عادةً خلال ساعات.", cta: null, target: null };
            if (!b.delivered_at && b.status !== "completed" && daysToEvent !== null && daysToEvent >= 0) return { title: daysToEvent === 0 ? "اليوم يومك 🤍" : `باقي ${daysToEvent} ${daysToEvent === 1 ? "يوم" : "يوماً"} على يومك`, body: "حجزك مؤكَّد. أضيفي الموعد لتقويمك، واكتبي للمصوّرة أي تفاصيل تهمّك.", cta: null, target: null };
            if (!b.delivered_at && b.status !== "completed") return { title: "صورك قيد التحرير", body: "تعمل المصوّرة على اختيار صورك وتحريرها. ستصلك رسالة عند جاهزيتها.", cta: null, target: null };
            if (!b.client_received_at) return { title: "صورك جاهزة", body: "حمّلي صورك ثم أكّدي الاستلام.", cta: b.delivery_link ? "تحميل الصور" : null, target: b.delivery_link ? "delivery-link" : null };
            return { title: "اكتمل حجزك", body: "شكراً لثقتك. رأيك يساعد عرائس أخريات.", cta: "قيّمي المصوّرة", target: "review-step" };
          })();
          return (
            <div className="mb-8 overflow-hidden rounded-2xl bg-charcoal text-ivory grain-overlay dark:bg-card dark:text-foreground dark:ring-1 dark:ring-gold/30">
              <div className="relative z-10 p-6 sm:p-8">
                <div className="mb-2 text-xs tracking-wide text-gold">أنتِ هنا</div>
                <h2 className="font-serif text-3xl leading-tight text-balance">{here.title}</h2>
                <p className="mt-2 max-w-lg text-sm text-ivory/70 dark:text-muted-foreground">{here.body}</p>
                {here.cta && here.target && (
                  <button
                    onClick={() => document.getElementById(here.target!)?.scrollIntoView({ behavior: "smooth", block: "start" })}
                    className="mt-5 inline-flex items-center gap-2 rounded-full bg-gold px-6 py-2.5 text-sm font-medium text-charcoal transition-transform active:scale-95"
                  >
                    {here.cta}
                  </button>
                )}
                {(b.status === "confirmed" || b.status === "completed") && daysToEvent !== null && daysToEvent >= 0 && (
                  <button onClick={addToCalendar} className="mt-5 ms-2 inline-flex items-center gap-2 rounded-full border border-ivory/20 px-5 py-2.5 text-sm hover:border-gold hover:text-gold transition-colors dark:border-border">
                    <CalendarPlus className="h-4 w-4" /> أضيفي لتقويمك
                  </button>
                )}

                {/* خط المراحل: المنجز ذهبي، والحالي ينبض */}
                <ol className="mt-8 grid grid-cols-6 gap-1" aria-label="مراحل الحجز">
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
                        <span className={`text-[10px] leading-tight ${current ? "text-gold font-medium" : st.done ? "text-ivory/80 dark:text-foreground" : "text-ivory/40 dark:text-muted-foreground"}`}>{st.label}</span>
                      </li>
                    );
                  })}
                </ol>
              </div>
            </div>
          );
        })()}

        {/* رابط تسليم الصور الخارجي (Drive / WeTransfer / Dropbox) */}
        {b.delivery_link && (
          <div id="delivery-link" className="scroll-mt-24 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 mb-6 dark:bg-emerald-500/10 dark:border-emerald-500/20">
            <h2 className="font-serif text-lg mb-1">صورك جاهزة للتحميل</h2>
            <p className="text-sm text-muted-foreground mb-3">أرسلت لكِ المصوّرة رابط تحميل الصور بجودتها الكاملة.</p>
            <a
              href={b.delivery_link}
              target="_blank"
              rel="noreferrer"
              className="inline-block bg-charcoal text-ivory px-5 py-2 rounded-sm text-sm"
            >
              تحميل الصور
            </a>
          </div>
        )}

          {/* Sneak Peek Gamification */}
          {b.sneak_peek_url && (
            <div className="rounded-sm border border-border bg-card overflow-hidden mb-6 relative">
              <div className="p-5 border-b border-border/50 bg-secondary/20 flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-[var(--gold)]" />
                <h2 className="font-serif text-lg font-bold">لمحة من صورك!</h2>
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
                      <h3 className="font-bold text-lg mb-2">الصورة مقفلة</h3>
                      <p className="text-sm text-muted-foreground mb-4">ادفعي الدفعة الأخيرة لفتح اللمحة السريعة لصورك!</p>
                    </div>
                  </div>
                )}
                {b.status === 'completed' && (
                  <div className="absolute top-4 right-4 bg-background/80 backdrop-blur-sm p-2 rounded-full animate-bounce">
                    <Unlock className="h-5 w-5 text-emerald-500" />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Booking summary */}
        <details className="group rounded-2xl border border-border bg-card mb-6 text-sm" open={!b.deposit_sent_at}>
          <summary className="flex cursor-pointer list-none items-center justify-between p-5">
            <span className="font-serif text-lg">تفاصيل الحجز</span>
            <span className="flex items-center gap-3 text-xs text-muted-foreground">
              {new Date(b.event_date).toLocaleDateString("ar-JO", { day: "numeric", month: "long" })} · {Number(b.total_price).toLocaleString("ar-JO")} د.أ
              <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
            </span>
          </summary>
          <div className="px-5 pb-5">
          <div className="grid sm:grid-cols-2 gap-3 mb-4">
            <Info label="التاريخ" v={b.event_date} />
            <Info label="الوقت" v={`${(b.start_time||"").slice(0,5)} - ${(b.end_time||"").slice(0,5)}`} />
            <Info label="الموقع" v={b.venue_address || "—"} />
            <Info label="الخدمة" v={b.service === "cinematic_video" ? "فيديو سينمائي" : "تصوير"} />
          </div>
          {Array.isArray(b.addons) && b.addons.length > 0 && (
            <div className="border-t border-border pt-3 mb-3">
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">تفاصيل الباقة</div>
              <ul className="space-y-1">
                {b.addons.map((it: any, i: number) => {
                  const qty = Number(it.qty || 1);
                  const price = Number(it.price || 0);
                  return (
                    <li key={i} className="flex justify-between">
                      <span className={it.kind === "main" ? "font-medium" : "text-muted-foreground"}>
                        {it.label}{qty > 1 ? ` × ${qty}` : ""}
                      </span>
                      {price > 0 && <span>{(price * qty).toLocaleString("ar-JO")} د.أ</span>}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          <div className="border-t border-border pt-3 grid sm:grid-cols-2 gap-3">
            <Info label="المبلغ الإجمالي" v={`${Number(b.total_price).toLocaleString("ar-JO")} د.أ`} />
            <Info label="العربون المطلوب" v={`${Number(b.deposit_amount).toLocaleString("ar-JO")} د.أ`} />
          </div>
          </div>
        </details>

        {/* Deposit step */}
        {!b.deposit_sent_at && (
          <div id="deposit-step" className="scroll-mt-24 rounded-2xl border border-gold/30 bg-gold/5 p-5 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-5 w-5 text-gold" />
              <h2 className="font-serif text-xl">إرسال العربون</h2>
            </div>
            <p className="text-sm mb-4">حوّلي مبلغ <span className="font-semibold">{Number(b.deposit_amount).toLocaleString("ar-JO")} د.أ</span> ثم ارفعي إثبات التحويل أدناه.</p>

            {payEnabled && b.status !== "cancelled" && (
              <div className="bg-card border border-emerald-200 rounded-sm p-3 mb-4">
                <div className="text-xs uppercase tracking-[0.2em] text-emerald-700 mb-2">طريقة سريعة — دفع إلكتروني</div>
                {/* Fix #1: الزر معطل بالكامل أثناء التحميل لمنع النقر المتكرر والدفع المزدوج */}
                <button
                  onClick={onPayOnline}
                  disabled={payLoading}
                  aria-disabled={payLoading}
                  className="w-full bg-emerald-600 text-white py-2.5 rounded-sm font-medium inline-flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed transition-opacity"
                >
                  {payLoading ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
                      </svg>
                      جاري التحويل لبوابة الدفع…
                    </>
                  ) : (
                    <><CreditCard className="h-4 w-4" /> ادفعي العربون أونلاين الآن</>
                  )}
                </button>
                <div className="text-[11px] text-muted-foreground mt-2 text-center">— أو استخدمي CliQ يدوياً أدناه —</div>
              </div>
            )}

            {ph.cliq_alias && (
              <div className="bg-card border border-border rounded-sm p-3 mb-3 flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">CliQ Alias</div>
                  <div className="font-mono text-lg">{ph.cliq_alias}</div>
                </div>
                <CopyButton value={ph.cliq_alias} label="نسخ" />
              </div>
            )}
            {ph.bank_info && (
              <div className="bg-card border border-border rounded-sm p-3 mb-3 whitespace-pre-line text-sm">{ph.bank_info}</div>
            )}

            <div className="grid gap-3">
              <input type="text" placeholder="رقم العملية المرجعي (مطلوب)" required value={reference}
                     onChange={(e) => setReference(e.target.value)}
                     className="border border-border rounded-sm px-3 py-2 text-sm bg-background" />
              <input type="text" placeholder="اسم صاحب الحساب الذي حوّلتِ منه (مطلوب)" required value={note}
                        onChange={(e) => setNote(e.target.value)}
                        className="border border-border rounded-sm px-3 py-2 text-sm bg-background" />
              <label className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed p-4 text-sm transition-colors ${pickedFile ? "border-gold/60 bg-card" : "border-border hover:border-gold/40"}`}>
                <input ref={fileRef} type="file" accept="image/*,application/pdf" className="sr-only"
                       onChange={(e) => setPickedFile(e.target.files?.[0] ?? null)} />
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-secondary">
                  {pickedFile ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <Paperclip className="h-5 w-5 text-muted-foreground" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium truncate">{pickedFile ? pickedFile.name : "اختاري صورة الإيصال"}</span>
                  <span className="block text-xs text-muted-foreground">{pickedFile ? `${(pickedFile.size / 1024 / 1024).toFixed(1)} ميجا — اضغطي للتغيير` : "مطلوب — صورة أو لقطة شاشة للإيصال"}</span>
                </span>
              </label>
              <button onClick={onSendDeposit} disabled={uploading}
                      className="bg-gold text-charcoal py-3 rounded-sm font-medium hover:opacity-90 disabled:opacity-60 inline-flex items-center justify-center gap-2">
                <Upload className="h-4 w-4" /> {uploading ? "جاري الإرسال…" : "تم إرسال العربون"}
              </button>

            </div>
          </div>
        )}

        {/* Client cancellation — only before confirmation */}
        {(b.status === "quote" || b.status === "pending_deposit") && (
          <div className="rounded-sm border border-border bg-card p-4 mb-6 flex items-center justify-between gap-3 text-sm">
            <div>
              <div className="font-medium">تحتاجين لإلغاء الطلب؟</div>
              <div className="text-xs text-muted-foreground">يمكن الإلغاء فقط قبل تأكيد المصوّرة للحجز.</div>
            </div>
            <button onClick={onClientCancel} className="text-destructive border border-destructive/30 px-3 py-2 rounded-sm hover:bg-destructive/10 inline-flex items-center gap-2 shrink-0">
              <XCircle className="h-4 w-4" /> إلغاء الطلب
            </button>
          </div>
        )}

        {b.status === "cancelled" && (
          <div className="rounded-sm border border-destructive/30 bg-destructive/5 p-4 mb-6 text-sm">
            <div className="font-medium text-destructive mb-1">تم إلغاء هذا الحجز</div>
            {Number(b.refund_amount || 0) > 0 && (
              <div>تمت الموافقة على استرداد {b.refund_amount} د.أ. الحالة: {b.refund_status === "pending" ? "قيد المعالجة" : b.refund_status}.</div>
            )}
          </div>
        )}



        {/* Fix #5: زر المصالحة — يظهر فقط إذا كان هناك جلسة دفع إلكتروني معلّقة */}
        {b.deposit_checkout_session_id && !b.deposit_confirmed_at && b.status !== "confirmed" && b.status !== "cancelled" && (
          <div className="rounded-sm border border-blue-200 bg-blue-50 dark:border-blue-900/40 dark:bg-blue-950/20 p-4 mb-6 text-sm">
            <div className="font-medium text-blue-800 dark:text-blue-300 mb-1 flex items-center gap-2">
              <CreditCard className="h-4 w-4" /> دفعتِ إلكترونياً ولم يُؤكَّد الحجز؟
            </div>
            <p className="text-blue-700 dark:text-blue-400 mb-3">
              أحياناً يتأخر وصول تأكيد الدفع. اضغطي الزر أدناه للتحقق التلقائي من بوابة الدفع وتحديث حالة حجزك.
            </p>
            <button
              onClick={onReconcile}
              disabled={reconcileLoading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-sm bg-blue-600 text-white text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
            >
              {reconcileLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
                  </svg>
                  جاري التحقق…
                </>
              ) : (
                "تحقق من حالة الدفع الآن"
              )}
            </button>
          </div>
        )}

        {/* Delivered → mark received */}
        {!!b.delivered_at && !b.client_received_at && (
          <div className="rounded-sm border border-emerald-200 bg-emerald-50 p-5 mb-6">
            <h2 className="font-serif text-xl mb-2">تم تسليم الصور</h2>
            <p className="text-sm mb-3">إذا استلمتِ الصور بشكل كامل، اضغطي للتأكيد.</p>
            <button onClick={onReceived} className="bg-emerald-600 text-white px-4 py-2 rounded-sm text-sm inline-flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" /> تأكيد استلام الصور
            </button>
          </div>
        )}

        {/* Completed → review link */}
        {!!b.client_received_at && (
          <div id="review-step" className="scroll-mt-24 rounded-2xl border border-gold/30 bg-gold/5 p-5 mb-6 shadow-sm">
            <h2 className="font-serif text-xl mb-2 text-gold">شكراً لثقتك! 🌟</h2>
            <p className="text-sm mb-3">يسعدنا أن تكون تجربتك رائعة.</p>
            <div className="mb-4 bg-background border border-border p-3 rounded-sm text-xs text-muted-foreground flex items-start gap-2">
              <span className="text-lg">💡</span>
              <p><strong>تلميح:</strong> دقيقة واحدة لتقييم المصورة ستصنع فارقاً حقيقياً وتساعد عشرات العرائس الأخريات في قرارهن!</p>
            </div>
            <Link to="/review/$token" params={{ token }} className="bg-charcoal text-ivory px-4 py-2 rounded-sm text-sm inline-flex items-center gap-2">
              قيّمي المصورة
            </Link>
          </div>
        )}

        {/* Notes */}
        <div className="rounded-sm border border-border bg-card p-5 mb-6">
          <h2 className="font-serif text-lg mb-3 inline-flex items-center gap-2"><MessageSquare className="h-4 w-4" /> ملاحظاتي</h2>
          {b.client_notes && (
            <div className="bg-secondary/40 rounded-sm p-3 text-sm whitespace-pre-line mb-3">{b.client_notes}</div>
          )}
          <textarea placeholder="أضيفي ملاحظة جديدة…" value={newNote} rows={3}
                    onChange={(e) => setNewNote(e.target.value)}
                    className="w-full border border-border rounded-sm px-3 py-2 text-sm bg-background" />
          <button onClick={onAddNote} disabled={!newNote.trim()}
                  className="mt-2 bg-charcoal text-ivory px-4 py-2 rounded-sm text-sm disabled:opacity-50">
            إرسال ملاحظة
          </button>
        </div>

        {/* Photographer contact */}
        <div className="rounded-sm border border-border bg-card p-5 text-sm">
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">للتواصل عند الحاجة</div>
          <div className="space-y-1">
            {ph.whatsapp && <div>واتساب: <button className="text-gold underline" onClick={async () => {
              const ok = await confirm({ title: "التحويل لواتساب", description: "سيتم نقلك لتطبيق واتساب للتواصل مع المصورة.", confirmText: "حسناً" });
              if (ok) window.open(`https://wa.me/${ph.whatsapp.replace(/[^0-9]/g,'')}`, "_blank");
            }}>{ph.whatsapp}</button></div>}
            {ph.phone && <div>هاتف: {ph.phone}</div>}
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-8">هذا الرابط خاص بكِ — احفظيه للعودة لاحقاً ولا تشاركيه حفاظاً على خصوصية صورك.</p>

        <ClientGallery token={token} />
        <ClientChat token={token} clientName={b.client_name} />
      </section>

      {/* ✅ Dialog إلغاء الطلب — بديل window.prompt يعمل في PWA وكل المتصفحات */}
      {showCancelDialog && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="cancel-dialog-title" className="bg-background border border-border rounded-xl shadow-2xl max-w-md w-full p-6">
            <h2 id="cancel-dialog-title" className="font-serif text-xl mb-2">إلغاء طلب الحجز</h2>
            <p className="text-sm text-muted-foreground mb-4">
              سيتم إلغاء طلبك نهائياً. لا يمكن الإلغاء بعد تأكيد المصوّرة للحجز.
            </p>

            {/* سياسة الاسترداد */}
            {b?.refund_policy_text && (
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-4 text-sm">
                <p className="font-medium text-amber-800 dark:text-amber-300 mb-1">سياسة استرداد العربون:</p>
                <p className="text-amber-700 dark:text-amber-400">{b.refund_policy_text}</p>
              </div>
            )}

            <label className="block text-sm font-medium mb-2">
              سبب الإلغاء <span className="text-muted-foreground">(اختياري)</span>
            </label>
            <textarea
              autoFocus
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="اكتبي سبب الإلغاء هنا…"
              rows={3}
              maxLength={2000}
              className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-destructive/30"
            />
            <p className="text-xs text-muted-foreground mt-1 mb-4">
              {cancelReason.length}/2000
            </p>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setShowCancelDialog(false); setCancelReason(""); }}
                disabled={cancelLoading}
                className="px-4 py-2 text-sm border border-border rounded-md hover:bg-muted transition-colors disabled:opacity-50"
              >
                تراجع
              </button>
              <button
                onClick={handleConfirmCancel}
                disabled={cancelLoading}
                className="px-4 py-2 text-sm bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {cancelLoading && <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {cancelLoading ? "جاري الإلغاء…" : "تأكيد الإلغاء"}
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
      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
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
  if (data?.expired) return <div className="mt-8 rounded-sm border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">انتهت صلاحية معرض الصور.</div>;
  if (!data?.gallery) return null;

  return (
    <div className="mt-8 rounded-sm border border-border bg-card p-5">
      <h2 className="font-serif text-xl mb-4 flex items-center gap-2"><ImageIcon className="h-5 w-5 text-gold" /> {data.gallery.title || "معرض الصور"}</h2>

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
              <span>صورك جاهزة للمعاينة — بعلامة مائية</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              أكملي الدفع النهائي للوصول إلى صورك الكاملة بجودة عالية وبدون علامة مائية
            </p>
          </div>
          <button
            className="shrink-0 bg-[var(--gold)] text-white text-sm font-medium
                       px-5 py-2 rounded-sm hover:opacity-90 transition-opacity
                       whitespace-nowrap"
            onClick={() => {}}
          >
            أكملي الدفع النهائي
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
            أكملي الدفع النهائي ✦
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
            🌟 صورك الكاملة بجودة عالية — يمكنك التحميل الآن
          </span>
        </motion.div>
      )}

      {data.photos.length === 0 ? (
        <p className="text-sm text-muted-foreground">لم تُرفع صور بعد. ستظهر هنا فور التسليم.</p>
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
                      toast.error("تعذّر التحميل، حاولي مرة أخرى");
                    }
                  }}
                  className="absolute bottom-1 left-1 bg-black/60 text-white p-1.5 rounded-sm opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition"
                  aria-label="تحميل"
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
  const [msgs, setMsgs] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const load = async () => {
    try { const r = await fetchM({ data: { token } }); setMsgs(r.messages); } catch {}
  };
  useEffect(() => {
    load();
    const id = setInterval(load, 45000);
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
      <h2 className="font-serif text-xl mb-4 flex items-center gap-2"><MessageSquare className="h-5 w-5 text-gold" /> المحادثة مع المصوّرة</h2>
      <div className="space-y-2 max-h-96 overflow-y-auto mb-4">
        {msgs.length === 0 && <p className="text-sm text-muted-foreground">ابدئي المحادثة بإرسال رسالة.</p>}
        {msgs.map((m) => {
          const mine = !m.sender_id; // client messages have null sender_id
          return (
            <div key={m.id} className={`p-3 rounded-sm ${mine ? "bg-charcoal text-ivory mr-8" : "bg-secondary ml-8"}`}>
              <div className="text-[10px] opacity-70 mb-1 flex items-center gap-1.5">
                <span>{mine ? clientName : (m.sender_name || "المصوّرة")} · {new Date(m.created_at).toLocaleString("ar-JO")}</span>
                {mine && (
                  <span className={m.read_at ? "text-blue-400" : "text-ivory/50"} title={m.read_at ? "مقروءة" : "مرسلة"}>✓✓</span>
                )}
              </div>
              <div className="text-sm whitespace-pre-wrap">{m.body}</div>
            </div>
          );
        })}
      </div>
      <div className="flex gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="اكتبي رسالة…" className="flex-1 border border-border rounded-sm px-3 py-2 bg-background text-sm" />
        <button onClick={send} disabled={sending || !text.trim()} className="bg-charcoal text-ivory px-4 rounded-sm inline-flex items-center gap-2 disabled:opacity-50">
          <SendIcon className="h-4 w-4" /> إرسال
        </button>
      </div>
    </div>
  );
}