import { Lightbulb } from "lucide-react";
import { motion } from "framer-motion";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { PageLoader } from "@/components/ui/loading";
import { useEffect, useState } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle2, XCircle, ScrollText, Copy, Clock, Lock, EyeOff, Eye, BadgeDollarSign, Camera, Image as ImageIcon, Edit3, Send, Upload, Trash2, ImagePlus, Star, Info } from "lucide-react";
import imageCompression from 'browser-image-compression';
import { useServerFn } from "@tanstack/react-start";
import { ensureGallery, addGalleryPhoto, deleteGalleryPhoto, updateGallery, getGalleryForPhotographer } from "@/lib/gallery.functions";
import { confirmBookingAfterDeposit, softDeleteBooking, regenerateBookingToken, uploadSneakPeek
} from "@/lib/booking.functions";
import { createContractForBooking } from "@/lib/contracts.functions";
import { cancelBooking } from "@/lib/cancellation.functions";
import { WhatsAppQuickSend } from "@/components/WhatsAppQuickSend";
import { ShotList } from "@/components/ShotList";
import { watermarkImageFile } from "@/lib/watermark";
import { useConfirm } from "@/components/ui/confirm-dialog";
// استبدال الكتابات المباشرة بـ server functions آمنة (لها audit trail + تحقق ملكية)
import {
  updateProductionStage,
  markFinalPaymentReceived,
  updateBookingStatus,
  saveBookingSelectionLink,
  saveDeliveryLink,
} from "@/lib/production.functions";
import { AlertTriangle, RefreshCcw, Home } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/bookings/$id")({ 
  component: BookingDetail,
  errorComponent: BookingDetailError,
});

function BookingDetailError({ error, reset }: any) {
  return _BookingDetailErrorBody(reset);
}

const statusLabels: Record<string, string> = {
  quote: "عرض سعر",
  pending_deposit: "بانتظار العربون",
  confirmed: "مؤكّد",
  completed: "مكتمل",
  cancelled: "ملغى",
};

function _BookingDetailErrorBody(reset: () => void) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center space-y-6">
      <div className="h-16 w-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
        <AlertTriangle className="h-8 w-8 text-red-500" />
      </div>
      <div className="space-y-2 max-w-md">
        <h1 className="font-serif text-2xl">عذراً! حدث خطأ أثناء تحميل الحجز</h1>
        <p className="text-muted-foreground text-sm">بيانات هذا الحجز قد تكون غير مكتملة أو تم حذفها.</p>
      </div>
      <button onClick={reset} className="bg-charcoal text-ivory px-6 py-2 rounded-sm hover:opacity-90 transition text-sm active:scale-95 transition-transform duration-200">
        إعادة المحاولة
      </button>
    </div>
  );
}

