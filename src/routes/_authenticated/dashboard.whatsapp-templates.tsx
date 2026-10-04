import { Lightbulb } from "lucide-react";
import { motion } from "framer-motion";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";
import { Header } from "@/components/site/Header";
import { BackToDashboard } from "@/components/site/BackToDashboard";
import { Footer } from "@/components/site/Footer";
import { supabase } from "@/integrations/supabase/client";
import { PremiumLock, useSubscriptionLock } from "@/components/ui/PremiumLock";
import { toast } from "sonner";
import { Plus, Trash2, Save, RefreshCw, MessageCircle, Info } from "lucide-react";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { PageLoader } from "@/components/ui/loading";

export const Route = createFileRoute("/_authenticated/dashboard/whatsapp-templates")({ component: TemplatesPage });

const CATEGORIES = [
  { value: "welcome", label: "ترحيب" },
  { value: "deposit", label: "طلب عربون" },
  { value: "confirmed", label: "تأكيد" },
  { value: "reminder", label: "تذكير" },
  { value: "delivery", label: "تسليم" },
  { value: "review", label: "تقييم" },
  { value: "general", label: "عام" },
];

// متى يُستخدم كل نوع — يظهر تحت القالب كتلميح
const CATEGORY_HINT: Record<string, string> = {
  welcome: "بعد وصول طلب حجز جديد",
  deposit: "لتذكير العروس بإرسال العربون",
  confirmed: "بعد تأكيد العربون",
  reminder: "قبل يوم التصوير",
  delivery: "عند تسليم الصور",
  review: "بعد استلام الصور",
  general: "متى شئتِ",
};

// قيم تجريبية لمعاينة شكل الرسالة
const SAMPLE: Record<string, string> = {
  "{{client_name}}": "رنا",
  "{{event_date}}": "١٢ تشرين الثاني",
  "{{venue}}": "قاعة الياسمين",
  "{{deposit_amount}}": "١٥٠ د.أ",
  "{{total_price}}": "٦٠٠ د.أ",
  "{{service}}": "تصوير فوتوغرافي",
  "{{tracking_url}}": "memoria.app/track/…",
};

const VARIABLES = [
  { k: "{{client_name}}", desc: "اسم العميلة" },
  { k: "{{event_date}}", desc: "تاريخ المناسبة" },
  { k: "{{venue}}", desc: "الموقع" },
  { k: "{{deposit_amount}}", desc: "قيمة العربون" },
  { k: "{{total_price}}", desc: "المجموع" },
  { k: "{{service}}", desc: "نوع الخدمة" },
  { k: "{{tracking_url}}", desc: "رابط تتبع الحجز" },
];

