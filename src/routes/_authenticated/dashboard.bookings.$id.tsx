import { motion, AnimatePresence } from "framer-motion";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { PageLoader } from "@/components/ui/loading";
import { useEffect, useMemo, useRef, useState } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle2, XCircle, ScrollText, Copy, Clock, Lock, EyeOff, Eye, BadgeDollarSign, Camera, Image as ImageIcon, Edit3, Send, Upload, Trash2, ImagePlus, Star, Info, MoreHorizontal, ArrowLeft, ArrowRight, MessageSquare, ListChecks, LayoutGrid, Lightbulb, X } from "lucide-react";
import imageCompression from 'browser-image-compression';
import { useServerFn } from "@tanstack/react-start";
import { ensureGallery, addGalleryPhoto, deleteGalleryPhoto, updateGallery, getGalleryForPhotographer } from "@/lib/gallery.functions";
import { confirmBookingAfterDeposit, softDeleteBooking, regenerateBookingToken
} from "@/lib/booking.functions";
import { createContractForBooking } from "@/lib/contracts.functions";
import { cancelBooking } from "@/lib/cancellation.functions";
import { WhatsAppQuickSend } from "@/components/WhatsAppQuickSend";
import { ShotList } from "@/components/ShotList";
import { watermarkImageFile } from "@/lib/watermark";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { CopyButton } from "@/components/ui/copy-button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { hapticVibrate } from "@/lib/utils";
import { daysFromToday, relativeDay, ageLabel } from "@/components/dashboard/focus";
// استبدال الكتابات المباشرة بـ server functions آمنة (لها audit trail + تحقق ملكية)
import {
  updateProductionStage,
  markFinalPaymentReceived,
  updateBookingStatus,
  saveBookingSelectionLink,
  saveDeliveryLink,
} from "@/lib/production.functions";
import { AlertTriangle } from "lucide-react";

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