function BookingDetail() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const confirm = useConfirm();
  const [uid, setUid] = useState("");
  const [b, setB] = useState<any>(null);
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [contract, setContract] = useState<any>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const confirmFn = useServerFn(confirmBookingAfterDeposit);
  const softDeleteFn = useServerFn(softDeleteBooking);
  const regenTokenFn = useServerFn(regenerateBookingToken);
  const cancelFn = useServerFn(cancelBooking);
  const createContractFn = useServerFn(createContractForBooking);
  // Server functions آمنة بديلاً عن الكتابة المباشرة
  const updateStageFn = useServerFn(updateProductionStage);
  const markFinalPaidFn = useServerFn(markFinalPaymentReceived);
  const updateStatusFn = useServerFn(updateBookingStatus);
  const saveSelectionFn = useServerFn(saveBookingSelectionLink);
  const saveDeliveryFn = useServerFn(saveDeliveryLink);

  const load = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return nav({ to: "/login" });
    setUid(session.user.id);
    const [{ data: bk }, { data: m }, { data: ct }, { data: tpl }] = await Promise.all([
      supabase.from("bookings").select("id, created_at, photographer_id, client_name, client_email, client_phone, event_date, start_time, end_time, venue_address, client_notes, privacy_level, status, addons, total_price, deposit_amount, client_tracking_token, deposit_proof_url, final_paid_at, final_paid_amount, cancellation_reason, cancelled_at, deleted_at").eq("id", id).maybeSingle(),
      supabase.from("messages").select("id, created_at, booking_id, sender_id, sender_name, body, read_at").eq("booking_id", id).order("created_at"),
      supabase.from("contracts").select("id, status, sign_token").eq("booking_id", id).maybeSingle(),
      supabase.from("contract_templates").select("*").order("created_at", { ascending: false }),
    ]);
    setB(bk); setMsgs(m ?? []); setContract(ct); setTemplates(tpl ?? []);
    if (bk?.deposit_proof_url) {
      const { data } = await supabase.storage.from("deposit-proofs").createSignedUrl(bk.deposit_proof_url, 3600);
      setProofUrl(data?.signedUrl ?? null);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  // Realtime: استقبال الرسائل الجديدة فوراً + تعليم رسائلي كمقروءة
  useEffect(() => {
    if (!id || !uid) return;
    const ch = supabase.channel(`messages-${id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `booking_id=eq.${id}` },
        (payload) => setMsgs((prev) => [...prev, payload.new as any]))
      .subscribe();
    // علّمي رسائل الطرف الآخر كمقروءة
    supabase.from("messages").update({ read_at: new Date().toISOString() })
      .eq("booking_id", id).is("read_at", null).neq("sender_id", uid).then(() => {});
    return () => { supabase.removeChannel(ch); };
  }, [id, uid]);

  // ✅ آمن: server fn تتحقق من الملكية + تسجّل في audit_logs + ترسل إيميل التسليم
  const setStage = async (stage: string) => {
    if (actionLoading === "stage") return;
    setActionLoading("stage");
    try {
      await updateStageFn({ data: { booking_id: id, stage } });
      toast.success("تم تحديث المرحلة");
      load();
    } catch (e: any) {
      toast.error(e?.message || "تعذّر تحديث المرحلة");
    } finally {
      setActionLoading(null);
    }
  };

  // ✅ آمن: server fn تتحقق من الملكية + تُشعر العميل بالرابط
  
  const saveExternalDelivery = async (link: string) => {
    if (actionLoading === "link") return;
    setActionLoading("link");
    try {
      await saveDeliveryFn({ data: { booking_id: id, link } });
      toast.success("تم حفظ رابط التسليم الخارجي وإشعار العميل");
      load();
    } catch (e: any) {
      toast.error(e.message || "فشل حفظ الرابط");
    } finally {
      setActionLoading(null);
    }
  };

  const saveSelectionLink = async (link: string) => {
    if (actionLoading === "link") return;
    setActionLoading("link");
    try {
      await saveSelectionFn({ data: { booking_id: id, link } });
      toast.success("تم حفظ الرابط وإشعار العميل");
      load();
    } catch (e: any) {
      toast.error(e?.message || "تعذّر حفظ الرابط");
    } finally {
      setActionLoading(null);
    }
  };

  const setStatus = async (status: "quote" | "pending_deposit" | "confirmed" | "completed" | "cancelled") => {
    if (actionLoading === "status") return;
    setActionLoading("status");
    if (status === "confirmed") {
      // Server fn تتطلب إثبات العربون — لا تغيير
      try { await confirmFn({ data: { booking_id: id } }); }
      catch (e: any) { setActionLoading(null); return toast.error(e?.message || "تعذّر التأكيد"); }
      toast.success("تم تأكيد الحجز");
      await load();
      const { data: existing } = await supabase.from("contracts").select("id").eq("booking_id", id).maybeSingle();
      if (!existing) {
        await generateContract();
        toast.success("تم إنشاء العقد تلقائياً");
      }
      setActionLoading(null);
      return;
    }
    // ✅ آمن: server fn بدلاً من الكتابة المباشرة
    try {
      await updateStatusFn({ data: { booking_id: id, status: status as any } });
      toast.success("تم تحديث الحالة");
      await load();
    } catch (e: any) {
      toast.error(e?.message || "تعذّر تحديث الحالة");
    } finally {
      setActionLoading(null);
    }
  };

  // ✅ آمن: server fn تتحقق من الملكية + تسجّل في audit_logs
  const markFinalPaid = async () => {
    try {
      await markFinalPaidFn({ data: { booking_id: id } });
      toast.success("تم تسجيل الدفعة النهائية");
      load();
    } catch (e: any) {
      toast.error(e?.message || "تعذّر تسجيل الدفعة");
    }
  };

  // ✅ آمن: يستخدم setStage الذي يستدعي server fn
  const markDelivered = async () => {
    await setStage("delivered");
  };

  const onCancel = async () => {
    const reason = window.prompt("سبب الإلغاء (اختياري):") ?? "";
    if (!(await confirm({ title: "إلغاء الحجز", description: "سيتم إلغاء الحجز نهائياً. إذا تأكّد العربون فسيُحسب الاسترداد حسب سياستك.", confirmText: "إلغاء الحجز", destructive: true }))) return;
    try {
      const res: any = await cancelFn({ data: { booking_id: id, reason: reason || null } });
      if (Number(res?.refund_amount) > 0) {
        toast.success(`تم الإلغاء. مبلغ الاسترداد: ${res.refund_amount} د.أ — قيد المعالجة.`);
      } else {
        toast.success("تم إلغاء الحجز");
      }
      await load();
    } catch (e: any) {
      toast.error(e?.message || "تعذّر الإلغاء");
    } finally {
      setActionLoading(null);
    }
  };

  const send = async () => {
    if (!text.trim() || actionLoading === "send") return;
    const body = text.trim();
    setText("");
    setActionLoading("send");
    // Optimistic: realtime channel will reconcile, but show immediately.
    const optimistic = { id: `tmp-${Date.now()}`, sender_id: uid, sender_name: "المصوّر", body, created_at: new Date().toISOString(), read_at: null };
    setMsgs((prev) => [...prev, optimistic]);
    const { error } = await supabase.from("messages").insert({ booking_id: id, body, sender_id: uid, sender_name: "المصوّر" });
    if (error) {
      toast.error("تعذّر إرسال الرسالة");
      setMsgs((prev) => prev.filter((m) => m.id !== optimistic.id));
    }
    setActionLoading(null);
  };

  const generateContract = async (templateId?: string) => {
    if (!b || actionLoading === "contract") return;
    setActionLoading("contract");
    const tpl = templates.find((t) => t.id === templateId);
    const privacyLabels: Record<string, string> = {
      public: "عام — يحق للمصوّرة استخدام لقطات للترويج",
      no_publish: "بدون نشر علني — لا تُنشر الصور على أي وسيلة دون إذن خطي",
      private_only: "خصوصية تامة — فريق نسائي فقط، لا مشاركة مع طرف ثالث",
    };
    const baseBody = tpl?.body ?? `عقد تصوير حفل زفاف بين المصوّر/ة والعميل/ة ${b.client_name}.\n\nتاريخ الحفل: ${b.event_date}\nالمدّة: ${b.start_time?.slice(0,5)} - ${b.end_time?.slice(0,5)}\nالموقع: ${b.venue_name ?? "—"}\nالمجموع: ${b.total_price} د.أ\nالعربون (غير قابل للاسترداد): ${b.deposit_amount} د.أ\nرسوم الساعة الإضافية: ${b.overtime_fee_per_hour || 0} د.أ\nمستوى الخصوصية: ${privacyLabels[b.privacy_level || 'public']}\n\nالبنود الافتراضية:\n- تسليم الصور خلال ${b.delivery_days_promised || 30} يومًا (تاريخ التسليم المتوقع: ${b.delivery_due_at ?? '—'}).\n- إلغاء قبل أسبوعين يعفي من المتبقّي، بعدها 50%.\n- لا يحق للعميل نشر الصور الخام (RAW) أو إزالة شعار المصوّرة.`;
    const body = baseBody
      .replace(/\[اسم العميل\]/g, b.client_name)
      .replace(/\[التاريخ\]/g, b.event_date)
      .replace(/\[الموقع\]/g, b.venue_name ?? "—")
      .replace(/\[البداية\]/g, b.start_time?.slice(0,5) ?? "")
      .replace(/\[النهاية\]/g, b.end_time?.slice(0,5) ?? "")
      .replace(/\[المجموع\]/g, String(b.total_price))
      .replace(/\[العربون\]/g, String(b.deposit_amount))
      .replace(/\[رسوم الساعة الإضافية\]/g, String(b.overtime_fee_per_hour || 0))
      .replace(/\[مستوى الخصوصية\]/g, privacyLabels[b.privacy_level || 'public']);
    try {
      await createContractFn({ data: { booking_id: id, body, client_name: b.client_name } });
      toast.success("تم إنشاء العقد"); load();
    } catch (e: any) {
      toast.error(e?.message || "تعذّر إنشاء العقد");
    } finally {
      setActionLoading(null);
    }
  };

  const copyContractLink = () => {
    if (!contract) return;
    const url = `${window.location.origin}/contracts/${contract.sign_token}`;
    navigator.clipboard.writeText(url); toast.success("تم نسخ رابط العقد");
  };

  if (loading || !b) return <PageLoader />;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <section className="container-editorial py-12 max-w-4xl">
        <Link to="/dashboard/bookings" className="text-xs text-muted-foreground hover:text-gold">← الحجوزات</Link>
        <div className="mt-2 mb-2 flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-serif text-3xl">{b.client_name}</h1>
          <WhatsAppQuickSend booking={b} />
        </div>
        <div className="text-sm text-muted-foreground mb-6">{b.service === "photography" ? "تصوير فوتوغرافي" : "فيديو سينمائي"} · {new Date(b.event_date).toLocaleDateString("ar-JO")} · {b.start_time?.slice(0,5)}–{b.end_time?.slice(0,5)}</div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="rounded-sm border border-border bg-card p-6 space-y-3 text-sm">
            <h2 className="font-serif text-xl mb-2">التفاصيل</h2>
            <Row k="الهاتف" v={b.client_phone} /><Row k="البريد" v={b.client_email} />
            <Row k="الموقع" v={b.venue_name} /><Row k="العنوان" v={b.venue_address} />
            <Row k="ملاحظات العميل" v={b.client_notes} />
            <hr className="my-2 border-border" />
            <Row k="السعر الأساسي" v={`${b.base_price} د.أ`} />
            <Row k="رسوم التنقّل" v={`${b.travel_fee} د.أ`} />
            <Row k="الإجمالي" v={`${b.total_price} د.أ`} bold />
            <Row k="العربون" v={`${b.deposit_amount} د.أ`} />
            <Row k="المتبقي" v={`${(b.total_price - (b.deposit_amount || 0)).toLocaleString()} د.أ`} bold />
            {b.final_paid_at && <Row k="تم استلام المتبقي" v={new Date(b.final_paid_at).toLocaleDateString("ar-JO")} />}
            <hr className="my-2 border-border" />
            <PrivacyBadge level={b.privacy_level} />
          </div>

          <div className="rounded-sm border border-border bg-card p-6">
            <h2 className="font-serif text-xl mb-3">الحالة والإجراءات</h2>
            <div className="text-sm mb-3">الحالة الحالية: <strong>{statusLabels[b.status] ?? b.status}</strong></div>

            <DeliveryCountdown b={b} />

            {b.status === "cancelled" && (
              <div className="mb-4 rounded-sm border border-destructive/30 bg-destructive/5 p-3 text-sm">
                <div className="font-medium text-destructive mb-1">حجز ملغى</div>
                {b.cancelled_at && <div className="text-xs text-muted-foreground">تاريخ الإلغاء: {new Date(b.cancelled_at).toLocaleString("ar-JO")}</div>}
                {b.cancellation_reason && <div className="mt-1">السبب: {b.cancellation_reason}</div>}
                {Number(b.refund_amount || 0) > 0 && (
                  <div className="mt-1">استرداد: <strong>{b.refund_amount} د.أ</strong> — الحالة: {b.refund_status === "pending" ? "قيد المعالجة" : b.refund_status === "refunded" ? "تم الردّ" : b.refund_status}</div>
                )}
              </div>
            )}

            {proofUrl && (
              <div className="mb-4">
                <div className="text-xs text-muted-foreground mb-2">إثبات العربون:</div>
                <a href={proofUrl} target="_blank" rel="noreferrer" className="block">
                  <img src={proofUrl} alt="إثبات" className="w-full max-h-60 object-contain border border-border rounded-sm bg-secondary active:scale-95 transition-transform duration-200" />
                </a>
              </div>
            )}

            {b.status === "pending_deposit" && !proofUrl && b.deposit_sent_at && (
              <div className="mb-4 rounded-sm border border-amber-300/50 bg-amber-50 dark:bg-amber-950/20 p-3 text-sm">
                أشارت العميلة إلى تحويل العربون بدون إرفاق إيصال. تحقّقي من حسابك ثم أكّدي العربون.
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {b.status === "pending_deposit" && (
                <button onClick={() => setStatus("confirmed")} className="inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-sm active:scale-95 transition-transform duration-200"><CheckCircle2 className="h-4 w-4" /> تأكيد العربون</button>
              )}
              {!b.final_paid_at && b.status !== "cancelled" && (
                <button onClick={markFinalPaid} className="inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-sm active:scale-95 transition-transform duration-200"><BadgeDollarSign className="h-4 w-4" /> تسجيل استلام المتبقي</button>
              )}
              {!b.delivered_at && b.status !== "cancelled" && (
                <button onClick={markDelivered} className="inline-flex items-center gap-2 bg-charcoal text-ivory px-4 py-2 rounded-sm active:scale-95 transition-transform duration-200"><CheckCircle2 className="h-4 w-4" /> تسليم الصور وإنهاء</button>
              )}
              {/* Idea 2: WhatsApp Review Request */}
              {b.status === "completed" && (
                <button 
                  onClick={() => {
                    const text = encodeURIComponent(`مرحباً ${b.client_name} 🤍\nأتمنى أن تكون الصور قد نالت إعجابك! يسعدني جداً سماع رأيك وتقييمك لتجربتك معي عبر هذا الرابط:\n${window.location.origin}/review/${b.client_tracking_token}\n\nشكراً لكِ!`);
                    window.open(`https://wa.me/?text=${text}`, "_blank");
                  }}
                  className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-800 border border-emerald-200 px-4 py-2 rounded-sm hover:bg-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800 active:scale-95 transition-transform duration-200"
                >
                  <Star className="h-4 w-4" /> اطلبي تقييماً (واتساب)
                </button>
              )}
              {b.status !== "cancelled" && b.status !== "completed" && (
                <button onClick={onCancel} className="inline-flex items-center gap-2 text-destructive border border-destructive/30 px-4 py-2 rounded-sm hover:bg-destructive/10"><XCircle className="h-4 w-4" /> إلغاء الحجز</button>
              )}
              <button
                onClick={async () => {
                  if (!(await confirm({ title: "حذف الحجز", description: "سيتم نقله للمحذوفات. يمكن استرجاعه لاحقًا من سجل التدقيق.", confirmText: "حذف", destructive: true }))) return;
                  try { await softDeleteFn({ data: { booking_id: id } }); toast.success("تم الحذف"); nav({ to: "/dashboard/bookings" }); }
                  catch (e: any) { toast.error(e?.message || "تعذّر الحذف"); }
                }}
                className="inline-flex items-center gap-2 text-destructive border border-destructive/30 px-4 py-2 rounded-sm hover:bg-destructive/10"
              ><Trash2 className="h-4 w-4" /> حذف الحجز</button>
              <button
                onClick={async () => {
                  if (!(await confirm({ title: "تجديد رابط التتبّع", description: "سيتم إبطال الرابط الحالي وإنشاء رابط جديد.", confirmText: "تجديد" }))) return;
                  try { await regenTokenFn({ data: { booking_id: id } }); toast.success("تم تجديد الرابط"); await load(); }
                  catch (e: any) { toast.error(e?.message || "تعذّر التجديد"); }
                }}
                className="inline-flex items-center gap-2 border border-border px-4 py-2 rounded-sm hover:bg-secondary active:scale-95 transition-transform duration-200"
              ><Copy className="h-4 w-4" /> تجديد رابط التتبّع</button>
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-sm border border-border bg-card p-6">
          <h2 className="font-serif text-xl mb-3 flex items-center gap-2"><ScrollText className="h-5 w-5 text-gold" /> العقد الرقمي</h2>
          {contract ? (
            <div className="text-sm space-y-2">
              <div>الحالة: <strong>{contract.status === "signed" ? "موقّع" : "في انتظار التوقيع"}</strong></div>
              {contract.status === "signed" && (
                <div className="text-muted-foreground">وُقّع في {new Date(contract.signed_at).toLocaleString("ar")} بواسطة {contract.client_name}</div>
              )}
              <div className="flex gap-2 pt-2">
                <button onClick={copyContractLink} className="inline-flex items-center gap-2 border border-border px-3 py-2 rounded-sm hover:bg-secondary active:scale-95 transition-transform duration-200"><Copy className="h-4 w-4" /> نسخ رابط العقد</button>
                <Link to="/contracts/$token" params={{ token: contract.sign_token }} className="border border-border px-3 py-2 rounded-sm hover:bg-secondary active:scale-95 transition-transform duration-200">عرض العقد</Link>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">لم يتمّ إنشاء عقد بعد.</p>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => generateContract()} className="bg-charcoal text-ivory px-4 py-2 rounded-sm active:scale-95 transition-transform duration-200">إنشاء عقد قياسي</button>
                {templates.map((t) => (
                  <button key={t.id} onClick={() => generateContract(t.id)} className="border border-border px-4 py-2 rounded-sm hover:bg-secondary active:scale-95 transition-transform duration-200">من قالب: {t.name}</button>
                ))}
              </div>
            </div>
          )}
        </div>

        <ProductionPanel b={b} onSetStage={setStage} onSaveLink={saveSelectionLink} onSaveDeliveryLink={saveExternalDelivery} />

        <GalleryPanel bookingId={id} clientToken={b.client_tracking_token} b={b} />
        <ShotList bookingId={id} service={b.service} />

        <div className="mt-8 rounded-sm border border-border bg-card p-6">
          <h2 className="font-serif text-xl mb-4">الرسائل</h2>
          <div className="space-y-3 max-h-96 overflow-y-auto mb-4">
            {msgs.length === 0 && <p className="text-sm text-muted-foreground">لا رسائل بعد.</p>}
            {msgs.map((m) => (
              <div key={m.id} className={`p-3 rounded-sm ${m.sender_id === uid ? "bg-charcoal text-ivory mr-12" : "bg-secondary ml-12"}`}>
                <div className="text-[10px] opacity-70 mb-1 flex items-center gap-1.5">
                  <span>{m.sender_name} · {new Date(m.created_at).toLocaleString("ar-JO")}</span>
                  {m.sender_id === uid && (
                    <span className={m.read_at ? "text-blue-400" : "text-ivory/50"} title={m.read_at ? "مقروءة" : "مرسلة"}>✓✓</span>
                  )}
                </div>
                <div className="text-sm whitespace-pre-wrap">{m.body}</div>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="اكتب رسالة…" className="flex-1 border border-border rounded-sm px-3 py-2 bg-background" />
            <button onClick={send} className="bg-charcoal text-ivory px-5 rounded-sm active:scale-95 transition-transform duration-200">إرسال</button>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}

function Row({ k, v, bold }: any) {
  return <div className="flex justify-between gap-3"><span className="text-muted-foreground">{k}</span><span className={bold ? "font-semibold" : ""}>{v || "—"}</span></div>;
}

function PrivacyBadge({ level }: { level?: string }) {
  const map: Record<string, { icon: any; t: string; c: string }> = {
    public: { icon: <Eye className="h-3.5 w-3.5" />, t: "نشر ترويجي كامل", c: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20" },
    no_publish: { icon: <EyeOff className="h-3.5 w-3.5" />, t: "حفظ بدون نشر", c: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20" },
    private_only: { icon: <Lock className="h-3.5 w-3.5" />, t: "خصوصية تامة - لقطات نسائية", c: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20" },
  };
  const x = map[level ?? "public"] ?? map.public;
  return <div className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-sm border ${x.c}`}>{x.icon} {x.t}</div>;
}

const STAGES: { key: string; label: string; icon: any }[] = [
  { key: "awaiting", label: "بانتظار الجلسة", icon: <Clock className="h-3.5 w-3.5" /> },
  { key: "shooting", label: "يوم التصوير", icon: <Camera className="h-3.5 w-3.5" /> },
  { key: "selecting", label: "اختيار الصور", icon: <ImageIcon className="h-3.5 w-3.5" /> },
  { key: "editing", label: "قيد التحرير", icon: <Edit3 className="h-3.5 w-3.5" /> },
  { key: "ready", label: "جاهز للتسليم", icon: <Send className="h-3.5 w-3.5" /> },
  { key: "delivered", label: "تم التسليم", icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
];

function ProductionPanel({ b, onSetStage, onSaveLink, onSaveDeliveryLink }: { b: any; onSetStage: (s: string) => void; onSaveLink: (l: string) => void; onSaveDeliveryLink: (l: string) => void }) {
  const [link, setLink] = useState(b.selection_link ?? "");
    const [dLink, setDLink] = useState(b.delivery_link ?? "");
  const current = b.production_stage || "awaiting";
  const idx = STAGES.findIndex((s) => s.key === current);
  const progress = ((idx + 1) / STAGES.length) * 100;
  return (
    <div className="mt-8 rounded-sm border border-border bg-card p-6">
      <h2 className="font-serif text-xl mb-4">متابعة الإنتاج</h2>
      <div className="h-2 w-full bg-secondary rounded-full overflow-hidden mb-4 active:scale-95 transition-transform duration-200">
        <div className="h-full bg-gold transition-all" style={{ width: `${progress}%` }} />
      </div>
      <div className="flex flex-wrap gap-2 mb-4">
        {STAGES.map((s) => (
          <button key={s.key} onClick={() => onSetStage(s.key)}
            className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-sm border transition ${current === s.key ? "bg-charcoal text-ivory border-charcoal" : "border-border hover:bg-secondary"}`}>
            {s.icon}{s.label}
          </button>
        ))}
      </div>
      <div>
        <label className="text-xs text-muted-foreground">رابط معرض اختيار الصور (Pixieset / Drive)</label>
        <div className="flex gap-2 mt-1">
          <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://…" className="flex-1 border border-border rounded-sm px-3 py-2 bg-background text-sm" />
          <button onClick={() => onSaveLink(link)} className="border border-border px-4 py-2 rounded-sm hover:bg-secondary text-sm active:scale-95 transition-transform duration-200">حفظ</button>
        </div>
        {b.selection_link && (
          <a href={b.selection_link} target="_blank" rel="noreferrer" className="text-xs text-gold underline mt-1 inline-block">فتح المعرض الحالي</a>
        )}
      </div>

      <div className="mt-5 pt-5 border-t border-border">
        <label className="text-xs text-muted-foreground">رابط تسليم الصور النهائية (Google Drive / WeTransfer / Dropbox)</label>
        <div className="flex gap-2 mt-1">
          <input value={dLink} onChange={(e) => setDLink(e.target.value)} placeholder="https://drive.google.com/…" className="flex-1 border border-border rounded-sm px-3 py-2 bg-background text-sm" />
          <button onClick={() => onSaveDeliveryLink(dLink)} className="bg-charcoal text-ivory px-4 py-2 rounded-sm text-sm active:scale-95 transition-transform duration-200">حفظ وإرسال</button>
        </div>
        <p className="text-[11px] text-muted-foreground mt-1.5">
          يظهر للعميلة في صفحة التتبّع كزر «تحميل الصور». استخدمي هذا للتسليم الكامل (مجاناً من حسابك) بدل رفع آلاف الصور على المنصّة — معرض المعاينة هنا يبقى للصور المختارة فقط.
        </p>
        {b.delivery_link && (
          <a href={b.delivery_link} target="_blank" rel="noreferrer" className="text-xs text-gold underline mt-1 inline-block">فتح رابط التسليم الحالي</a>
        )}
      </div>
    </div>
  );
}

