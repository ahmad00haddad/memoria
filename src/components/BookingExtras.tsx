import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { CheckCircle2, AlertTriangle, FileSignature, ClipboardList, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { confirmReady, saveEventDayInfo, addAddendum, withdrawAddendum, respondAddendum, clientEditDetails, getBookingReview, replyToReview, getClientHistory, requestEmailFix } from "@/lib/extras.functions";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { g } from "@/hooks/use-gender";
import { t as tr, tx } from "@/i18n";
import { StepUpBox } from "@/components/StepUpBox";

// ============================================================================
// BookingExtras — ثلاث حمايات بعد تأكيد الحجز:
//  1) "جاهزة للموعد": المصوّرة تؤكّد خلال آخر أسبوع، والعروس ترى التأكيد (وتنبيهاً إن تأخّر)
//  2) استمارة يوم العرس: قيود القاعة والضيوف والستوري، تراها المصوّرة
//  3) ملحق اتفاق: أي إضافة بعد الحجز تُكتب هنا وتعتمد بموافقة العروس (المبلغ يُضاف للمتبقي)
// ============================================================================

type AddKind = "general" | "substitute" | "reschedule" | "discount";
type Addendum = {
  id: string; description: string; amount: number; status: string; created_at: string;
  kind?: AddKind; substitute_name?: string | null; substitute_link?: string | null;
  new_event_date?: string | null; new_start_time?: string | null; new_end_time?: string | null;
};

// سطر مختصر يصف أثر الملحق (يظهر للطرفين)
function addendumEffect(a: Addendum) {
  if (a.kind === "substitute") return tr("مصوّرة بديلة: {0}", [a.substitute_name ?? ""]);
  if (a.kind === "reschedule") return tr("موعد جديد: {0}", [[a.new_event_date, a.new_start_time && `${String(a.new_start_time).slice(0, 5)}–${String(a.new_end_time ?? "").slice(0, 5)}`].filter(Boolean).join(" · ")]);
  if (Number(a.amount) < 0) return tr("تخفيض {0} د.أ", [-Number(a.amount)]);
  if (Number(a.amount) > 0) return tr("+{0} د.أ", [a.amount]);
  return tr("بدون مبلغ");
}

export type EventDayInfo = {
  no_flash?: boolean; no_drone?: boolean; women_only?: boolean;
  live_story?: "yes" | "no"; skip_guests?: string; plan_b?: string; extra?: string; saved_at?: string;
};

// "يوم" أو "أيام" حسب العدد (3–10 أيام، وغيرها يوماً/يوم)
const days = (n: number) => (n >= 3 && n <= 10 ? tr("{0} أيام", [n]) : n === 1 ? tr("يوم واحد") : n === 2 ? tr("يومين") : tr("{0} يوماً", [n]));

export function daysToEvent(eventDate?: string | null) {
  if (!eventDate) return null;
  const today = new Date(Date.now() + 3 * 3600000).toISOString().slice(0, 10);
  return Math.round((Date.parse(eventDate) - Date.parse(today)) / 86400000);
}

const STATUS: Record<string, { t: string; c: string }> = {
  pending: { t: "بانتظار موافقة العروس", c: "text-amber-700 dark:text-amber-400" },
  accepted: { t: "موافَق عليه", c: "text-emerald-700 dark:text-emerald-400" },
  declined: { t: "مرفوض", c: "text-rose-700 dark:text-rose-400" },
};

function EventDaySummary({ info }: { info: EventDayInfo }) {
  const rules = [
    info.women_only && tr("القاعة نسائية: لا رجال من الفريق"),
    info.no_flash && tr("ممنوع الفلاش"),
    info.no_drone && tr("ممنوع الدرون"),
    tr(info.live_story === "yes" ? "مسموح نشر ستوري مباشر" : "ممنوع نشر ستوري مباشر من العرس"),
  ].filter(Boolean) as string[];
  return (
    <div className="space-y-1.5 text-sm">
      <ul className="list-disc ps-5 space-y-0.5">{rules.map((r) => <li key={r}>{tx(r)}</li>)}</ul>
      {info.skip_guests && <p><span className="text-muted-foreground">{tr("لا تصوّروا:")}</span> {tx(info.skip_guests)}</p>}
      {info.plan_b && <p><span className="text-muted-foreground">{tr("الخطة البديلة (طقس/مكان):")}</span> {tx(info.plan_b)}</p>}
      {info.extra && <p><span className="text-muted-foreground">{tr("ملاحظات:")}</span> {tx(info.extra)}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// لوحة المصوّرة (صفحة الحجز)
// ---------------------------------------------------------------------------
export function BookingExtrasPanel({ booking: b, onChange }: { booking: any; onChange: () => void }) {
  const ready = useServerFn(confirmReady);
  const add = useServerFn(addAddendum);
  const withdraw = useServerFn(withdrawAddendum);
  const confirm = useConfirm();
  const [addenda, setAddenda] = useState<Addendum[]>([]);
  const [open, setOpen] = useState(false);
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [kind, setKind] = useState<AddKind>("general");
  const [subName, setSubName] = useState("");
  const [subLink, setSubLink] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");
  const [busy, setBusy] = useState(false);

  // قبل العربون (بعد موافقتها على الطلب): نقل الموعد فقط
  const moveOnly = b.status === "pending_deposit" && !(b.needs_approval && !b.approved_at);
  const active = b.status === "confirmed" || b.status === "completed" || moveOnly;
  const loadAddenda = async () => {
    const { data } = await (supabase as any).from("booking_addenda")
      .select("id, description, amount, status, created_at, kind, substitute_name, substitute_link, new_event_date, new_start_time, new_end_time").eq("booking_id", b.id).neq("status", "withdrawn").order("created_at");
    setAddenda((data ?? []) as Addendum[]);
  };
  useEffect(() => { if (active) loadAddenda(); }, [b.id, active]);
  // "حوّليها لملحق" من المحادثة: يفتح نموذج الملحق بنص الرسالة
  useEffect(() => {
    const h = (e: Event) => {
      const text = String((e as CustomEvent).detail ?? "").slice(0, 1000);
      setDesc(text); setAmount(""); setKind(moveOnly ? "reschedule" : "general"); setOpen(true);
      setTimeout(() => document.getElementById("addendum-form")?.scrollIntoView({ behavior: "smooth", block: "center" }), 100);
    };
    window.addEventListener("memoria-prefill-addendum", h);
    // اللوحة تُركَّب بعد تبديل التبويب، فقد يفوتها الحدث: نقرأ النص المعلّق مباشرة
    const pending = (window as any).__memoriaPrefillAddendum;
    if (pending) { (window as any).__memoriaPrefillAddendum = null; h(new CustomEvent("x", { detail: pending })); }
    return () => window.removeEventListener("memoria-prefill-addendum", h);
  }, []);
  if (!active) return null;

  const d = daysToEvent(b.event_date);
  const canReady = b.status === "confirmed" && d !== null && d >= 0 && d <= 7;
  const info: EventDayInfo | null = b.event_day_info ?? null;

  const onReady = async () => {
    setBusy(true);
    try { await ready({ data: { booking_id: b.id } }); toast.success(tr("وصل تأكيدكِ للعروس")); onChange(); }
    catch (e: any) { toast.error(e?.message || tr("تعذّر التأكيد")); }
    finally { setBusy(false); }
  };
  const pickKind = (k: AddKind) => {
    setKind(k); setAmount("");
    // نص جاهز يوفّر الكتابة، والمصوّرة تعدّله
    if (k === "substitute") setDesc(tr("لظرف طارئ لن أستطيع التصوير بنفسي، وأقترح زميلة موثوقة بنفس الباقة والسعر."));
    else if (k === "reschedule") setDesc(moveOnly ? tr("بدل الإلغاء: ننقل الطلب لموعد جديد بنفس الباقة والسعر.") : tr("بدل الإلغاء: ننقل الحجز لموعد جديد، والعربون المدفوع ينتقل معه."));
    else if (k === "discount") setDesc(tr("تخفيض متّفق عليه (باقة أصغر أو خدمة أقل)."));
    else setDesc("");
  };
  const onAdd = async () => {
    const amt = Number(amount || 0);
    const what = kind === "substitute" ? tr("إذا رفضت البديلة يحق لها استرداد العربون كاملاً، وتلغين الحجز.")
      : kind === "reschedule" ? (moveOnly ? tr("بعد موافقتها ينتقل الطلب للتاريخ الجديد، ثم تحوّل العربون كالمعتاد.") : tr("بعد موافقتها ينتقل الحجز للتاريخ الجديد ويبقى العربون كما هو."))
      : kind === "discount" ? tr("بعد موافقتها يُخصم {0} د.أ من المتبقي.", [amt])
      : amt > 0 ? tr("بعد موافقتها يُضاف {0} د.أ إلى المتبقي.", [amt]) : tr("بدون مبلغ إضافي.");
    const ok = await confirm({ title: tr("إرسال الملحق للعروس؟"), description: what, confirmText: tr("إرسال") });
    if (!ok) return;
    setBusy(true);
    try {
      await add({ data: {
        booking_id: b.id, description: desc, amount: amt, kind,
        substitute_name: subName, substitute_link: subLink,
        new_event_date: newDate, new_start_time: newStart, new_end_time: newEnd,
      } });
      toast.success(tr("أُرسل الملحق للعروس"));
      setDesc(""); setAmount(""); setKind(moveOnly ? "reschedule" : "general"); setSubName(""); setSubLink(""); setNewDate(""); setNewStart(""); setNewEnd("");
      setOpen(false); loadAddenda();
    } catch (e: any) { toast.error(e?.message || tr("تعذّر الإرسال")); }
    finally { setBusy(false); }
  };
  const onWithdraw = async (id: string) => {
    try { await withdraw({ data: { id } }); loadAddenda(); }
    catch (e: any) { toast.error(e?.message || tr("تعذّر السحب")); }
  };

  return (
    <div className="space-y-4">
      {b.status === "completed" && <ReviewReply bookingId={b.id} />}
      {b.status === "confirmed" && d !== null && d >= 0 && (
        b.ready_confirmed_at ? (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4 shrink-0" /> {tr("أكّدتِ جاهزيتكِ للموعد، والعروس ترى ذلك.")}
          </div>
        ) : canReady ? (
          <div className={`rounded-xl border p-4 text-sm ${d <= 2 ? "border-rose-300 bg-rose-50 dark:bg-rose-500/10" : "border-gold bg-gold/10"}`}>
            <div className="font-semibold">{tx(g("أكّدي أنكِ جاهزة للموعد", "أكّد أنك جاهز للموعد"))}</div>
            <p className="mt-1 text-xs text-muted-foreground">{tr("العروس ترى هذا التأكيد. إن لم يصل قبل يومين من المناسبة تظهر لها رسالة قلق.")}</p>
            <button onClick={onReady} disabled={busy} className="mt-3 rounded-full bg-charcoal px-5 py-2 text-xs text-ivory disabled:opacity-50">
              {tx(g("✓ جاهزة للموعد", "✓ جاهز للموعد"))}
            </button>
          </div>
        ) : null
      )}

      {!moveOnly && (info || (d !== null && d >= 0)) && <div className="rounded-xl border border-border p-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold"><ClipboardList className="h-4 w-4 text-gold" /> {tr("تفاصيل يوم العرس من العروس")}</div>
        {info ? <EventDaySummary info={info} /> : <p className="text-xs text-muted-foreground">{tr("لم تعبّئها العروس بعد. تظهر لها في صفحة الحجز.")}</p>}
      </div>}

      <div className="rounded-xl border border-border p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-semibold"><FileSignature className="h-4 w-4 text-gold" /> {tr("ملاحق الاتفاق")}</div>
          {!open && <button onClick={() => { if (moveOnly) pickKind("reschedule"); setOpen(true); }} className="text-xs text-gold underline">{moveOnly ? tr("+ نقل الموعد") : tr("+ ملحق جديد")}</button>}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{moveOnly
          ? tr("العروس تريد يوماً آخر؟ اقترحي التاريخ الجديد هنا بدل الإلغاء. لا يُعتمد إلا بموافقتها. باقي الملاحق تُتاح بعد تأكيد العربون.")
          : tr("اتفقتما على شيء جديد (ساعة إضافية، ألبوم، تغيير)؟ اكتبيه هنا. لا يُعتمد إلا بموافقة العروس.")}</p>
        {addenda.length > 0 && (
          <ul className="mt-3 space-y-2">
            {addenda.map((a) => (
              <li key={a.id} className="rounded-lg bg-secondary/50 p-3 text-sm">
                <div className="whitespace-pre-wrap">{tx(a.description)}</div>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs">
                  <span>{tx(addendumEffect(a))}</span>
                  <span className={STATUS[a.status]?.c}>{tx(tr(STATUS[a.status]?.t ?? a.status))}</span>
                  {a.status === "pending" && <button onClick={() => onWithdraw(a.id)} className="text-muted-foreground underline">{tr("سحب")}</button>}
                </div>
              </li>
            ))}
          </ul>
        )}
        {open && (
          <div id="addendum-form" className="mt-3 space-y-2">
            <div className="flex flex-wrap gap-1.5">
              {([
                ["general", tr("اتفاق جديد")],
                ["discount", tr("تخفيض")],
                ["reschedule", tr("نقل الموعد")],
                ["substitute", tr("مصوّرة بديلة")],
              ] as [AddKind, string][]).filter(([k]) => !moveOnly || k === "reschedule").map(([k, label]) => (
                <button key={k} type="button" onClick={() => pickKind(k)}
                  className={`rounded-full border px-3 py-1 text-xs ${kind === k ? "border-gold bg-gold/10" : "border-border"}`}>{tx(label)}</button>
              ))}
            </div>
            {kind === "general" && Number(b.overtime_fee_per_hour) > 0 && (
              <div className="flex flex-wrap items-center gap-2 rounded-lg bg-secondary/50 p-2 text-xs">
                <span>{tr("ساعات إضافية؟")}</span>
                {[1, 2, 3].map((h) => (
                  <button key={h} type="button" onClick={() => {
                    setDesc(tr("{0} ساعة تصوير إضافية × {1} د.أ", [h, b.overtime_fee_per_hour]));
                    setAmount(String(h * Number(b.overtime_fee_per_hour)));
                  }} className="rounded-full border border-border bg-background px-3 py-1">{tr("{0} ساعة", [h])}</button>
                ))}
              </div>
            )}
            <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} maxLength={1000}
              placeholder={tr("مثال: ساعة تصوير إضافية بعد الزفّة")}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
            {(kind === "general" || kind === "discount") && (
              <div className="flex flex-wrap items-center gap-2">
                <input type="number" inputMode="decimal" min={0} value={amount} onChange={(e) => setAmount(e.target.value)}
                  placeholder={kind === "discount" ? tr("قيمة التخفيض") : tr("المبلغ (اختياري)")} className="w-40 rounded-md border border-border bg-background px-3 py-2 text-sm" />
                <span className="text-xs text-muted-foreground">{kind === "discount" ? tr("د.أ — تُخصم من المتبقي") : tr("د.أ — يُضاف إلى المتبقي")}</span>
              </div>
            )}
            {kind === "reschedule" && (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="rounded-md border border-border bg-background px-2 py-1.5" />
                <input type="time" value={newStart} onChange={(e) => setNewStart(e.target.value)} className="rounded-md border border-border bg-background px-2 py-1.5" />
                <span>—</span>
                <input type="time" value={newEnd} onChange={(e) => setNewEnd(e.target.value)} className="rounded-md border border-border bg-background px-2 py-1.5" />
                <span className="text-xs text-muted-foreground">{tr("الوقت اختياري (يبقى نفسه)")}</span>
              </div>
            )}
            {kind === "substitute" && (
              <div className="grid gap-2 sm:grid-cols-2">
                <input value={subName} onChange={(e) => setSubName(e.target.value)} maxLength={120} placeholder={tr("اسم المصوّرة البديلة")}
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm" />
                <input value={subLink} onChange={(e) => setSubLink(e.target.value)} maxLength={500} dir="ltr" placeholder={tr("رابط أعمالها (ميموريا أو إنستغرام)")}
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm" />
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={onAdd} disabled={busy || desc.trim().length < 2 || (kind === "discount" && !(Number(amount) > 0)) || (kind === "reschedule" && !newDate) || (kind === "substitute" && subName.trim().length < 2)} className="rounded-full bg-charcoal px-5 py-2 text-xs text-ivory disabled:opacity-50">{tr("إرسال للعروس")}</button>
              <button onClick={() => setOpen(false)} className="rounded-full border border-border px-4 py-2 text-xs">{tr("إلغاء")}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// صفحة العروس (المتابعة)
// ---------------------------------------------------------------------------
export function BrideExtras({ b, token, onChange }: { b: any; token: string; onChange: () => void }) {
  const save = useServerFn(saveEventDayInfo);
  const respond = useServerFn(respondAddendum);
  const confirm = useConfirm();
  const saved: EventDayInfo | null = b.event_day_info ?? null;
  const [f, setF] = useState<EventDayInfo>(saved ?? { live_story: "no" });
  const [editing, setEditing] = useState(!saved);
  const [busy, setBusy] = useState(false);
  const [stepFor, setStepFor] = useState<string | null>(null);
  const [stepCode, setStepCode] = useState("");

  // قبل العربون: يظهر فقط ملحق نقل الموعد (إن وُجد)
  const prePaid = b.status === "pending_deposit";
  if (b.status !== "confirmed" && b.status !== "completed" && !prePaid) return null;
  const d = daysToEvent(b.event_date);
  const upcoming = b.status === "confirmed" && d !== null && d >= 0;
  const pending: Addendum[] = (b.addenda ?? []).filter((a: Addendum) => a.status === "pending" && (!prePaid || a.kind === "reschedule"));
  const decided: Addendum[] = (b.addenda ?? []).filter((a: Addendum) => a.status !== "pending" && (!prePaid || a.kind === "reschedule"));

  const onSave = async () => {
    setBusy(true);
    try { await save({ data: { token, info: f } }); toast.success(tr("وصلت التفاصيل للمصوّرة")); setEditing(false); onChange(); }
    catch (e: any) { toast.error(e?.message || tr("تعذّر الحفظ")); }
    finally { setBusy(false); }
  };
  const onRespond = async (a: Addendum, accept: boolean) => {
    // مبلغ إضافي: نطلب رمز البريد أولاً (يظهر الصندوق تحت الملحق)، ثم يُرسل الرد مع الرمز
    const needsCode = !prePaid && (Number(a.amount) > 0 || a.kind === "reschedule");
    if (accept && needsCode && b.step_up && stepFor !== a.id) { setStepFor(a.id); setStepCode(""); return; }
    const ok = await confirm({
      title: accept ? tr("الموافقة على الملحق؟") : tr("رفض الملحق؟"),
      description: accept
        ? (a.kind === "reschedule" ? (prePaid ? tr("ينتقل طلبكِ إلى {0} بنفس الباقة والسعر.", [a.new_event_date ?? ""]) : tr("ينتقل حجزكِ إلى {0}، ويبقى عربونكِ كما هو.", [a.new_event_date ?? ""]))
          : a.kind === "substitute" ? tr("توافقين أن تصوّركِ {0} بدل المصوّرة، بنفس الباقة والسعر.", [a.substitute_name ?? ""])
          : Number(a.amount) > 0 ? tr("سيُضاف {0} د.أ إلى المبلغ المتبقي.", [a.amount])
          : Number(a.amount) < 0 ? tr("سيُخصم {0} د.أ من المبلغ المتبقي.", [-Number(a.amount)])
          : tx(a.description))
        : (a.kind === "substitute" ? tr("بعد الرفض تُبلَّغ المصوّرة. إن لم تستطع التصوير بنفسها، إلغاؤها يعني استرداد عربونكِ كاملاً.") : tx(a.description)),
      confirmText: accept ? tr("أوافق") : tr("أرفض"),
    });
    if (!ok) return;
    try { await respond({ data: { token, id: a.id, accept, code: stepFor === a.id ? stepCode : null } }); toast.success(accept ? tr("تمت الموافقة") : tr("رُفض الملحق")); setStepFor(null); setStepCode(""); onChange(); }
    catch (e: any) { toast.error(e?.message || tr("تعذّر الإرسال")); }
  };
  const chk = (k: "women_only" | "no_flash" | "no_drone", label: string) => (
    <label className="flex items-center gap-2 text-sm cursor-pointer">
      <input type="checkbox" className="h-4 w-4" checked={!!f[k]} onChange={(e) => setF({ ...f, [k]: e.target.checked })} />
      {tx(label)}
    </label>
  );

  return (
    <>
      {upcoming && d! <= 7 && (
        b.ready_confirmed_at ? (
          <div className="mb-6 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-300">
            <CheckCircle2 className="h-5 w-5 shrink-0" /> {tr("أكّدت المصوّرة أنها جاهزة لموعدكِ.")}
          </div>
        ) : d! <= 2 ? (
          <div className="mb-6 flex items-start gap-2 rounded-2xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-800 dark:bg-rose-500/10 dark:text-rose-300">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <span>{tr("لم تؤكّد المصوّرة جاهزيتها بعد. تواصلي معها الآن من الرقم أسفل الصفحة، وإن لم تردّ راسلي فريق ميموريا.")}</span>
          </div>
        ) : (
          <div className="mb-6 rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
            {tr("بانتظار تأكيد المصوّرة أنها جاهزة لموعدكِ (يصل قبل المناسبة بيومين على الأقل).")}
          </div>
        )
      )}

      {b.event_date && d !== null && d < 0 && (b.delivery_due_at || b.photos_promised) && (() => {
        const delivered = !!b.delivered_at || b.status === "completed";
        const left = b.delivery_due_at ? daysToEvent(String(b.delivery_due_at).slice(0, 10))! : null;
        const late = !delivered && left !== null && left < 0;
        return (
          <div className={`mb-6 rounded-2xl border p-4 text-sm ${late ? "border-rose-300 bg-rose-50 text-rose-800 dark:bg-rose-500/10 dark:text-rose-300" : "border-border bg-card"}`}>
            <div className="font-medium">
              {delivered ? tr("سُلِّمت صوركِ")
                : left === null ? tr("صوركِ قيد التجهيز")
                : late ? tr("التسليم متأخر {0} عن الموعد المتّفق", [days(Math.abs(left))])
                : left === 0 ? tr("موعد التسليم المتّفق: اليوم")
                : tr("موعد التسليم المتّفق: بعد {0}", [days(left)])}
            </div>
            {b.photos_promised ? (
              <div className="mt-1 text-xs text-muted-foreground">
                {delivered && b.photos_delivered > 0
                  ? tr("وصلكِ {0} صورة من {1} متّفق عليها", [b.photos_delivered, b.photos_promised])
                  : tr("المتّفق: {0} صورة معدّلة", [b.photos_promised])}
              </div>
            ) : null}
            {late && <div className="mt-1 text-xs">{tr("راسلي المصوّرة من أسفل الصفحة، وإن لم تردّ راسلي فريق ميموريا.")}</div>}
          </div>
        );
      })()}

      {pending.length > 0 && (
        <div id="addenda-step" className="scroll-mt-24 mb-6 rounded-2xl border border-gold bg-gold/10 p-5">
          <h2 className="font-serif text-lg mb-1">{tr("ملحق اتفاق بانتظار موافقتكِ")}</h2>
          <p className="text-xs text-muted-foreground mb-3">{tr("لا يُعتمد أي اتفاق جديد إلا بموافقتكِ هنا.")}</p>
          <ul className="space-y-3">
            {pending.map((a) => (
              <li key={a.id} className="rounded-xl bg-background p-4 text-sm">
                <div className="whitespace-pre-wrap">{tx(a.description)}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {a.kind === "substitute" ? tx(addendumEffect(a))
                    : a.kind === "reschedule" ? tx(addendumEffect(a))
                    : Number(a.amount) > 0 ? tr("مبلغ إضافي: {0} د.أ (يُضاف إلى المتبقي)", [a.amount])
                    : Number(a.amount) < 0 ? tr("تخفيض: {0} د.أ من المتبقي", [-Number(a.amount)])
                    : tr("بدون مبلغ إضافي")}
                </div>
                {a.kind === "substitute" && (
                  <div className="mt-2 rounded-lg bg-secondary/50 p-2 text-xs">
                    {a.substitute_link && /^https?:\/\//.test(a.substitute_link) && (
                      <a href={a.substitute_link} target="_blank" rel="noreferrer" className="text-gold underline">{tr("شاهدي أعمالها")}</a>
                    )}
                    <p className="mt-1 text-muted-foreground">{tr("من حقّكِ الرفض. إن رفضتِ ولم تستطع المصوّرة التصوير بنفسها، يُسترد عربونكِ كاملاً.")}</p>
                  </div>
                )}
                {stepFor === a.id && (
                  <div className="mt-3"><StepUpBox token={token} purpose="addendum" code={stepCode} onCode={setStepCode} /></div>
                )}
                <div className="mt-3 flex gap-2">
                  <button onClick={() => onRespond(a, true)} disabled={stepFor === a.id && stepCode.length !== 6}
                    className="rounded-full bg-charcoal px-5 py-2 text-xs text-ivory disabled:opacity-50">{stepFor === a.id ? tr("تأكيد الموافقة") : tr("أوافق")}</button>
                  <button onClick={() => onRespond(a, false)} className="rounded-full border border-border px-5 py-2 text-xs">{tr("أرفض")}</button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {upcoming && (
        <div id="eventday-step" className="scroll-mt-24 mb-6 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-serif text-lg">{tr("تفاصيل يوم العرس")}</h2>
            {!editing && <button onClick={() => setEditing(true)} className="text-xs text-gold underline">{tr("تعديل")}</button>}
          </div>
          {!editing && saved ? (
            <div className="mt-3"><EventDaySummary info={saved} /></div>
          ) : (
            <div className="mt-3 space-y-3">
              <p className="text-xs text-muted-foreground">{tr("دقيقة واحدة تجنّبكِ مفاجآت يوم العرس. كلها اختيارية.")}</p>
              <div className="space-y-2">
                {chk("women_only", tr("القاعة نسائية: لا رجال من فريق التصوير"))}
                {chk("no_flash", tr("القاعة تمنع الفلاش"))}
                {chk("no_drone", tr("ممنوع الدرون"))}
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" className="h-4 w-4" checked={f.live_story === "yes"} onChange={(e) => setF({ ...f, live_story: e.target.checked ? "yes" : "no" })} />
                  {tr("مسموح للمصوّرة نشر ستوري مباشر من العرس")}
                </label>
              </div>
              <input value={f.skip_guests ?? ""} onChange={(e) => setF({ ...f, skip_guests: e.target.value })} maxLength={500}
                placeholder={tr("ضيوف لا يريدون التصوير (اختياري)")} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
              <input value={f.plan_b ?? ""} onChange={(e) => setF({ ...f, plan_b: e.target.value })} maxLength={500}
                placeholder={tr("الخطة البديلة إن خرب الطقس أو تغيّر المكان (اختياري)")} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
              <textarea value={f.extra ?? ""} onChange={(e) => setF({ ...f, extra: e.target.value })} maxLength={500} rows={2}
                placeholder={tr("أي شيء آخر (اختياري)")} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
              <button onClick={onSave} disabled={busy} className="rounded-full bg-charcoal px-6 py-2 text-sm text-ivory disabled:opacity-50">{tr("إرسال للمصوّرة")}</button>
            </div>
          )}
        </div>
      )}

      {decided.length > 0 && (
        <div className="mb-6 rounded-2xl border border-border bg-card p-5 text-sm">
          <h2 className="font-serif text-lg mb-2">{tr("ملاحق الاتفاق")}</h2>
          <ul className="space-y-2">
            {decided.map((a) => (
              <li key={a.id} className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="whitespace-pre-wrap">{tx(a.description)} <span className="text-xs text-muted-foreground">({tx(addendumEffect(a))})</span></span>
                <span className={`text-xs ${STATUS[a.status]?.c}`}>{tx(tr(a.status === "accepted" ? "وافقتِ عليه" : "رفضتِه"))}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// العروس: تعديل العنوان والوقت (الوقت قبل الموافقة فقط)
// ---------------------------------------------------------------------------
export function BrideEditDetails({ b, token, onChange }: { b: any; token: string; onChange: () => void }) {
  const edit = useServerFn(clientEditDetails);
  const [open, setOpen] = useState(false);
  const [venue, setVenue] = useState(b.venue_address ?? "");
  const [start, setStart] = useState(String(b.start_time ?? "").slice(0, 5));
  const [end, setEnd] = useState(String(b.end_time ?? "").slice(0, 5));
  const [busy, setBusy] = useState(false);
  const d = daysToEvent(b.event_date);
  if (!["pending_deposit", "quote", "confirmed"].includes(b.status) || d === null || d < 0) return null;
  const timeEditable = !!b.needs_approval && !b.approved_at;

  if (!open) return (
    <button onClick={() => setOpen(true)} className="mb-4 text-xs text-gold underline">{tr(timeEditable ? "تعديل العنوان أو الوقت" : "تعديل العنوان")}</button>
  );
  const onSave = async () => {
    setBusy(true);
    try {
      await edit({ data: { token, venue_address: venue, ...(timeEditable ? { start_time: start, end_time: end } : {}) } });
      toast.success(tr("حُفظ التعديل ووصل للمصوّرة في الرسائل")); setOpen(false); onChange();
    } catch (e: any) { toast.error(e?.message || tr("تعذّر الحفظ")); }
    finally { setBusy(false); }
  };
  return (
    <div className="mb-4 space-y-2 rounded-xl border border-border p-3">
      <input value={venue} onChange={(e) => setVenue(e.target.value)} maxLength={500} placeholder={tr("عنوان المكان")}
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
      {timeEditable ? (
        <div className="flex items-center gap-2 text-sm">
          <input type="time" value={start} onChange={(e) => setStart(e.target.value)} className="rounded-md border border-border bg-background px-2 py-1.5" />
          <span>—</span>
          <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="rounded-md border border-border bg-background px-2 py-1.5" />
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">{tr("الوقت والتاريخ يتغيّران بالاتفاق مع المصوّرة في الرسائل.")}</p>
      )}
      <div className="flex gap-2">
        <button onClick={onSave} disabled={busy} className="rounded-full bg-charcoal px-5 py-2 text-xs text-ivory disabled:opacity-50">{tr("حفظ")}</button>
        <button onClick={() => setOpen(false)} className="rounded-full border border-border px-4 py-2 text-xs">{tr("إلغاء")}</button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// المصوّرة: تقييم العروس على هذا الحجز + رد علني واحد يظهر تحته في صفحتها
// ---------------------------------------------------------------------------
function ReviewReply({ bookingId }: { bookingId: string }) {
  const get = useServerFn(getBookingReview);
  const reply = useServerFn(replyToReview);
  const confirm = useConfirm();
  const [r, setR] = useState<any>(undefined);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const load = () => get({ data: { booking_id: bookingId } }).then(setR).catch(() => setR(null));
  useEffect(() => { load(); }, [bookingId]);
  if (!r) return null;

  const onSend = async () => {
    const ok = await confirm({ title: tr("نشر الرد؟"), description: tr("يظهر الرد تحت التقييم في صفحتك العامة، ولا يمكن تعديله بعد النشر."), confirmText: tr("نشر") });
    if (!ok) return;
    setBusy(true);
    try { await reply({ data: { booking_id: bookingId, reply: text } }); toast.success(tr("نُشر ردّك")); load(); }
    catch (e: any) { toast.error(e?.message || tr("تعذّر النشر")); }
    finally { setBusy(false); }
  };
  return (
    <div className="rounded-xl border border-border p-4 text-sm">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="font-semibold">{tr("تقييم العروس")}</div>
        <div className="flex">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`h-3.5 w-3.5 ${i < r.rating ? "fill-gold text-gold" : "text-muted-foreground/40"}`} />)}</div>
      </div>
      {r.comment && <p className="whitespace-pre-wrap text-muted-foreground">{tx(r.comment)}</p>}
      {!r.is_published && <p className="mt-1 text-xs text-muted-foreground">{tr("بانتظار مراجعة فريق ميموريا قبل النشر.")}</p>}
      {r.photographer_reply ? (
        <div className="mt-3 rounded-lg bg-secondary/50 p-3">
          <div className="mb-1 text-xs text-muted-foreground">{tr("ردّك المنشور")}</div>
          <p className="whitespace-pre-wrap">{tx(r.photographer_reply)}</p>
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} maxLength={1000}
            placeholder={tr("ردّ علني واحد (اختياري) — بهدوء واحترام، تقرؤه العرائس الأخريات")}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
          <button onClick={onSend} disabled={busy || text.trim().length < 2} className="rounded-full bg-charcoal px-5 py-2 text-xs text-ivory disabled:opacity-50">{tr("نشر الرد")}</button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// المصوّرة: سجل رقم العروس آخر سنة (يظهر فقط إذا في شي يُذكر)
// ---------------------------------------------------------------------------
export function ClientHistory({ bookingId }: { bookingId: string }) {
  const get = useServerFn(getClientHistory);
  const [h, setH] = useState<any>(null);
  useEffect(() => { get({ data: { booking_id: bookingId } }).then(setH).catch(() => setH(null)); }, [bookingId]);
  if (!h || (!h.completed && !h.bride_cancelled)) return null;
  const warn = h.bride_cancelled >= 2;
  return (
    <div className={`rounded-xl p-3 text-xs ${warn ? "bg-amber-50 text-amber-900 dark:bg-amber-500/10 dark:text-amber-300" : "bg-secondary/50 text-muted-foreground"}`}>
      <div className="font-medium">{tr("سجل هذا الرقم على ميموريا (آخر سنة)")}</div>
      <div className="mt-0.5">
        {[
          h.completed ? tr("{0} حجز مكتمل", [h.completed]) : null,
          h.bride_cancelled ? tr("ألغت {0} طلب بنفسها", [h.bride_cancelled]) : null,
          h.bride_cancelled_after_deposit ? tr("منها {0} بعد العربون", [h.bride_cancelled_after_deposit]) : null,
        ].filter(Boolean).join(" · ")}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// العروس: "إيميلي غلط؟" — طلب تصحيح للإدارة
// ---------------------------------------------------------------------------
export function BrideEmailFix({ token }: { token: string }) {
  const send = useServerFn(requestEmailFix);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  if (done) return <p className="mb-4 text-xs text-muted-foreground">{tr("وصلنا طلبكِ. نتأكد منكِ بالهاتف ثم نصحّح الإيميل.")}</p>;
  if (!open) return <button onClick={() => setOpen(true)} className="mb-4 ms-3 text-xs text-muted-foreground underline">{tr("إيميلي غلط؟")}</button>;
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-border p-3">
      <input type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={tr("الإيميل الصحيح")}
        className="min-w-0 flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm" />
      <button disabled={busy || !email.includes("@")} onClick={async () => {
        setBusy(true);
        try { await send({ data: { token, email } }); setDone(true); }
        catch (e: any) { toast.error(e?.message || tr("تعذّر الإرسال")); }
        finally { setBusy(false); }
      }} className="rounded-full bg-charcoal px-5 py-2 text-xs text-ivory disabled:opacity-50">{tr("إرسال")}</button>
    </div>
  );
}