function TemplatesPage() {
  const { isLocked, lockLoading } = useSubscriptionLock();

  const nav = useNavigate();
  const [uid, setUid] = useState<string>("");
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savedBodies, setSavedBodies] = useState<Record<string, string>>({});
  const [justSaved, setJustSaved] = useState<string | null>(null);
  const confirm = useConfirm();

  const load = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return nav({ to: "/login" });
    setUid(session.user.id);
    const { data } = await supabase
      .from("whatsapp_templates")
      .select("*")
      .eq("photographer_id", session.user.id)
      .order("sort_order");
    setItems(data ?? []);
    setSavedBodies(Object.fromEntries((data ?? []).map((t: any) => [t.id, JSON.stringify([t.name, t.category, t.body])])));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const seedDefaults = async () => {
    if (!uid) return;
    const { error } = await supabase.rpc("seed_default_whatsapp_templates", { _photographer_id: uid });
    if (error) return toast.error(error.message);
    toast.success("تم إضافة القوالب الافتراضية");
    load();
  };

  const addNew = async () => {
    if (!uid) return;
    const { error } = await supabase.from("whatsapp_templates").insert({
      photographer_id: uid,
      name: "قالب جديد",
      category: "general",
      body: "مرحباً {{client_name}}",
      sort_order: (items[items.length - 1]?.sort_order ?? 0) + 1,
    });
    if (error) return toast.error(error.message);
    load();
  };

  const save = async (t: any) => {
    const { error } = await supabase
      .from("whatsapp_templates")
      .update({ name: t.name, category: t.category, body: t.body })
      .eq("id", t.id);
    if (error) return toast.error(error.message);
    setSavedBodies((sb) => ({ ...sb, [t.id]: JSON.stringify([t.name, t.category, t.body]) }));
    setJustSaved(t.id);
    setTimeout(() => setJustSaved((x) => (x === t.id ? null : x)), 1600);
  };

  // حذف مع تراجع: نخفي القالب فوراً ونحذفه بعد انتهاء المهلة
  const remove = (id: string) => {
    const before = items;
    const t = items.find((x) => x.id === id);
    setItems((prev) => prev.filter((x) => x.id !== id));
    let settled = false;
    const commit = async () => {
      if (settled) return;
      settled = true;
      const { error } = await supabase.from("whatsapp_templates").delete().eq("id", id);
      if (error) { toast.error(error.message); load(); }
    };
    toast(`حُذف قالب «${t?.name ?? ""}»`, {
      duration: 5000,
      action: { label: "تراجع", onClick: () => { settled = true; setItems(before); } },
      onAutoClose: commit,
      onDismiss: commit,
    });
  };

  const updateLocal = (id: string, patch: any) => {
    setItems((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  };

  if (loading) return <PageLoader />;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <section className="container-editorial py-12">
        <BackToDashboard />
        <div className="flex items-end justify-between mt-2 mb-6">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-gold mb-1">قوالب جاهزة</div>
            <h1 className="font-serif text-4xl flex items-center gap-2"><MessageCircle className="h-7 w-7 text-emerald-600" /> رسائل واتساب</h1>
            <p className="text-sm text-muted-foreground mt-2">أنشئي قوالب جاهزة وأرسليها بنقرة من صفحة كل حجز.</p>
          </div>
          <div className="flex gap-2">
            {items.length === 0 && (
              <button onClick={seedDefaults} className="inline-flex items-center gap-2 text-sm border border-border px-4 py-2 rounded-sm hover:bg-secondary active:scale-95 transition-transform duration-200">
                <RefreshCw className="h-4 w-4" /> إضافة قوالب جاهزة
              </button>
            )}
            <button onClick={addNew} className="inline-flex items-center gap-2 text-sm bg-charcoal text-ivory px-4 py-2 rounded-sm hover:opacity-90 active:scale-95 transition-transform duration-200">
              <Plus className="h-4 w-4" /> قالب جديد
            </button>
          </div>
        </div>

        <p className="mb-6 flex items-center gap-2 text-xs text-muted-foreground">
          <Info className="h-3.5 w-3.5 text-gold" /> انقري على أي متغيّر تحت القالب لإضافته مكان المؤشّر — يُستبدل تلقائياً ببيانات الحجز عند الإرسال.
        </p>

        {items.length === 0 ? (
          <div className="rounded-sm border border-dashed border-border p-12 text-center text-muted-foreground">
            لا توجد قوالب بعد. اضغطي "إضافة قوالب جاهزة" للبدء بـ 6 قوالب جاهزة.
          </div>
        ) : (
          <div className="grid gap-4">
            <AnimatePresence initial={false}>
              {items.map((t) => (
                <TemplateCard
                  key={t.id}
                  t={t}
                  dirty={savedBodies[t.id] !== JSON.stringify([t.name, t.category, t.body])}
                  justSaved={justSaved === t.id}
                  onChange={(patch) => updateLocal(t.id, patch)}
                  onSave={() => save(t)}
                  onRemove={() => remove(t.id)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </section>
      <Footer />
    </div>
  );
}

function TemplateCard({ t, dirty, justSaved, onChange, onSave, onRemove }: {
  t: any; dirty: boolean; justSaved: boolean; onChange: (patch: any) => void; onSave: () => void; onRemove: () => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const insert = (k: string) => {
    const el = ref.current;
    const body: string = t.body ?? "";
    const start = el?.selectionStart ?? body.length;
    const end = el?.selectionEnd ?? body.length;
    const next = body.slice(0, start) + k + body.slice(end);
    onChange({ body: next });
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      el.setSelectionRange(start + k.length, start + k.length);
    });
  };
  const preview = Object.entries(SAMPLE).reduce((acc, [k, v]) => acc.split(k).join(v), t.body ?? "");
  const long = (t.body ?? "").length > 600;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className="rounded-2xl border border-border bg-card p-5"
    >
      <div className="grid gap-3 md:grid-cols-3 mb-1">
        <input
          value={t.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="اسم القالب"
          className="md:col-span-2 rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium focus:border-gold/60 focus:outline-none"
        />
        <select
          value={t.category}
          onChange={(e) => onChange({ category: e.target.value })}
          className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
        >
          {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">يُستخدم: {CATEGORY_HINT[t.category] ?? "متى شئتِ"}</p>

      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <textarea
            ref={ref}
            value={t.body}
            onChange={(e) => onChange({ body: e.target.value })}
            rows={7}
            className="w-full rounded-xl border border-border bg-background p-3 text-sm leading-loose focus:border-gold/60 focus:outline-none"
            dir="rtl"
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {VARIABLES.map((v) => (
              <button
                key={v.k}
                type="button"
                onClick={() => insert(v.k)}
                className="rounded-full border border-gold/30 bg-gold/5 px-2.5 py-1 text-[11px] text-gold transition-colors hover:bg-gold/15 active:scale-95"
                title={v.k}
              >
                + {v.desc}
              </button>
            ))}
          </div>
          {long && <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">الرسائل القصيرة تُقرأ أكثر — حاولي الاختصار.</p>}
        </div>

        {/* معاينة كما تصل في واتساب */}
        <div className="rounded-xl bg-[#e5ddd5] p-4 dark:bg-[#0b141a]">
          <div className="mb-2 text-[11px] text-black/50 dark:text-white/50">معاينة (ببيانات تجريبية)</div>
          <motion.div
            key={preview.length}
            initial={{ opacity: 0.85 }}
            animate={{ opacity: 1 }}
            className="ms-auto max-w-[90%] whitespace-pre-wrap rounded-xl rounded-tr-sm bg-[#dcf8c6] px-3 py-2 text-sm leading-relaxed text-black shadow-sm dark:bg-[#005c4b] dark:text-white"
          >
            {preview || "…"}
          </motion.div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-end gap-2">
        <button onClick={onRemove} className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
          <Trash2 className="h-3.5 w-3.5" /> حذف
        </button>
        <button
          onClick={onSave}
          disabled={!dirty && !justSaved}
          className="inline-flex items-center gap-1 rounded-full bg-charcoal px-4 py-1.5 text-xs text-ivory transition-transform active:scale-95 disabled:opacity-40 dark:bg-gold dark:text-charcoal"
        >
          {justSaved ? <><Check className="h-3.5 w-3.5" /> حُفظ</> : <><Save className="h-3.5 w-3.5" /> {dirty ? "حفظ" : "محفوظ"}</>}
        </button>
      </div>
    </motion.div>
  );
}