function DeliveryCountdown({ b }: { b: any }) {
  if (b.delivered_at) {
    return (
      <div className="mb-4 rounded-sm border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20 flex items-center gap-2 active:scale-95 transition-transform duration-200">
        <CheckCircle2 className="h-4 w-4" /> سُلِّمت الصور في {new Date(b.delivered_at).toLocaleDateString("ar-JO")}
      </div>
    );
  }
  if (!b.delivery_due_at) return null;
  const due = new Date(b.delivery_due_at);
  const days = Math.ceil((due.getTime() - Date.now()) / 86400000);
  const overdue = days < 0;
  return (
    <div className={`mb-4 rounded-sm border p-3 text-sm flex items-center gap-2 ${overdue ? "border-destructive/40 bg-destructive/10 text-destructive" : days <= 7 ? "border-amber-200 bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20" : "border-border bg-secondary/40"}`}>
      <Clock className="h-4 w-4" />
      {overdue
        ? <span>متأخّر <strong>{Math.abs(days)}</strong> يومًا عن موعد التسليم ({due.toLocaleDateString("ar-JO")})</span>
        : <span>الوقت المتبقي لتسليم الصور: <strong>{days}</strong> يومًا (حتى {due.toLocaleDateString("ar-JO")})</span>}
    </div>
  );
}

