import { useEffect, useMemo, useState } from "react";
import { g } from "@/hooks/use-gender";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { CheckCircle2, Loader2, MessageCircle, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { createManualBooking } from "@/lib/manual-booking.functions";
import { CopyButton } from "@/components/ui/copy-button";

// ============================================================================
// ManualBookingSheet — إضافة حجز وصل من الواتساب/الهاتف بأقل من 30 ثانية،
// ثم إرسال رابط المتابعة للعميلة على واتساب برسالة جاهزة.
// ============================================================================

const inputCx = "w-full h-10 px-3 rounded-xl border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50";

type Rule = { id: string; label: string; price: number; service: "photography" | "cinematic_video"; package: string };
type Created = Awaited<ReturnType<typeof createManualBooking>>;

export function normalizeWa(phone?: string | null) {
  if (!phone) return "";
  let p = phone.replace(/[^\d]/g, "");
  if (p.startsWith("00")) p = p.slice(2);
  if (p.startsWith("0")) p = "962" + p.slice(1);
  if (/^7\d{8}$/.test(p)) p = "962" + p;
  return p;
}

export function buildClientWhatsAppMessage(o: {
  clientName: string; photographerName: string; eventDate: string; total: number; deposit: number;
  confirmed: boolean; trackUrl: string; contractUrl?: string | null; cliqAlias?: string | null;
}) {
  const date = new Date(o.eventDate).toLocaleDateString("ar-JO", { weekday: "long", day: "numeric", month: "long" });
  const lines = [
    `مرحباً ${o.clientName} 🤍`,
    `سجّلت حجزك ${o.photographerName ? `مع ${o.photographerName} ` : ""}بتاريخ ${date}.`,
    ``,
    `من هذا الرابط بتتابعي كل شيء: الموعد، العربون، العقد، ومراحل تجهيز صورك:`,
    o.trackUrl,
  ];
  if (o.contractUrl) lines.push(``, `العقد للمراجعة والتوقيع:`, o.contractUrl);
  if (!o.confirmed && o.deposit > 0) {
    lines.push(``, `لتثبيت الموعد: عربون ${o.deposit} د.أ${o.cliqAlias ? ` عبر CliQ على ${o.cliqAlias}` : ""}، وارفعي إثبات التحويل من نفس الرابط.`);
  }
  lines.push(``, `المجموع: ${o.total} د.أ`);
  return lines.join("\n");
}

export function ManualBookingSheet({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated?: () => void }) {
  const createFn = useServerFn(createManualBooking);
  const [rules, setRules] = useState<Rule[]>([]);
  const [depositCfg, setDepositCfg] = useState<{ fixed: number | null; percent: number }>({ fixed: null, percent: 25 });
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState<(Created & { form: typeof f }) | null>(null);
  const [f, setF] = useState({
    client_name: "", client_phone: "", client_email: "",
    service: "photography" as "photography" | "cinematic_video",
    event_date: "", start_time: "18:00", end_time: "23:00",
    venue_name: "", rule_id: "", total_price: "", deposit_amount: "", deposit_received: false, notes: "",
  });
  const upd = (k: keyof typeof f, v: any) => setF((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    if (!open) return;
    setDone(null);
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const [{ data: r }, { data: p }] = await Promise.all([
        supabase.from("pricing_rules").select("id,label,price,service,package").eq("photographer_id", session.user.id).neq("package", "addon").order("price"),
        supabase.from("profiles").select("fixed_deposit, deposit_percent").eq("id", session.user.id).maybeSingle(),
      ]);
      setRules((r ?? []) as Rule[]);
      setDepositCfg({ fixed: (p as any)?.fixed_deposit ?? null, percent: Number((p as any)?.deposit_percent ?? 25) });
    })().catch(() => {});
  }, [open]);

  const suggestedDeposit = (total: number) =>
    total > 0 ? (depositCfg.fixed != null ? Number(depositCfg.fixed) : Math.round(total * depositCfg.percent / 100)) : 0;

  const pickRule = (id: string) => {
    const r = rules.find((x) => x.id === id);
    setF((p) => ({
      ...p, rule_id: id,
      ...(r ? { service: r.service, total_price: String(r.price), deposit_amount: String(suggestedDeposit(Number(r.price))) } : {}),
    }));
  };

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const message = useMemo(() => {
    if (!done) return "";
    return buildClientWhatsAppMessage({
      clientName: done.form.client_name,
      photographerName: done.photographer_name,
      eventDate: done.form.event_date,
      total: Number(done.form.total_price || 0),
      deposit: Number(done.form.deposit_amount || 0),
      confirmed: done.confirmed,
      trackUrl: `${origin}/track/${done.tracking_token}`,
      contractUrl: done.contract_token ? `${origin}/contracts/${done.contract_token}` : null,
      cliqAlias: done.cliq_alias,
    });
  }, [done, origin]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const rule = rules.find((r) => r.id === f.rule_id);
      const res = await createFn({
        data: {
          client_name: f.client_name, client_phone: f.client_phone, client_email: f.client_email,
          service: f.service, event_date: f.event_date, start_time: f.start_time, end_time: f.end_time,
          venue_name: f.venue_name, total_price: Number(f.total_price || 0), deposit_amount: Number(f.deposit_amount || 0),
          deposit_received: f.deposit_received, package_label: rule?.label, notes: f.notes,
        },
      });
      setDone({ ...res, form: f });
      onCreated?.();
      toast.success("انضاف الحجز ✓");
    } catch (err: any) {
      toast.error(err?.message || "تعذّر إضافة الحجز");
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setF({ client_name: "", client_phone: "", client_email: "", service: "photography", event_date: "", start_time: "18:00", end_time: "23:00", venue_name: "", rule_id: "", total_price: "", deposit_amount: "", deposit_received: false, notes: "" });
    setDone(null);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center" onClick={() => !saving && onClose()} dir="rtl">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-card p-5 shadow-xl sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-2xl">{done ? "انضاف الحجز" : "حجز يدوي"}</h2>
          <button onClick={onClose} aria-label="إغلاق" className="rounded-full p-1.5 text-muted-foreground hover:bg-secondary"><X className="h-5 w-5" /></button>
        </div>

        {done ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                الحجز بتقويمك {done.confirmed ? "ومؤكَّد" : "وبانتظار العربون"}.
                {done.contract_token ? " والعقد جاهز للتوقيع." : ""} ابعتي الرابط للعميلة لتتابع كل شيء من المنصة.
              </div>
            </div>
            <div className="whitespace-pre-wrap rounded-xl border border-border bg-secondary/40 p-3 text-sm leading-relaxed">{message}</div>
            <button
              onClick={() => window.open(`https://wa.me/${normalizeWa(done.form.client_phone)}?text=${encodeURIComponent(message)}`, "_blank")}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-[#25D366] py-3 font-medium text-white hover:opacity-90"
            >
              <MessageCircle className="h-5 w-5" /> ابعتي للعميلة على واتساب
            </button>
            <div className="flex flex-wrap gap-2">
              <CopyButton value={message} label="نسخ الرسالة" />
              <Link to="/dashboard/bookings/$id" params={{ id: done.booking_id }} className="rounded-full border border-border px-4 py-2 text-sm hover:bg-secondary">فتح الحجز</Link>
              <button onClick={reset} className="rounded-full border border-border px-4 py-2 text-sm hover:bg-secondary">حجز يدوي آخر</button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <label className="col-span-2 text-sm">اسم العميلة
                <input required value={f.client_name} onChange={(e) => upd("client_name", e.target.value)} className={inputCx} placeholder="سارة أحمد" />
              </label>
              <label className="text-sm">رقم الواتساب
                <input required value={f.client_phone} onChange={(e) => upd("client_phone", e.target.value)} className={inputCx} placeholder="07XXXXXXXX" dir="ltr" inputMode="tel" />
              </label>
              <label className="text-sm">الإيميل (اختياري)
                <input type="email" value={f.client_email} onChange={(e) => upd("client_email", e.target.value)} className={inputCx} dir="ltr" />
              </label>
              <label className="text-sm">التاريخ
                <input required type="date" value={f.event_date} onChange={(e) => upd("event_date", e.target.value)} className={inputCx} />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-sm">من
                  <input required type="time" value={f.start_time} onChange={(e) => upd("start_time", e.target.value)} className={inputCx} />
                </label>
                <label className="text-sm">إلى
                  <input required type="time" value={f.end_time} onChange={(e) => upd("end_time", e.target.value)} className={inputCx} />
                </label>
              </div>
              <label className="col-span-2 text-sm">الباقة
                <select value={f.rule_id} onChange={(e) => pickRule(e.target.value)} className={inputCx}>
                  <option value="">سعر مخصّص</option>
                  {rules.map((r) => <option key={r.id} value={r.id}>{r.label} — {r.price} د.أ</option>)}
                </select>
              </label>
              {!f.rule_id && (
                <label className="col-span-2 text-sm">الخدمة
                  <select value={f.service} onChange={(e) => upd("service", e.target.value)} className={inputCx}>
                    <option value="photography">تصوير فوتوغرافي</option>
                    <option value="cinematic_video">فيديو سينمائي</option>
                  </select>
                </label>
              )}
              <label className="text-sm">المجموع (د.أ)
                <input required type="number" min={0} step="0.5" value={f.total_price}
                  onChange={(e) => { upd("total_price", e.target.value); if (!f.deposit_amount) upd("deposit_amount", String(suggestedDeposit(Number(e.target.value)))); }}
                  className={inputCx} dir="ltr" />
              </label>
              <label className="text-sm">العربون (د.أ)
                <input type="number" min={0} step="0.5" value={f.deposit_amount} onChange={(e) => upd("deposit_amount", e.target.value)} className={inputCx} dir="ltr" />
              </label>
              <label className="col-span-2 flex items-center gap-2 rounded-xl border border-border p-3 text-sm">
                <input type="checkbox" checked={f.deposit_received} onChange={(e) => upd("deposit_received", e.target.checked)} className="h-4 w-4 accent-[var(--gold)]" />
                <span>العربون وصلني — <span className="text-muted-foreground">تأكّدت من تطبيق البنك</span></span>
              </label>
              <label className="col-span-2 text-sm">القاعة / المكان (اختياري)
                <input value={f.venue_name} onChange={(e) => upd("venue_name", e.target.value)} className={inputCx} />
              </label>
              <label className="col-span-2 text-sm">ملاحظات (اختياري)
                <textarea value={f.notes} onChange={(e) => upd("notes", e.target.value)} rows={2} className={`${inputCx} h-auto py-2`} />
              </label>
            </div>
            <button disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-full bg-charcoal py-3 font-medium text-ivory hover:opacity-90 disabled:opacity-60 dark:bg-gold dark:text-charcoal">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving ? "نضيف الحجز…" : "إضافة الحجز"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