const statusTone: Record<string, string> = {
  quote: "bg-secondary text-muted-foreground",
  pending_deposit: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  confirmed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  completed: "bg-gold/15 text-gold",
  cancelled: "bg-destructive/10 text-destructive",
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

type TabKey = "overview" | "chat" | "production" | "gallery";

function normalizeWa(phone?: string | null) {
  if (!phone) return "";
  let p = phone.replace(/[^\d]/g, "");
  if (p.startsWith("00")) p = p.slice(2);
  if (p.startsWith("0")) p = "962" + p.slice(1);
  return p;
}

function BookingDetail() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const confirm = useConfirm();
  const [uid, setUid] = useState("");
  const [b, setB] = useState<any>(null);
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [proofOpen, setProofOpen] = useState(false);
  const [msgs, setMsgs] = useState<any[]>([]);
  const [unread, setUnread] = useState(0);
  const draftKey = `memoria:draft:${id}`;
  const [text, setText] = useState(() => {
    try { return typeof window !== "undefined" ? localStorage.getItem(`memoria:draft:${id}`) ?? "" : ""; } catch { return ""; }
  });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [contract, setContract] = useState<any>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [tab, setTab] = useState<TabKey>("overview");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [dismissedHints, setDismissedHints] = useState<string[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
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
      supabase.from("bookings").select("id, created_at, photographer_id, client_name, client_email, client_phone, event_date, start_time, end_time, venue_name, venue_address, client_notes, privacy_level, status, service, addons, base_price, travel_fee, total_price, deposit_amount, overtime_fee_per_hour, delivery_days_promised, delivery_due_at, delivered_at, production_stage, selection_link, delivery_link, client_tracking_token, deposit_proof_url, deposit_sent_at, final_paid_at, final_paid_amount, refund_amount, refund_status, cancellation_reason, cancelled_at, deleted_at").eq("id", id).maybeSingle(),
      supabase.from("messages").select("id, created_at, booking_id, sender_id, sender_name, body, read_at").eq("booking_id", id).order("created_at"),
      supabase.from("contracts").select("id, status, sign_token, signed_at, client_name").eq("booking_id", id).maybeSingle(),
      supabase.from("contract_templates").select("*").order("created_at", { ascending: false }),
    ]);
    setB(bk); setMsgs(m ?? []); setContract(ct); setTemplates(tpl ?? []);
    if (bk) {
      try { localStorage.setItem("memoria:last-booking", JSON.stringify({ id: bk.id, name: bk.client_name })); } catch { /* ignore */ }
    }
    setUnread((m ?? []).filter((x: any) => x.sender_id !== session.user.id && !x.read_at).length);
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
        (payload) => setMsgs((prev) => {
          const n = payload.new as any;
          // استبدال الرسالة المتفائلة بالحقيقية بدل تكرارها
          const withoutTmp = prev.filter((x) => !(String(x.id).startsWith("tmp-") && x.body === n.body && x.sender_id === n.sender_id));
          return withoutTmp.some((x) => x.id === n.id) ? withoutTmp : [...withoutTmp, n];
        }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id, uid]);

  // تعليم رسائل الطرف الآخر كمقروءة عند فتح تبويب المحادثة
  useEffect(() => {
    if (tab !== "chat" || !uid) return;
    setUnread(0);
    supabase.from("messages").update({ read_at: new Date().toISOString() })
      .eq("booking_id", id).is("read_at", null).neq("sender_id", uid).then(() => {});
    requestAnimationFrame(() => chatEndRef.current?.scrollIntoView({ block: "end" }));
  }, [tab, uid, id]);

  useEffect(() => {
    if (tab === "chat") chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs.length]);

  // حفظ مسودة الرسالة تلقائياً
  useEffect(() => {
    try { text ? localStorage.setItem(draftKey, text) : localStorage.removeItem(draftKey); } catch { /* ignore */ }
  }, [text, draftKey]);

  // ✅ آمن: server fn تتحقق من الملكية + تسجّل في audit_logs + ترسل إيميل التسليم
  const setStage = async (stage: string) => {
    if (actionLoading === "stage") return;
    setActionLoading("stage");
    const prev = b?.production_stage;
    setB((x: any) => ({ ...x, production_stage: stage })); // تحديث متفائل
    try {
      await updateStageFn({ data: { booking_id: id, stage } });
      hapticVibrate("success");
      toast.success(`المرحلة الآن: ${STAGES.find((s) => s.key === stage)?.label ?? stage}`);
      load();
    } catch (e: any) {
      setB((x: any) => ({ ...x, production_stage: prev }));
      hapticVibrate("error");
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
      toast.success("حُفظ رابط التسليم ووصل إشعار للعميلة");
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
      toast.success("حُفظ الرابط ووصل إشعار للعميلة");
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
      catch (e: any) { setActionLoading(null); hapticVibrate("error"); return toast.error(e?.message || "تعذّر التأكيد"); }
      hapticVibrate("success");
      toast.success("تأكّد الحجز ووصل إشعار للعميلة");
      await load();
      const { data: existing } = await supabase.from("contracts").select("id").eq("booking_id", id).maybeSingle();
      if (!existing) {
        await generateContract();
        toast.success("أنشأنا العقد تلقائياً");
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
    if (actionLoading === "final") return;
    setActionLoading("final");
    try {
      await markFinalPaidFn({ data: { booking_id: id } });
      hapticVibrate("success");
      toast.success("سُجّلت الدفعة النهائية — الصور الكاملة متاحة للعميلة الآن");
      load();
    } catch (e: any) {
      toast.error(e?.message || "تعذّر تسجيل الدفعة");
    } finally {
      setActionLoading(null);
    }
  };

  const markDelivered = async () => {
    if (!(await confirm({ title: "تسليم الصور وإنهاء الحجز", description: "ستصل للعميلة رسالة بأن صورها جاهزة مع طلب تقييم.", confirmText: "سلّمي الصور" }))) return;
    await setStage("delivered");
  };

  const doCancel = async () => {
    setCancelOpen(false);
    setActionLoading("cancel");
    try {
      const res: any = await cancelFn({ data: { booking_id: id, reason: cancelReason.trim() || null } });
      if (Number(res?.refund_amount) > 0) {
        toast.success(`أُلغي الحجز. مبلغ الاسترداد ${res.refund_amount} د.أ قيد المعالجة.`);
      } else {
        toast.success("أُلغي الحجز");
      }
      setCancelReason("");
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
      toast.error("لم تُرسل الرسالة — أعدنا النص إلى الحقل");
      setMsgs((prev) => prev.filter((m) => m.id !== optimistic.id));
      setText(body);
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
      toast.success("أُنشئ العقد"); load();
    } catch (e: any) {
      toast.error(e?.message || "تعذّر إنشاء العقد");
    } finally {
      setActionLoading(null);
    }
  };

  const openWhatsApp = (message: string) => {
    const phone = normalizeWa(b?.client_phone);
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank");
  };

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const trackUrl = b?.client_tracking_token ? `${origin}/track/${b.client_tracking_token}` : "";

  // ── الخطوة التالية: إجراء واحد واضح حسب حالة الحجز ──
  const next = useMemo(() => {
    if (!b) return null;
    const stage = b.production_stage || "awaiting";
    const eventIn = b.event_date ? daysFromToday(b.event_date) : null;
    if (b.status === "cancelled") return null;
    if (b.status === "pending_deposit" && (b.deposit_proof_url || b.deposit_sent_at)) {
      return { title: "العربون وصل — راجعيه وأكّدي", detail: `المبلغ المتوقّع ${b.deposit_amount} د.أ`, cta: "تأكيد العربون", icon: <CheckCircle2 className="h-4 w-4" />, run: () => setStatus("confirmed"), busy: actionLoading === "status" };
    }
    if (b.status === "quote" || b.status === "pending_deposit") {
      return { title: "بانتظار العربون من العميلة", detail: `الطلب وصل ${ageLabel(b.created_at)}`, cta: "ذكّريها بواتساب", icon: <MessageSquare className="h-4 w-4" />, run: () => openWhatsApp(`مرحباً ${b.client_name} 🤍\nلتثبيت موعدك بتاريخ ${new Date(b.event_date).toLocaleDateString("ar-JO")} يرجى إرسال العربون (${b.deposit_amount} د.أ) ورفع الإثبات من هنا:\n${trackUrl}`) };
    }
    if (stage !== "delivered" && eventIn !== null && eventIn >= 0) {
      return { title: `التصوير ${relativeDay(eventIn)}`, detail: b.client_notes ? "راجعي ملاحظات العميلة وقائمة اللقطات" : "جهّزي قائمة اللقطات", cta: "قائمة اللقطات", icon: <ListChecks className="h-4 w-4" />, run: () => setTab("production") };
    }
    if (stage !== "delivered") {
      const label = STAGES.find((s) => s.key === stage)?.label ?? "";
      return { title: `المرحلة الحالية: ${label}`, detail: b.delivery_due_at ? `التسليم ${relativeDay(daysFromToday(b.delivery_due_at))}` : "حدّثي المرحلة لتعرف العميلة أين وصلت صورها", cta: "حدّثي الإنتاج", icon: <Edit3 className="h-4 w-4" />, run: () => setTab("production") };
    }
    if (!b.final_paid_at) {
      return { title: "سُلّمت الصور — الدفعة النهائية لم تصل", detail: `المتبقي ${Number(b.total_price) - Number(b.deposit_amount || 0)} د.أ`, cta: "سجّلي استلام الدفعة", icon: <BadgeDollarSign className="h-4 w-4" />, run: markFinalPaid, busy: actionLoading === "final" };
    }
    return { title: "اكتمل الحجز", detail: "رأي العميلة يساعد العرائس الأخريات على اختيارك", cta: "اطلبي تقييماً", icon: <Star className="h-4 w-4" />, run: () => openWhatsApp(`مرحباً ${b.client_name} 🤍\nأتمنى أن تكون الصور قد نالت إعجابك! يسعدني سماع رأيك هنا:\n${origin}/review/${b.client_tracking_token}\n\nشكراً لكِ!`) };
  }, [b, actionLoading, trackUrl]);

  // ── تلميحات سياقية مرتبطة بهذا الحجز ──
  const hints = useMemo(() => {
    if (!b) return [] as { key: string; text: string; action?: { label: string; run: () => void } }[];
    const list: { key: string; text: string; action?: { label: string; run: () => void } }[] = [];
    const eventIn = b.event_date ? daysFromToday(b.event_date) : null;
    if (b.client_notes && eventIn !== null && eventIn >= 0 && eventIn <= 2) {
      list.push({ key: "notes", text: `ملاحظة العميلة قبل التصوير: «${b.client_notes}»` });
    }
    if (contract && contract.status !== "signed" && b.status !== "cancelled") {
      list.push({ key: "contract", text: "العقد لم يُوقَّع بعد.", action: { label: "أرسلي تذكيراً", run: () => openWhatsApp(`مرحباً ${b.client_name} 🤍\nيرجى مراجعة العقد وتوقيعه من هنا:\n${origin}/contracts/${contract.sign_token}`) } });
    }
    const mine = msgs.filter((m) => m.sender_id === uid);
    const theirs = msgs.filter((m) => m.sender_id !== uid);
    const lastTheirs = theirs[theirs.length - 1];
    const lastMine = mine[mine.length - 1];
    if (lastTheirs && (!lastMine || new Date(lastTheirs.created_at) > new Date(lastMine.created_at))) {
      list.push({ key: "reply", text: `العميلة كتبت لكِ ${ageLabel(lastTheirs.created_at)} ولم تردّي بعد.`, action: { label: "افتحي المحادثة", run: () => setTab("chat") } });
    }
    if (b.production_stage === "delivered" && !b.final_paid_at && b.status !== "cancelled") {
      list.push({ key: "watermark", text: "صور المعرض تظهر للعميلة بعلامة مائية حتى تسجّلي الدفعة النهائية." });
    }
    return list.filter((h) => !dismissedHints.includes(h.key));
  }, [b, contract, msgs, uid, dismissedHints]);

  if (loading || !b) return <PageLoader />;

  const remaining = Number(b.total_price) - Number(b.deposit_amount || 0);
  const eventIn = b.event_date ? daysFromToday(b.event_date) : null;
  const TABS: { key: TabKey; label: string; icon: React.ReactNode; badge?: number }[] = [
    { key: "overview", label: "نظرة عامة", icon: <LayoutGrid className="h-4 w-4" /> },
    { key: "chat", label: "المحادثة", icon: <MessageSquare className="h-4 w-4" />, badge: unread },
    { key: "production", label: "الإنتاج", icon: <ListChecks className="h-4 w-4" /> },
    { key: "gallery", label: "المعرض", icon: <ImagePlus className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <section className="container-editorial pt-8 pb-16 max-w-4xl">
        <Link to="/dashboard/bookings" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-gold transition-colors group">
          <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" /> الحجوزات
        </Link>

        {/* ── الرأس: الاسم والحالة والتاريخ ── */}
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-serif text-4xl leading-tight">{b.client_name}</h1>
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={b.status}
                  initial={{ rotateX: 90, opacity: 0 }}
                  animate={{ rotateX: 0, opacity: 1 }}
                  exit={{ rotateX: -90, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${statusTone[b.status] ?? "bg-secondary"}`}
                >
                  {statusLabels[b.status] ?? b.status}
                </motion.span>
              </AnimatePresence>
            </div>
            <div className="mt-1.5 text-sm text-muted-foreground">
              {b.service === "cinematic_video" ? "فيديو سينمائي" : "تصوير فوتوغرافي"} · {new Date(b.event_date).toLocaleDateString("ar-JO", { weekday: "long", day: "numeric", month: "long" })}
              {eventIn !== null && eventIn >= 0 && eventIn <= 30 && <span className="text-gold"> ({relativeDay(eventIn)})</span>}
              {" "}· {b.start_time?.slice(0,5)}–{b.end_time?.slice(0,5)}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <WhatsAppQuickSend booking={b} />
            <DropdownMenu>
              <DropdownMenuTrigger className="grid h-9 w-9 place-items-center rounded-full border border-border hover:bg-secondary transition-colors" aria-label="إجراءات أخرى">
                <MoreHorizontal className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-52" style={{ direction: "rtl" }}>
                {trackUrl && (
                  <DropdownMenuItem onClick={() => window.open(trackUrl, "_blank")}>
                    <Eye className="h-4 w-4 me-2" /> ماذا ترى العميلة الآن
                  </DropdownMenuItem>
                )}
                {trackUrl && (
                  <DropdownMenuItem onClick={async () => { await navigator.clipboard.writeText(trackUrl).catch(() => {}); toast.success("نُسخ رابط التتبّع"); }}>
                    <Copy className="h-4 w-4 me-2" /> نسخ رابط التتبّع
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={async () => {
                  if (!(await confirm({ title: "تجديد رابط التتبّع", description: "الرابط القديم سيتوقف عن العمل، وستحتاجين لإرسال الرابط الجديد للعميلة.", confirmText: "تجديد" }))) return;
                  try { await regenTokenFn({ data: { booking_id: id } }); toast.success("جُدّد الرابط"); await load(); }
                  catch (e: any) { toast.error(e?.message || "تعذّر التجديد"); }
                }}>
                  <Clock className="h-4 w-4 me-2" /> تجديد رابط التتبّع
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {b.status !== "cancelled" && b.status !== "completed" && (
                  <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setCancelOpen(true)}>
                    <XCircle className="h-4 w-4 me-2" /> إلغاء الحجز
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={async () => {
                  if (!(await confirm({ title: "حذف الحجز", description: "سيُنقل للمحذوفات. يمكن استرجاعه لاحقاً من سجل التدقيق.", confirmText: "حذف", destructive: true }))) return;
                  try { await softDeleteFn({ data: { booking_id: id } }); toast.success("حُذف الحجز"); nav({ to: "/dashboard/bookings" }); }
                  catch (e: any) { toast.error(e?.message || "تعذّر الحذف"); }
                }}>
                  <Trash2 className="h-4 w-4 me-2" /> حذف الحجز
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* ── شريط الخطوة التالية (ثابت أثناء التمرير) ── */}
        {next && (
          <div className="sticky top-[calc(env(safe-area-inset-top,0px)+4rem)] z-20 -mx-4 mt-6 px-4 py-2 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
            <motion.div
              layout
              className="flex flex-col gap-3 rounded-2xl bg-charcoal p-4 ps-5 text-ivory sm:flex-row sm:items-center sm:justify-between dark:bg-card dark:text-foreground dark:ring-1 dark:ring-gold/30"
            >
              <div className="min-w-0">
                <div className="text-[11px] tracking-wide text-gold">الخطوة التالية</div>
                <div className="font-medium">{next.title}</div>
                <div className="text-xs text-ivory/60 dark:text-muted-foreground">{next.detail}</div>
              </div>
              <button
                onClick={next.run}
                disabled={next.busy}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-gold px-5 py-2.5 text-sm font-medium text-charcoal transition-transform active:scale-95 disabled:opacity-60"
              >
                {next.busy ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-charcoal/30 border-t-charcoal" /> : next.icon}
                {next.cta}
              </button>
            </motion.div>
          </div>
        )}

        {/* ── تلميحات خاصة بهذا الحجز ── */}
        <AnimatePresence initial={false}>
          {hints.map((h) => (
            <motion.div
              key={h.key}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-3 flex items-start gap-3 rounded-xl border border-gold/25 bg-gold/5 px-4 py-3 text-sm">
                <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                <span className="flex-1">{h.text}</span>
                {h.action && (
                  <button onClick={h.action.run} className="shrink-0 text-xs font-medium text-gold hover:underline">{h.action.label}</button>
                )}
                <button onClick={() => setDismissedHints((d) => [...d, h.key])} className="shrink-0 text-muted-foreground hover:text-foreground" aria-label="إخفاء التلميح">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* ── التبويبات ── */}
        <div role="tablist" aria-label="أقسام الحجز" className="mt-8 flex gap-1 overflow-x-auto scrollbar-none border-b border-border">
          {TABS.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => { setTab(t.key); hapticVibrate("light"); }}
              className={`relative inline-flex shrink-0 items-center gap-2 px-4 py-3 text-sm transition-colors ${tab === t.key ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {t.icon}
              {t.label}
              {!!t.badge && (
                <span className="grid h-5 min-w-5 place-items-center rounded-full bg-gold px-1.5 text-[10px] font-bold text-charcoal tabular-nums">{t.badge}</span>
              )}
              {tab === t.key && (
                <motion.span layoutId="booking-tab-indicator" className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-gold" transition={{ type: "spring", stiffness: 500, damping: 40 }} />
              )}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="pt-8"
          >
            {tab === "overview" && (
              <div className="grid gap-6 lg:grid-cols-5">
                <div className="space-y-6 lg:col-span-3">
                  <div className="rounded-2xl border border-border bg-card p-6 space-y-3 text-sm">
                    <h2 className="font-serif text-xl mb-1">العميلة والمكان</h2>
                    <Row k="الهاتف" v={b.client_phone && (
                      <span className="inline-flex items-center gap-2"><span dir="ltr">{b.client_phone}</span><CopyButton value={b.client_phone} iconOnly label="نسخ الرقم" className="px-2" /></span>
                    )} />
                    <Row k="البريد" v={b.client_email && (
                      <span className="inline-flex items-center gap-2"><span className="truncate max-w-[180px]" dir="ltr">{b.client_email}</span><CopyButton value={b.client_email} iconOnly label="نسخ البريد" className="px-2" /></span>
                    )} />
                    <Row k="المكان" v={b.venue_name} />
                    <Row k="العنوان" v={b.venue_address} />
                    {b.client_notes && (
                      <div className="rounded-xl bg-secondary/50 p-3">
                        <div className="text-xs text-muted-foreground mb-1">ملاحظات العميلة</div>
                        <p className="whitespace-pre-wrap leading-relaxed">{b.client_notes}</p>
                      </div>
                    )}
                    <div className="pt-1"><PrivacyBadge level={b.privacy_level} /></div>
                  </div>

                  <ContractCard contract={contract} templates={templates} busy={actionLoading === "contract"} onGenerate={generateContract} />
                </div>

                <div className="space-y-6 lg:col-span-2">
                  <div className="rounded-2xl border border-border bg-card p-6 space-y-3 text-sm">
                    <h2 className="font-serif text-xl mb-1">المبالغ</h2>
                    <Row k="السعر الأساسي" v={`${b.base_price ?? 0} د.أ`} />
                    {Number(b.travel_fee) > 0 && <Row k="رسوم التنقّل" v={`${b.travel_fee} د.أ`} />}
                    <Row k="الإجمالي" v={`${b.total_price} د.أ`} bold />
                    <hr className="border-border" />
                    <Row k="العربون" v={
                      <span className="inline-flex items-center gap-1.5">
                        {b.status === "confirmed" || b.status === "completed" ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : <Clock className="h-3.5 w-3.5 text-amber-600" />}
                        {b.deposit_amount} د.أ
                      </span>
                    } />
                    <Row k="المتبقي" v={
                      <span className="inline-flex items-center gap-1.5">
                        {b.final_paid_at ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : null}
                        {remaining.toLocaleString()} د.أ
                      </span>
                    } bold />
                    {b.final_paid_at && <div className="text-xs text-emerald-700 dark:text-emerald-400">استُلم المتبقي في {new Date(b.final_paid_at).toLocaleDateString("ar-JO")}</div>}
                    {!b.final_paid_at && (b.status === "confirmed" || b.status === "completed") && (
                      <button onClick={markFinalPaid} disabled={actionLoading === "final"} className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-full border border-border px-4 py-2 text-sm hover:border-gold/50 hover:text-gold transition-colors active:scale-95 disabled:opacity-60">
                        <BadgeDollarSign className="h-4 w-4" /> تسجيل استلام المتبقي
                      </button>
                    )}
                  </div>

                  {(proofUrl || (b.status === "pending_deposit" && b.deposit_sent_at)) && (
                    <div className="rounded-2xl border border-border bg-card p-6 text-sm">
                      <h2 className="font-serif text-xl mb-1">إثبات العربون</h2>
                      {b.status === "pending_deposit" && (
                        <p className="mb-3 text-xs text-muted-foreground">تأكّدي أن المبلغ في الإيصال <strong className="text-foreground">{b.deposit_amount} د.أ</strong> قبل التأكيد.</p>
                      )}
                      {proofUrl ? (
                        <button onClick={() => setProofOpen(true)} className="block w-full overflow-hidden rounded-xl border border-border bg-secondary transition-transform active:scale-[0.98]">
                          <motion.img layoutId="proof-image" src={proofUrl} alt="إثبات تحويل العربون" className="max-h-60 w-full object-contain" />
                        </button>
                      ) : (
                        <p className="rounded-xl bg-amber-50 p-3 text-amber-900 dark:bg-amber-950/20 dark:text-amber-300">أشارت العميلة إلى التحويل بدون إيصال. تحقّقي من حسابك قبل التأكيد.</p>
                      )}
                    </div>
                  )}

                  <DeliveryCountdown b={b} />

                  {b.status === "cancelled" && (
                    <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5 text-sm">
                      <div className="font-medium text-destructive mb-1">حجز ملغى</div>
                      {b.cancelled_at && <div className="text-xs text-muted-foreground">بتاريخ {new Date(b.cancelled_at).toLocaleString("ar-JO")}</div>}
                      {b.cancellation_reason && <div className="mt-1">السبب: {b.cancellation_reason}</div>}
                      {Number(b.refund_amount || 0) > 0 && (
                        <div className="mt-1">استرداد: <strong>{b.refund_amount} د.أ</strong> — {b.refund_status === "pending" ? "قيد المعالجة" : b.refund_status === "refunded" ? "تم الردّ" : b.refund_status}</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {tab === "chat" && (
              <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
                <div className="space-y-3 max-h-[60vh] overflow-y-auto mb-4 px-1">
                  {msgs.length === 0 && (
                    <div className="py-10 text-center text-sm text-muted-foreground">
                      لا رسائل بعد. اكتبي أول رسالة — تصل للعميلة في صفحة التتبّع.
                    </div>
                  )}
                  <AnimatePresence initial={false}>
                    {msgs.map((m) => {
                      const mine = m.sender_id === uid;
                      const pending = String(m.id).startsWith("tmp-");
                      return (
                        <motion.div
                          key={m.id}
                          layout
                          initial={{ opacity: 0, y: 12, scale: 0.97 }}
                          animate={{ opacity: pending ? 0.7 : 1, y: 0, scale: 1 }}
                          className={`max-w-[85%] rounded-2xl p-3 ${mine ? "ms-auto bg-charcoal text-ivory rounded-ee-sm dark:bg-gold/20 dark:text-foreground" : "me-auto bg-secondary rounded-es-sm"}`}
                        >
                          <div className="text-sm whitespace-pre-wrap leading-relaxed">{m.body}</div>
                          <div className="mt-1 flex items-center gap-1.5 text-[10px] opacity-60">
                            <span>{new Date(m.created_at).toLocaleString("ar-JO", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" })}</span>
                            {mine && <span title={m.read_at ? "قرأتها" : pending ? "يُرسل…" : "أُرسلت"}>{pending ? "…" : m.read_at ? "✓✓ قرأتها" : "✓"}</span>}
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                  <div ref={chatEndRef} />
                </div>
                <div className="flex items-end gap-2">
                  <div className="relative flex-1">
                    <textarea
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                      rows={1}
                      placeholder="اكتبي رسالة… (Shift+Enter لسطر جديد)"
                      className="w-full resize-none rounded-2xl border border-border bg-background px-4 py-2.5 text-sm focus:border-gold/60 focus:outline-none"
                    />
                    {text && <span className="absolute -top-5 start-2 text-[10px] text-muted-foreground">المسودة محفوظة</span>}
                  </div>
                  <button onClick={send} disabled={!text.trim()} aria-label="إرسال" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-charcoal text-ivory transition-transform active:scale-90 disabled:opacity-40 dark:bg-gold dark:text-charcoal">
                    <Send className="h-4 w-4 -scale-x-100" />
                  </button>
                </div>
              </div>
            )}

            {tab === "production" && (
              <div className="space-y-8">
                <ProductionPanel b={b} busy={actionLoading === "stage"} onSetStage={setStage} onDeliver={markDelivered} onSaveLink={saveSelectionLink} onSaveDeliveryLink={saveExternalDelivery} />
                <ShotList bookingId={id} service={b.service} />
              </div>
            )}

            {tab === "gallery" && (
              <GalleryPanel bookingId={id} clientToken={b.client_tracking_token} b={b} />
            )}
          </motion.div>
        </AnimatePresence>
      </section>

      {/* إثبات العربون بحجم كامل — يكبر من مكانه */}
      <AnimatePresence>
        {proofOpen && proofUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setProofOpen(false)}
            className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4 backdrop-blur-sm"
          >
            <motion.img layoutId="proof-image" src={proofUrl} alt="إثبات تحويل العربون" className="max-h-[85vh] max-w-full rounded-xl object-contain" />
            <div className="absolute bottom-6 inset-x-0 flex justify-center gap-3" onClick={(e) => e.stopPropagation()}>
              <a href={proofUrl} target="_blank" rel="noreferrer" className="rounded-full bg-white/10 px-4 py-2 text-sm text-white backdrop-blur hover:bg-white/20">فتح في نافذة</a>
              {b.status === "pending_deposit" && (
                <button onClick={() => { setProofOpen(false); setStatus("confirmed"); }} className="rounded-full bg-gold px-5 py-2 text-sm font-medium text-charcoal">تأكيد العربون</button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* نافذة الإلغاء بدل window.prompt */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>إلغاء حجز {b.client_name}</DialogTitle>
            <DialogDescription>
              {b.status === "confirmed" ? "العربون مؤكَّد، وسيُحسب الاسترداد حسب سياستك." : "ستصل للعميلة رسالة بالإلغاء."}
            </DialogDescription>
          </DialogHeader>
          <label htmlFor="cancel-reason" className="text-sm">السبب <span className="text-muted-foreground">(اختياري — يظهر للعميلة)</span></label>
          <textarea id="cancel-reason" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} rows={3} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" />
          <div className="flex justify-end gap-2">
            <button onClick={() => setCancelOpen(false)} className="rounded-full border border-border px-4 py-2 text-sm hover:bg-secondary">تراجع</button>
            <button onClick={doCancel} className="rounded-full bg-destructive px-4 py-2 text-sm text-destructive-foreground hover:bg-destructive/90">إلغاء الحجز</button>
          </div>
        </DialogContent>
      </Dialog>
      <Footer />
    </div>
  );
}

function ContractCard({ contract, templates, busy, onGenerate }: { contract: any; templates: any[]; busy: boolean; onGenerate: (id?: string) => void }) {
  const url = contract && typeof window !== "undefined" ? `${window.location.origin}/contracts/${contract.sign_token}` : "";
  return (
    <div className="rounded-2xl border border-border bg-card p-6 text-sm">
      <h2 className="font-serif text-xl mb-3 flex items-center gap-2"><ScrollText className="h-5 w-5 text-gold" /> العقد</h2>
      {contract ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            {contract.status === "signed"
              ? <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300"><CheckCircle2 className="h-3.5 w-3.5" /> موقَّع</span>
              : <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs text-amber-800 dark:bg-amber-500/15 dark:text-amber-300"><Clock className="h-3.5 w-3.5" /> بانتظار توقيع العميلة</span>}
          </div>
          {contract.status === "signed" && contract.signed_at && (
            <div className="text-muted-foreground">وقّعته {contract.client_name} في {new Date(contract.signed_at).toLocaleString("ar-JO")}</div>
          )}
          <div className="flex flex-wrap gap-2">
            <CopyButton value={url} label="نسخ رابط العقد" className="px-4 py-2 text-sm" />
            <Link to="/contracts/$token" params={{ token: String(contract.sign_token) }} className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs hover:bg-secondary">عرض العقد <ArrowLeft className="h-3.5 w-3.5" /></Link>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-muted-foreground">لا يوجد عقد بعد. يُنشأ تلقائياً عند تأكيد العربون، أو أنشئيه الآن.</p>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => onGenerate()} disabled={busy} className="rounded-full bg-charcoal px-4 py-2 text-ivory transition-transform active:scale-95 disabled:opacity-60 dark:bg-gold dark:text-charcoal">عقد قياسي</button>
            {templates.map((t) => (
              <button key={t.id} onClick={() => onGenerate(t.id)} disabled={busy} className="rounded-full border border-border px-4 py-2 hover:bg-secondary transition-transform active:scale-95 disabled:opacity-60">من قالب: {t.name}</button>
            ))}
          </div>
        </div>
      )}
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

function ProductionPanel({ b, busy, onSetStage, onDeliver, onSaveLink, onSaveDeliveryLink }: { b: any; busy: boolean; onSetStage: (s: string) => void; onDeliver: () => void; onSaveLink: (l: string) => void; onSaveDeliveryLink: (l: string) => void }) {
  const [link, setLink] = useState(b.selection_link ?? "");
  const [dLink, setDLink] = useState(b.delivery_link ?? "");
  const current = b.production_stage || "awaiting";
  const idx = Math.max(0, STAGES.findIndex((s) => s.key === current));
  const nextStage = STAGES[idx + 1];
  const linkChanged = link.trim() !== (b.selection_link ?? "");
  const dLinkChanged = dLink.trim() !== (b.delivery_link ?? "");
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-serif text-xl">مراحل الإنتاج</h2>
        {nextStage && b.status !== "cancelled" && (
          <button
            onClick={() => (nextStage.key === "delivered" ? onDeliver() : onSetStage(nextStage.key))}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-full bg-charcoal px-4 py-2 text-sm text-ivory transition-transform active:scale-95 disabled:opacity-60 dark:bg-gold dark:text-charcoal"
          >
            انقلي إلى «{nextStage.label}» <ArrowLeft className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* خط زمني: المنجز يمتلئ بالذهبي، والحالي ينبض ببطء */}
      <ol className="relative grid grid-cols-6 gap-1">
        <div className="absolute top-4 inset-x-[8%] h-0.5 bg-secondary" aria-hidden />
        <motion.div
          className="absolute top-4 start-[8%] h-0.5 bg-gold origin-right"
          initial={false}
          animate={{ width: `${(idx / (STAGES.length - 1)) * 84}%` }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          aria-hidden
        />
        {STAGES.map((s, i) => {
          const done = i < idx;
          const isCurrent = i === idx;
          return (
            <li key={s.key} className="relative z-10 flex flex-col items-center text-center">
              <button
                onClick={() => (s.key === "delivered" ? onDeliver() : onSetStage(s.key))}
                disabled={busy || isCurrent || b.status === "cancelled"}
                title={isCurrent ? "المرحلة الحالية" : `انقلي إلى ${s.label}`}
                className={`relative grid h-8 w-8 place-items-center rounded-full border-2 transition-colors duration-300 ${done ? "border-gold bg-gold text-charcoal" : isCurrent ? "border-gold bg-background text-gold" : "border-border bg-background text-muted-foreground hover:border-gold/50"}`}
              >
                {isCurrent && <span className="absolute inset-0 rounded-full border-2 border-gold animate-ping opacity-30 motion-reduce:hidden" />}
                {done ? <CheckCircle2 className="h-4 w-4" /> : s.icon}
              </button>
              <span className={`mt-2 text-[11px] leading-tight ${isCurrent ? "font-medium text-foreground" : "text-muted-foreground"}`}>{s.label}</span>
            </li>
          );
        })}
      </ol>

      <div className="mt-8 grid gap-6 border-t border-border pt-6 sm:grid-cols-2">
        <div>
          <label htmlFor="selection-link" className="text-sm font-medium">رابط اختيار الصور</label>
          <p className="mb-2 text-xs text-muted-foreground">Pixieset أو Drive — تختار منه العميلة صور الألبوم.</p>
          <div className="flex gap-2">
            <input id="selection-link" dir="ltr" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://…" className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm" />
            <button onClick={() => onSaveLink(link)} disabled={!linkChanged} className="rounded-full border border-border px-4 py-2 text-sm hover:bg-secondary transition-transform active:scale-95 disabled:opacity-40">حفظ</button>
          </div>
          {b.selection_link && <a href={b.selection_link} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs text-gold hover:underline">فتح الرابط الحالي</a>}
        </div>
        <div>
          <label htmlFor="delivery-link" className="text-sm font-medium">رابط التسليم النهائي</label>
          <p className="mb-2 text-xs text-muted-foreground">Drive أو WeTransfer — يظهر للعميلة كزر «تحميل الصور».</p>
          <div className="flex gap-2">
            <input id="delivery-link" dir="ltr" value={dLink} onChange={(e) => setDLink(e.target.value)} placeholder="https://drive.google.com/…" className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm" />
            <button onClick={() => onSaveDeliveryLink(dLink)} disabled={!dLinkChanged} className="rounded-full bg-charcoal px-4 py-2 text-sm text-ivory transition-transform active:scale-95 disabled:opacity-40 dark:bg-gold dark:text-charcoal">حفظ وإرسال</button>
          </div>
          {b.delivery_link && <a href={b.delivery_link} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs text-gold hover:underline">فتح الرابط الحالي</a>}
        </div>
      </div>
    </div>
  );
}

function DeliveryCountdown({ b }: { b: any }) {
  if (b.delivered_at) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20 flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4" /> سُلِّمت الصور في {new Date(b.delivered_at).toLocaleDateString("ar-JO")}
      </div>
    );
  }
  if (!b.delivery_due_at || b.status === "cancelled") return null;
  const due = new Date(b.delivery_due_at);
  const days = daysFromToday(b.delivery_due_at);
  const overdue = days < 0;
  return (
    <div className={`rounded-2xl border p-4 text-sm flex items-center gap-3 ${overdue ? "border-destructive/40 bg-destructive/10 text-destructive" : days <= 7 ? "border-amber-200 bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20" : "border-border bg-card"}`}>
      <Clock className="h-4 w-4 shrink-0" />
      <div>
        <div className="font-medium">{overdue ? `التسليم متأخر ${Math.abs(days)} ${Math.abs(days) === 1 ? "يوماً" : "أيام"}` : `التسليم ${relativeDay(days)}`}</div>
        <div className="text-xs opacity-80">الموعد المتّفق عليه {due.toLocaleDateString("ar-JO", { day: "numeric", month: "long" })}</div>
      </div>
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
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [hidden, setHidden] = useState<string[]>([]); // صور حُذفت وتنتظر انتهاء مهلة التراجع
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
    setProgress({ done: 0, total: files.length });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("جلسة منتهية");
      const uid = session.user.id;

      for (const [fi, rawFile] of files.entries()) {
        if (fi > 0) setProgress({ done: fi, total: files.length });
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
      hapticVibrate("success");
      toast.success(files.length === 1 ? "رُفعت الصورة" : `رُفعت ${files.length} صور`);
      e.target.value = "";
    } catch (e: any) { toast.error(e.message); }
    finally { setUploading(false); setProgress(null); }
  };

  // حذف مع مهلة تراجع ٥ ثوانٍ بدل نافذة التأكيد
  const remove = (photoId: string) => {
    setHidden((h) => [...h, photoId]);
    let settled = false;
    const commit = async () => {
      if (settled) return;
      settled = true;
      try { await del({ data: { photo_id: photoId } }); await load(); }
      catch (e: any) { toast.error(e.message); }
      finally { setHidden((h) => h.filter((x) => x !== photoId)); }
    };
    toast("حُذفت الصورة", {
      duration: 5000,
      action: { label: "تراجع", onClick: () => { settled = true; setHidden((h) => h.filter((x) => x !== photoId)); } },
      onAutoClose: commit,
      onDismiss: commit,
    });
  };

  const toggleDownloads = async () => {
    if (!gallery) return;
    try { await upd({ data: { gallery_id: gallery.id, allow_downloads: !gallery.allow_downloads } }); await load(); }
    catch (e: any) { toast.error(e.message); }
  };

  const clientUrl = clientToken && typeof window !== "undefined" ? `${window.location.origin}/track/${clientToken}` : "";
  const visible = photos.filter((p) => !hidden.includes(p.id));

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-serif text-xl flex items-center gap-2"><ImagePlus className="h-5 w-5 text-gold" /> معرض المعاينة</h2>
        {gallery && <span className="text-xs text-muted-foreground tabular-nums">{visible.length} صورة</span>}
      </div>
      {!gallery ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <ImagePlus className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="mx-auto mb-4 max-w-sm text-sm text-muted-foreground">معرض خاص تصل إليه العميلة من رابط التتبّع لمعاينة الصور المختارة.</p>
          <button onClick={create} disabled={busy} className="rounded-full bg-charcoal px-5 py-2 text-sm text-ivory disabled:opacity-60 active:scale-95 transition-transform dark:bg-gold dark:text-charcoal">إنشاء المعرض</button>
        </div>
      ) : (
        <div>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <label className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm transition-transform active:scale-95 ${uploading ? "bg-secondary" : "cursor-pointer bg-charcoal text-ivory dark:bg-gold dark:text-charcoal"}`}>
              <Upload className="h-4 w-4" />
              <span className="tabular-nums">{uploading ? (progress ? `رفع ${progress.done + 1} من ${progress.total}…` : "جاري الرفع…") : "رفع صور"}</span>
              <input type="file" multiple accept="image/*" className="hidden" onChange={onPick} disabled={uploading} />
            </label>
            <button onClick={toggleDownloads} role="switch" aria-checked={!!gallery.allow_downloads} className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm hover:bg-secondary transition-colors">
              <span className={`relative inline-flex h-4 w-7 rounded-full transition-colors ${gallery.allow_downloads ? "bg-gold" : "bg-secondary ring-1 ring-border"}`}>
                <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-all ${gallery.allow_downloads ? "start-[14px]" : "start-0.5"}`} />
              </span>
              السماح بالتحميل
            </button>
            {clientUrl && <CopyButton value={clientUrl} label="رابط العميلة" className="px-4 py-2 text-sm" />}
          </div>

          {uploading && progress && (
            <div className="mb-4 h-1 overflow-hidden rounded-full bg-secondary">
              <motion.div className="h-full bg-gold" animate={{ width: `${((progress.done + 0.5) / progress.total) * 100}%` }} transition={{ ease: "easeOut" }} />
            </div>
          )}

          <div className="mb-5 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-secondary/30 p-3">
            <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={watermarkOn} onChange={(e) => setWatermarkOn(e.target.checked)} className="accent-[var(--gold)]" />
              <span>علامة مائية</span>
            </label>
            <input
              type="text"
              value={watermarkText}
              onChange={(e) => setWatermarkText(e.target.value)}
              placeholder="© اسم المصوّرة"
              maxLength={80}
              disabled={!watermarkOn}
              className="min-w-[160px] flex-1 rounded-lg border border-input bg-background px-3 py-1.5 text-sm disabled:opacity-50"
            />
            <p className="basis-full text-xs text-muted-foreground">
              {b.final_paid_at ? "الدفعة النهائية وصلت — العميلة ترى الصور بدون علامة." : "تظهر العلامة للعميلة حتى تسجّلي الدفعة النهائية، ثم تُفتح الصور الأصلية تلقائياً."}
              {" "}للتسليم بالحجم الكامل استخدمي «رابط التسليم النهائي» في تبويب الإنتاج.
            </p>
          </div>

          {visible.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              {b.status === "completed" ? "الحجز مكتمل والمعرض فارغ — العميلة تنتظر صورها. ارفعي دفعة أولى لتشويقها." : "لم تُرفع صور بعد. يقبل المعرض حتى ٣٠ صورة في كل مرة."}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              <AnimatePresence initial={false}>
                {visible.map((p) => (
                  <motion.div
                    key={p.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    transition={{ duration: 0.2 }}
                    className="relative group aspect-square overflow-hidden rounded-xl bg-secondary"
                  >
                    {p.url && <BlurImage src={p.url} alt={p.caption ?? ""} />}
                    <button onClick={() => remove(p.id)} aria-label="حذف الصورة" className="absolute top-1.5 start-1.5 grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** صورة تظهر ضبابية ثم تتّضح عند اكتمال التحميل. */
function BlurImage({ src, alt }: { src: string; alt: string }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onLoad={() => setLoaded(true)}
      className={`h-full w-full object-cover transition-all duration-700 ${loaded ? "blur-0 scale-100" : "blur-md scale-105"}`}
    />
  );
}
