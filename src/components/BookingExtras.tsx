import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { CheckCircle2, AlertTriangle, FileSignature, ClipboardList } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { confirmReady, saveEventDayInfo, addAddendum, withdrawAddendum, respondAddendum } from "@/lib/extras.functions";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { g } from "@/hooks/use-gender";
import { t as tr, tx } from "@/i18n";

// ============================================================================
// BookingExtras — ثلاث حمايات بعد تأكيد الحجز:
//  1) "جاهزة للموعد": المصوّرة تؤكّد خلال آخر أسبوع، والعروس ترى التأكيد (وتنبيهاً إن تأخّر)
//  2) استمارة يوم العرس: قيود القاعة والضيوف والستوري، تراها المصوّرة
//  3) ملحق اتفاق: أي إضافة بعد الحجز تُكتب هنا وتعتمد بموافقة العروس (المبلغ يُضاف للمتبقي)
// ============================================================================

type Addendum = { id: string; description: string; amount: number; status: string; created_at: string };

export type EventDayInfo = {
  no_flash?: boolean; no_drone?: boolean; women_only?: boolean;
  live_story?: "yes" | "no"; skip_guests?: string; plan_b?: string; extra?: string; saved_at?: string;
};

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
  const [busy, setBusy] = useState(false);

  const active = b.status === "confirmed" || b.status === "completed";
  const loadAddenda = async () => {
    const { data } = await (supabase as any).from("booking_addenda")
      .select("id, description, amount, status, created_at").eq("booking_id", b.id).neq("status", "withdrawn").order("created_at");
    setAddenda((data ?? []) as Addendum[]);
  };
  useEffect(() => { if (active) loadAddenda(); }, [b.id, active]);
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
  const onAdd = async () => {
    const amt = Number(amount || 0);
    const ok = await confirm({
      title: tr("إرسال الملحق للعروس؟"),
      description: amt > 0 ? tr("بعد موافقتها يُضاف {0} د.أ إلى المتبقي.", [amt]) : tr("بدون مبلغ إضافي."),
      confirmText: tr("إرسال"),
    });
    if (!ok) return;
    setBusy(true);
    try {
      await add({ data: { booking_id: b.id, description: desc, amount: amt } });
      toast.success(tr("أُرسل الملحق للعروس"));
      setDesc(""); setAmount(""); setOpen(false); loadAddenda();
    } catch (e: any) { toast.error(e?.message || tr("تعذّر الإرسال")); }
    finally { setBusy(false); }
  };
  const onWithdraw = async (id: string) => {
    try { await withdraw({ data: { id } }); loadAddenda(); }
    catch (e: any) { toast.error(e?.message || tr("تعذّر السحب")); }
  };

  return (
    <div className="space-y-4">
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

      <div className="rounded-xl border border-border p-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold"><ClipboardList className="h-4 w-4 text-gold" /> {tr("تفاصيل يوم العرس من العروس")}</div>
        {info ? <EventDaySummary info={info} /> : <p className="text-xs text-muted-foreground">{tr("لم تعبّئها العروس بعد. تظهر لها في صفحة الحجز.")}</p>}
      </div>

      <div className="rounded-xl border border-border p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-semibold"><FileSignature className="h-4 w-4 text-gold" /> {tr("ملاحق الاتفاق")}</div>
          {!open && <button onClick={() => setOpen(true)} className="text-xs text-gold underline">{tr("+ ملحق جديد")}</button>}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{tr("اتفقتما على شيء جديد (ساعة إضافية، ألبوم، تغيير)؟ اكتبيه هنا. لا يُعتمد إلا بموافقة العروس.")}</p>
        {addenda.length > 0 && (
          <ul className="mt-3 space-y-2">
            {addenda.map((a) => (
              <li key={a.id} className="rounded-lg bg-secondary/50 p-3 text-sm">
                <div className="whitespace-pre-wrap">{tx(a.description)}</div>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs">
                  <span>{Number(a.amount) > 0 ? tr("+{0} د.أ", [a.amount]) : tr("بدون مبلغ")}</span>
                  <span className={STATUS[a.status]?.c}>{tx(tr(STATUS[a.status]?.t ?? a.status))}</span>
                  {a.status === "pending" && <button onClick={() => onWithdraw(a.id)} className="text-muted-foreground underline">{tr("سحب")}</button>}
                </div>
              </li>
            ))}
          </ul>
        )}
        {open && (
          <div className="mt-3 space-y-2">
            <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} maxLength={1000}
              placeholder={tr("مثال: ساعة تصوير إضافية بعد الزفّة")}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
            <div className="flex flex-wrap items-center gap-2">
              <input type="number" inputMode="decimal" min={0} value={amount} onChange={(e) => setAmount(e.target.value)}
                placeholder={tr("المبلغ (اختياري)")} className="w-40 rounded-md border border-border bg-background px-3 py-2 text-sm" />
              <span className="text-xs text-muted-foreground">{tr("د.أ — يُضاف إلى المتبقي")}</span>
            </div>
            <div className="flex gap-2">
              <button onClick={onAdd} disabled={busy || desc.trim().length < 2} className="rounded-full bg-charcoal px-5 py-2 text-xs text-ivory disabled:opacity-50">{tr("إرسال للعروس")}</button>
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

  if (b.status !== "confirmed" && b.status !== "completed") return null;
  const d = daysToEvent(b.event_date);
  const upcoming = b.status === "confirmed" && d !== null && d >= 0;
  const pending: Addendum[] = (b.addenda ?? []).filter((a: Addendum) => a.status === "pending");
  const decided: Addendum[] = (b.addenda ?? []).filter((a: Addendum) => a.status !== "pending");

  const onSave = async () => {
    setBusy(true);
    try { await save({ data: { token, info: f } }); toast.success(tr("وصلت التفاصيل للمصوّرة")); setEditing(false); onChange(); }
    catch (e: any) { toast.error(e?.message || tr("تعذّر الحفظ")); }
    finally { setBusy(false); }
  };
  const onRespond = async (a: Addendum, accept: boolean) => {
    const ok = await confirm({
      title: accept ? tr("الموافقة على الملحق؟") : tr("رفض الملحق؟"),
      description: accept && Number(a.amount) > 0 ? tr("سيُضاف {0} د.أ إلى المبلغ المتبقي.", [a.amount]) : tx(a.description),
      confirmText: accept ? tr("أوافق") : tr("أرفض"),
    });
    if (!ok) return;
    try { await respond({ data: { token, id: a.id, accept } }); toast.success(accept ? tr("تمت الموافقة") : tr("رُفض الملحق")); onChange(); }
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

      {pending.length > 0 && (
        <div id="addenda-step" className="scroll-mt-24 mb-6 rounded-2xl border border-gold bg-gold/10 p-5">
          <h2 className="font-serif text-lg mb-1">{tr("ملحق اتفاق بانتظار موافقتكِ")}</h2>
          <p className="text-xs text-muted-foreground mb-3">{tr("لا يُعتمد أي اتفاق جديد إلا بموافقتكِ هنا.")}</p>
          <ul className="space-y-3">
            {pending.map((a) => (
              <li key={a.id} className="rounded-xl bg-background p-4 text-sm">
                <div className="whitespace-pre-wrap">{tx(a.description)}</div>
                <div className="mt-1 text-xs text-muted-foreground">{Number(a.amount) > 0 ? tr("مبلغ إضافي: {0} د.أ (يُضاف إلى المتبقي)", [a.amount]) : tr("بدون مبلغ إضافي")}</div>
                <div className="mt-3 flex gap-2">
                  <button onClick={() => onRespond(a, true)} className="rounded-full bg-charcoal px-5 py-2 text-xs text-ivory">{tr("أوافق")}</button>
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
                <span className="whitespace-pre-wrap">{tx(a.description)}{Number(a.amount) > 0 ? ` (+${a.amount} ${tr("د.أ")})` : ""}</span>
                <span className={`text-xs ${STATUS[a.status]?.c}`}>{tx(tr(a.status === "accepted" ? "وافقتِ عليه" : "رفضتِه"))}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