function GalleryPanel({ bookingId, clientToken, b }: { bookingId: string; clientToken: string | null; b: any }) {
  const ensure = useServerFn(ensureGallery);
  const fetchG = useServerFn(getGalleryForPhotographer);
  const add = useServerFn(addGalleryPhoto);
  const del = useServerFn(deleteGalleryPhoto);
  const upd = useServerFn(updateGallery);
  const confirm = useConfirm();
  const [gallery, setGallery] = useState<any>(null);
  const [photos, setPhotos] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [watermarkOn, setWatermarkOn] = useState(true);
  const [watermarkText, setWatermarkText] = useState("");

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase.from("profiles").select("display_name,username").eq("id", session.user.id).maybeSingle();
      const dn = (data?.display_name as string | undefined) || (data?.username as string | undefined) || "";
      if (dn) setWatermarkText(`© ${dn}`);
    })();
  }, []);

  const load = async () => {
    const r = await fetchG({ data: { booking_id: bookingId } });
    setGallery(r.gallery); setPhotos(r.photos);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [bookingId]);

  const create = async () => {
    setBusy(true);
    try { await ensure({ data: { booking_id: bookingId } }); await load(); toast.success("تم إنشاء معرض التسليم"); }
    catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // onPick — نظام الرفع الثنائي الحالة (Dual-State Upload)
  // ─────────────────────────────────────────────────────────────────────────
  // عند تفعيل العلامة المائية:
  //   1. يرفع النسخة الأصلية النظيفة إلى مجلد originals/ (محمية بـ RLS)
  //   2. يرفع النسخة بالعلامة المائية  إلى مجلد previews/ (تُعرض للعروس قبل الدفع النهائي)
  //   3. يُسجَّل مسار previews/ في delivery_photos — getGalleryByToken يتولى
  //      التبديل إلى originals/ تلقائياً بعد اكتمال الدفع.
  //
  // بدون العلامة المائية: رفع مباشر في المجلد الجذر (السلوك القديم — غير موصى به).
  // ─────────────────────────────────────────────────────────────────────────
  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length || !gallery) return;
    
    if (files.length > 30) {
      toast.error("معرض المعاينة يقبل حتى 30 صورة في المرة. للتسليم الكامل استخدمي رابط التسليم الخارجي (Drive / WeTransfer).");
      return;
    }
    const invalidTypes = files.filter(f => !f.type.startsWith("image/"));
    if (invalidTypes.length > 0) {
      toast.error("يرجى اختيار ملفات صور فقط.");
      return;
    }

    setUploading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("جلسة منتهية");
      const uid = session.user.id;

      for (const rawFile of files) {
        if (rawFile.size > 25 * 1024 * 1024) { toast.error(`${rawFile.name}: أكبر من 25MB`); continue; }

        let f = rawFile;
        // Compression to prevent massive files from exhausting storage
        if (rawFile.type.startsWith('image/') && rawFile.type !== 'image/gif' && rawFile.type !== 'image/svg+xml') {
          try {
            f = await imageCompression(rawFile, {
              maxSizeMB: 0.5,
              maxWidthOrHeight: 2048,
              useWebWorker: true,
              fileType: rawFile.type === 'image/png' ? 'image/png' : 'image/jpeg',
            });
          } catch (e) {
            console.warn("Gallery image compression failed:", e);
          }
        }

        const fileId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const ext = f.type === "image/png" ? "png" : (f.type === "image/jpeg" ? "jpg" : (f.name.split(".").pop()?.toLowerCase() || "jpg"));
        const isImage = f.type.startsWith("image/");

        if (watermarkOn && watermarkText.trim() && isImage) {
          // ── نظام الرفع الثنائي ──────────────────────────────────────────
          // 1) رفع الأصل النظيف في originals/ (لكن بعد ضغطه لتخفيف الحمل)
          const originalPath = `${uid}/${gallery.id}/originals/${fileId}.${ext}`;
          const { error: origErr } = await supabase.storage
            .from("delivery-photos")
            .upload(originalPath, f, { contentType: f.type });
          if (origErr) { toast.error(`${f.name}: ${origErr.message}`); continue; }

          // 2) تطبيق العلامة المائية ورفع النسخة المحمية في previews/
          let watermarked: File = f;
          try {
            watermarked = await watermarkImageFile(f, { text: watermarkText.trim(), mode: "tile" });
          } catch (wErr) {
            console.warn("watermark failed — uploading original as preview", wErr);
          }
          const previewExt = watermarked.type === "image/jpeg" ? "jpg" : ext;
          const previewPath = `${uid}/${gallery.id}/previews/${fileId}.${previewExt}`;
          const { error: previewErr } = await supabase.storage
            .from("delivery-photos")
            .upload(previewPath, watermarked, { contentType: watermarked.type });
          if (previewErr) {
            // الأصل مرفوع بنجاح؛ سجّل مسار الأصل كبديل إن فشل المعاينة
            toast.error(`${f.name} (معاينة): ${previewErr.message}`);
            await add({ data: { gallery_id: gallery.id, storage_path: originalPath } });
            continue;
          }

          // 3) تسجيل مسار النسخة المحمية (previews/) في delivery_photos
          //    getGalleryByToken سيتولى التبديل إلى originals/ تلقائياً بعد الدفع
          await add({ data: { gallery_id: gallery.id, storage_path: previewPath } });

        } else {
          // ── رفع مباشر (بدون علامة مائية) ────────────────────────────────
          const path = `${uid}/${gallery.id}/${fileId}.${ext}`;
          const { error: upErr } = await supabase.storage
            .from("delivery-photos")
            .upload(path, f, { contentType: f.type });
          if (upErr) { toast.error(`${f.name}: ${upErr.message}`); continue; }
          await add({ data: { gallery_id: gallery.id, storage_path: path } });
        }
      }

      await load();
      toast.success("تم رفع الصور");
      e.target.value = "";
    } catch (e: any) { toast.error(e.message); }
    finally { setUploading(false); }
  };

  const remove = async (id: string) => {
    if (!(await confirm({ title: "حذف هذه الصورة؟", confirmText: "حذف", destructive: true }))) return;
    try { await del({ data: { photo_id: id } }); await load(); }
    catch (e: any) { toast.error(e.message); }
  };

  const toggleDownloads = async () => {
    if (!gallery) return;
    try { await upd({ data: { gallery_id: gallery.id, allow_downloads: !gallery.allow_downloads } }); await load(); }
    catch (e: any) { toast.error(e.message); }
  };

  const copyClientLink = () => {
    if (!clientToken) return;
    const url = `${window.location.origin}/track/${clientToken}`;
    navigator.clipboard.writeText(url); toast.success("تم نسخ رابط العميل");
  };

  return (
    <div className="mt-8 rounded-sm border border-border bg-card p-6">
      <h2 className="font-serif text-xl mb-4 flex items-center gap-2"><ImagePlus className="h-5 w-5 text-gold" /> معرض التسليم الخاص</h2>
      {!gallery ? (
        <div>
          <p className="text-sm text-muted-foreground mb-3">أنشئي معرضاً خاصاً يصل إليه العميل من رابط التتبع لمعاينة وتحميل الصور المسلَّمة.</p>
          <button onClick={create} disabled={busy} className="bg-charcoal text-ivory px-4 py-2 rounded-sm disabled:opacity-60 active:scale-95 transition-transform duration-200">إنشاء معرض</button>
        </div>
      ) : (
        <div>
          {b.status === "completed" && photos.length === 0 && (
            <div className="mb-4 text-xs text-sky-800 bg-sky-50 border border-sky-200 p-2.5 rounded-sm flex items-start gap-2">
              <span className="text-base leading-none mt-0.5">💡</span>
              <span><strong>تلميح:</strong> الحجز مكتمل ولكن المعرض فارغ! العروس بانتظار الصور بفارغ الصبر. ارفعي دفعة أولية لتشويقها.</span>
            </div>
          )}
          <div className="mb-4 text-xs text-indigo-800 bg-indigo-50 border border-indigo-200 p-2.5 rounded-sm flex items-start gap-2">
            <Info className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              <strong>للتسليم النهائي (حجم كامل):</strong> يُفضل استخدام روابط Google Drive أو WeTransfer ووضعها في خانة "رابط تسليم الصور" أعلاه. معرض الصور هنا مخصص للمعاينة (الصور تُضغط تلقائياً لتسريع التصفح).
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <label className="inline-flex items-center gap-2 border border-border px-3 py-2 rounded-sm cursor-pointer hover:bg-secondary text-sm active:scale-95 transition-transform duration-200">
              <Upload className="h-4 w-4" />
              <span>{uploading ? "جاري الرفع…" : "رفع صور"}</span>
              <input type="file" multiple accept="image/*" className="hidden" onChange={onPick} disabled={uploading} />
            </label>
            <button onClick={toggleDownloads} className="text-sm border border-border px-3 py-2 rounded-sm hover:bg-secondary active:scale-95 transition-transform duration-200">
              التحميل: {gallery.allow_downloads ? "مسموح" : "ممنوع"}
            </button>
            <button onClick={copyClientLink} className="inline-flex items-center gap-2 text-sm border border-border px-3 py-2 rounded-sm hover:bg-secondary active:scale-95 transition-transform duration-200">
              <Copy className="h-4 w-4" /> رابط العميل
            </button>
            <span className="text-xs text-muted-foreground">{photos.length} صورة</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 mb-4 p-3 rounded-sm bg-secondary/30 border border-border active:scale-95 transition-transform duration-200">
            <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={watermarkOn} onChange={(e) => setWatermarkOn(e.target.checked)} />
              <span>علامة مائية تلقائية</span>
            </label>
            <input
              type="text"
              value={watermarkText}
              onChange={(e) => setWatermarkText(e.target.value)}
              placeholder="© اسم المصوّرة"
              maxLength={80}
              disabled={!watermarkOn}
              className="flex-1 min-w-[180px] border border-input bg-background px-3 py-1.5 rounded-sm text-sm disabled:opacity-50"
            />
            <span className="text-xs text-muted-foreground">تُطبَّق على الصور قبل الرفع (مظهر قُطري شفاف).</span>
          </div>
          {photos.length === 0 ? (
            <p className="text-sm text-muted-foreground">لم تُرفع صور بعد.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {photos.map((p) => (
                <div key={p.id} className="relative group aspect-square bg-secondary rounded-sm overflow-hidden active:scale-95 transition-transform duration-200">
                  {p.url && <img src={p.url} alt={p.caption ?? ""} className="w-full h-full object-cover" />}
                  <button onClick={() => remove(p.id)} className="absolute top-1 left-1 bg-black/60 text-white p-1 rounded-sm opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
