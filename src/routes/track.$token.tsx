import { createFileRoute, useParams } from "@tanstack/react-router";
import { PageLoader } from "@/components/ui/loading";
import { useEffect, useRef, useState, useCallback } from "react";
import { Header } from "@/components/site/Header";
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

import { AlertTriangle, RefreshCcw, Home } from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/track/$token")({
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

const BOOKING_STEPS = [
  { key: "pending_deposit", label: "في انتظار العربون" },
  { key: "confirmed",       label: "تم التأكيد" },
  { key: "shooting",        label: "يوم التصوير" },
  { key: "completed",       label: "اكتمل الحجز" },
];

function BookingTimeline({ status }: { status: string }) {
  const currentIdx = BOOKING_STEPS.findIndex((s) => s.key === status);
  return (
    <div className="my-6">
      <h3 className="text-sm font-medium text-muted-foreground mb-4">مراحل الحجز</h3>
      <div className="relative">
        <div className="absolute top-3 start-3 end-3 h-px bg-border" />
        <div className="flex justify-between relative">
          {BOOKING_STEPS.map((step, i) => {
            const done = i < currentIdx;
            const active = i === currentIdx;
            const future = i > currentIdx;
            return (
              <div key={step.key} className="flex flex-col items-center gap-2">
                <div className={`h-6 w-6 rounded-full flex items-center justify-center z-10 ${
                  done ? "bg-[var(--gold)] text-white" : active ? "bg-[var(--gold)] text-white ring-4 ring-[var(--gold)]/20" : "bg-background border-2 border-border"
                }`}>
                  {done ? (<CheckCircle2 className="h-3.5 w-3.5" />) : active ? (<div className="h-2 w-2 rounded-full bg-white animate-pulse" />) : (<div className="h-2 w-2 rounded-full bg-border" />)}
                </div>
                <span className={`text-[10px] text-center max-w-[60px] leading-tight ${
                  active ? "text-[var(--gold)] font-medium" : future ? "text-muted-foreground" : "text-foreground"
                }`}>{step.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

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
    } catch (e: any) { toast.error(e.message); }
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
      toast.error("الرجاء اختيار صورة إيصال التحويل أولاً، أو استخدمي زر «حوّلت بدون إيصال».", { id: "upload-receipt" });
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
            maxSizeMB: 1.2,
            maxWidthOrHeight: 2400,
            useWebWorker: true,
            fileType: 'image/jpeg',
          });
        } catch (err) {
          console.warn('receipt compression failed, uploading original', err);
        }
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
      await sendDeposit({ data: { token, proof_path: path, reference: reference || null, note: note || null } });
      toast.success("تم إرسال الإيصال بنجاح. سنقوم بتأكيد الحجز قريباً.", { id: "upload-receipt" });
      setReference(""); setNote("");
      if (fileRef.current) fileRef.current.value = "";
      load();
    } catch (e: any) {
      toast.error(e.message || "حدث خطأ أثناء رفع الملف", { id: "upload-receipt" });
    } finally {
      setUploading(false);
    }
  };

  // بعض العميلات يحوّلن عبر CliQ من تطبيق البنك بدون حفظ إيصال —
  // نسمح بإبلاغ المصوّرة بدون مرفق بدل أن يعلق الزر بلا استجابة.
  const onSendDepositWithoutProof = async () => {
    setUploading(true);
    try {
      await sendDeposit({ data: { token, proof_path: null, reference: reference || null, note: note || null } });
      toast.success("أبلغنا المصوّرة بالتحويل. قد تطلب منكِ الإيصال للتأكيد.");
      setReference(""); setNote("");
      load();
    } catch (e: any) {
      toast.error(e.message || "تعذّر إرسال الإشعار");
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

        <div className="rounded-sm border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30 p-3 mb-6 flex gap-3 text-amber-900 dark:text-amber-200">
          <Clock className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="text-sm leading-relaxed">
            <strong>تنبيه الخصوصية:</strong> هذا الرابط مخصص لكِ فقط لإدارة حجزكِ ومرفقاتكِ. يرجى عدم مشاركته مع الآخرين حفاظاً على خصوصية بياناتك ومعرض صورك لاحقاً.
          </div>
        </div>

        {b.event_date && new Date(b.event_date).getTime() > Date.now() && (
          <div className="mb-6 bg-gradient-to-r from-gold/20 via-gold/5 to-transparent border-r-4 border-gold p-4 rounded-s-sm flex items-center justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-gold mb-1">العد التنازلي للزفاف</div>
              <div className="text-sm text-foreground">بقي <strong>{Math.ceil((new Date(b.event_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))}</strong> يوم على فرحتك الكبرى! 🤍</div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════
            مؤشر تقدم الحجز البصري (Fix #2)
            يُظهر المرحلة الحالية بوضوح تام للعميل
        ══════════════════════════════════════════ */}
        <BookingTimeline status={b.status} />

        {/* رابط تسليم الصور الخارجي (Drive / WeTransfer / Dropbox) */}
        {b.delivery_link && (
          <div className="rounded-sm border border-emerald-200 bg-emerald-50 p-5 mb-6 dark:bg-emerald-500/10 dark:border-emerald-500/20">
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

        {/* Timeline — تفاصيل المراحل */}
        <div className="rounded-sm border border-border bg-card p-5 mb-6">
          <h2 className="font-serif text-lg mb-4">حالة الحجز</h2>
          <ol className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {stages.map((s) => (
              <li key={s.key} className={`rounded-sm border p-3 text-center ${s.done ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-border bg-secondary/30 text-muted-foreground"}`}>
                <div className="flex justify-center mb-1">{s.icon}</div>
                <div className="text-xs">{s.label}</div>
              </li>
            ))}
          </ol>
        </div>

        
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

          {/* Add to Calendar */}
          {(b.status === 'confirmed' || b.status === 'completed') && (
            <div className="flex justify-center mb-6">
              <button onClick={addToCalendar} className="flex items-center gap-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 px-6 py-3 rounded-full font-medium transition-colors shadow-soft">
                <CalendarPlus className="h-5 w-5" />
                أضيفي الموعد لتقويمك (Google Calendar)
              </button>
            </div>
          )}

          {/* Booking summary */}
        <div className="rounded-sm border border-border bg-card p-5 mb-6 text-sm">
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

        {/* Deposit step */}
        {!b.deposit_sent_at && (
          <div className="rounded-sm border border-gold/30 bg-gold/5 p-5 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-5 w-5 text-gold" />
              <h2 className="font-serif text-xl">الخطوة التالية: إرسال العربون</h2>
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
                <button onClick={() => { navigator.clipboard.writeText(ph.cliq_alias); toast.success("تم النسخ"); }}
                        className="p-2 hover:bg-secondary rounded-sm"><Copy className="h-4 w-4" /></button>
              </div>
            )}
            {ph.bank_info && (
              <div className="bg-card border border-border rounded-sm p-3 mb-3 whitespace-pre-line text-sm">{ph.bank_info}</div>
            )}

            <div className="grid gap-3">
              <input type="text" placeholder="رقم العملية المرجعي (اختياري)" value={reference}
                     onChange={(e) => setReference(e.target.value)}
                     className="border border-border rounded-sm px-3 py-2 text-sm bg-background" />
              <textarea placeholder="ملاحظة للمصورة (اختياري)" value={note} rows={2}
                        onChange={(e) => setNote(e.target.value)}
                        className="border border-border rounded-sm px-3 py-2 text-sm bg-background" />
              <input ref={fileRef} type="file" accept="image/*,application/pdf"
                     className="text-sm" />
              <button onClick={onSendDeposit} disabled={uploading}
                      className="bg-gold text-charcoal py-3 rounded-sm font-medium hover:opacity-90 disabled:opacity-60 inline-flex items-center justify-center gap-2">
                <Upload className="h-4 w-4" /> {uploading ? "جاري الإرسال…" : "تم إرسال العربون"}
              </button>
              <button onClick={onSendDepositWithoutProof} disabled={uploading}
                      className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground disabled:opacity-60">
                حوّلت بدون إيصال — أبلغي المصوّرة فقط
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

        {b.deposit_sent_at && !b.deposit_confirmed_at && (
          <div className="rounded-sm border border-amber-200 bg-amber-50 p-4 mb-6 text-sm text-amber-900">
            تم استلام إشعار العربون. بانتظار تأكيد المصورة.
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
          <div className="rounded-sm border border-gold/30 bg-gold/5 p-5 mb-6 shadow-sm">
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

        <p className="text-center text-xs text-muted-foreground mt-8">احفظي هذا الرابط للوصول لاحقًا لتتبع حجزك.</p>

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