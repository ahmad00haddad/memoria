import { Plus, Trash2, Smartphone, Landmark, Zap } from "lucide-react";
import { CopyButton } from "@/components/ui/copy-button";
import { g } from "@/hooks/use-gender";
import { t as tr, tx } from "@/i18n";
import { JO_BANKS, WALLETS, emptyMethod, isUsable, type PaymentKind, type PaymentMethod } from "@/lib/payment-methods";

const input = "w-full rounded-sm border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50";

const KIND_LABEL: Record<PaymentKind, string> = { cliq: "CliQ", wallet: "محفظة إلكترونية", bank: "تحويل بنكي" };
const KIND_ICON: Record<PaymentKind, typeof Zap> = { cliq: Zap, wallet: Smartphone, bank: Landmark };

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-muted-foreground">{tx(label)}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-muted-foreground">{tx(hint)}</span>}
    </label>
  );
}

/** محرّر طرق استلام العربون: تضيف المصوّرة طريقة أو أكثر، ولكل طريقة خاناتها. */
export function PaymentMethodsEditor({ value, onChange }: { value: PaymentMethod[]; onChange: (v: PaymentMethod[]) => void }) {
  const set = (i: number, patch: Partial<PaymentMethod>) => onChange(value.map((m, j) => (j === i ? { ...m, ...patch } : m)));
  const remove = (i: number) => onChange(value.filter((_, j) => j !== i));
  const add = (kind: PaymentKind) => onChange([...value, emptyMethod(kind)]);

  return (
    <div className="space-y-3">
      <datalist id="jo-banks">{[...JO_BANKS, ...WALLETS].map((b) => <option key={b} value={b} />)}</datalist>
      <datalist id="jo-wallets">{WALLETS.map((w) => <option key={w} value={w} />)}</datalist>

      {value.map((m, i) => {
        const Icon = KIND_ICON[m.kind];
        const incomplete = !isUsable(m);
        return (
          <div key={i} className={`rounded-xl border p-4 ${incomplete ? "border-amber-300/70 dark:border-amber-800/60" : "border-border"}`}>
            <div className="mb-3 flex items-center justify-between">
              <span className="inline-flex items-center gap-2 text-sm font-medium"><Icon className="h-4 w-4 text-gold" />{tx(KIND_LABEL[m.kind])}</span>
              <button type="button" onClick={() => remove(i)} aria-label={tr("حذف هذه الطريقة")} className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {m.kind === "cliq" && (
                <>
                  <Field label="CliQ alias *"><input dir="ltr" className={input} value={m.alias ?? ""} onChange={(e) => set(i, { alias: e.target.value })} placeholder="SARA.PHOTO" /></Field>
                  <Field label="البنك أو المحفظة المربوط عليها" hint="بعض البنوك تطلبه من العروس عند التحويل."><input list="jo-banks" className={input} value={m.provider ?? ""} onChange={(e) => set(i, { provider: e.target.value })} placeholder={tr("مثلاً: البنك العربي")} /></Field>
                </>
              )}
              {m.kind === "wallet" && (
                <>
                  <Field label="اسم المحفظة *"><input list="jo-wallets" className={input} value={m.provider ?? ""} onChange={(e) => set(i, { provider: e.target.value })} placeholder={tr("مثلاً: زين كاش")} /></Field>
                  <Field label="رقم المحفظة *"><input dir="ltr" inputMode="tel" className={input} value={m.number ?? ""} onChange={(e) => set(i, { number: e.target.value })} placeholder="07XXXXXXXX" /></Field>
                </>
              )}
              {m.kind === "bank" && (
                <>
                  <Field label="اسم البنك"><input list="jo-banks" className={input} value={m.bank ?? ""} onChange={(e) => set(i, { bank: e.target.value })} /></Field>
                  <Field label="IBAN *"><input dir="ltr" className={input} value={m.iban ?? ""} onChange={(e) => set(i, { iban: e.target.value })} placeholder="JO00XXXX0000000000000000000000" /></Field>
                </>
              )}
              <Field label="الاسم كما يظهر عند التحويل" hint={g(tr("اسمكِ الكامل (الرباعي) حتى تتأكّد العروس أنها تحوّل للشخص الصحيح."), tr("اسمك الكامل (الرباعي) حتى تتأكّد العروس أنها تحوّل للشخص الصحيح."))}>
                <input className={input} value={m.holder ?? ""} onChange={(e) => set(i, { holder: e.target.value })} />
              </Field>
              <Field label="ملاحظة (اختياري)"><input className={input} value={m.note ?? ""} onChange={(e) => set(i, { note: e.target.value })} placeholder={tr("مثلاً: اكتبي اسمكِ في ملاحظة التحويل")} /></Field>
            </div>
            {incomplete && <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">{tr("أكملي الخانات التي عليها * — الطريقة الناقصة لا تُحفظ.")}</p>}
          </div>
        );
      })}

      <div className="flex flex-wrap gap-2">
        {(["cliq", "wallet", "bank"] as PaymentKind[]).map((k) => {
          const Icon = KIND_ICON[k];
          return (
            <button key={k} type="button" onClick={() => add(k)} className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-dashed border-border px-4 text-sm hover:border-gold/60 hover:text-gold">
              <Plus className="h-3.5 w-3.5" /><Icon className="h-3.5 w-3.5" />{tx(KIND_LABEL[k])}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Row({ label, value, ltr }: { label: string; value?: string; ltr?: boolean }) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">{tx(label)}</div>
        <div className={`break-all ${ltr ? "font-mono text-base" : "text-sm"}`} dir={ltr ? "ltr" : undefined}>{tx(value)}</div>
      </div>
      <CopyButton value={value} label={tr("نسخ")} />
    </div>
  );
}

/** ما تراه العروس بعد الموافقة: كل طريقة بخاناتها وزر نسخ لكل خانة. */
export function PaymentMethodsView({ methods }: { methods: PaymentMethod[] }) {
  const list = methods.filter(isUsable);
  if (!list.length) return null;
  return (
    <div className="space-y-3">
      {list.length > 1 && <p className="text-xs text-muted-foreground">{tr("اختاري الطريقة الأسهل لكِ — كلها تصل للمصوّرة مباشرة.")}</p>}
      {list.map((m, i) => {
        const Icon = KIND_ICON[m.kind];
        return (
          <div key={i} className="rounded-sm border border-border bg-card p-3">
            <div className="mb-1 inline-flex items-center gap-1.5 text-xs font-medium text-gold"><Icon className="h-3.5 w-3.5" />{m.kind === "wallet" && m.provider ? tx(m.provider) : tx(KIND_LABEL[m.kind])}</div>
            {m.kind === "cliq" && <><Row label="CliQ alias" value={m.alias} ltr /><Row label="البنك أو المحفظة" value={m.provider} /></>}
            {m.kind === "wallet" && <Row label="رقم المحفظة" value={m.number} ltr />}
            {m.kind === "bank" && <><Row label="البنك" value={m.bank} /><Row label="IBAN" value={m.iban} ltr /></>}
            <Row label="اسم المستلِم" value={m.holder} />
            {m.note && <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{tx(m.note)}</p>}
          </div>
        );
      })}
    </div>
  );
}
