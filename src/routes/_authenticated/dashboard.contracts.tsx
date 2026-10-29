import { friendlyError } from "@/lib/friendlyErrors";
import { g } from "@/hooks/use-gender";
import { Lightbulb } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRef } from "react";
import { CopyButton } from "@/components/ui/copy-button";
import { MessageCircle, Clock, CheckCircle2, ChevronDown } from "lucide-react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { PageLoader } from "@/components/ui/loading";
import { useEffect, useState } from "react";
import { Header } from "@/components/site/Header";
import { BackToDashboard } from "@/components/site/BackToDashboard";
import { Footer } from "@/components/site/Footer";
import { supabase } from "@/integrations/supabase/client";
import { PremiumLock, useSubscriptionLock } from "@/components/ui/PremiumLock";
import { toast } from "sonner";
import { ScrollText, Plus, Copy } from "lucide-react";
import { locale } from "@/i18n";
import { t as tr, tx } from "@/i18n";

export const Route = createFileRoute("/_authenticated/dashboard/contracts")({ component: Contracts });

const DEFAULT_TEMPLATE = `بسم الله الرحمن الرحيم
عقد خدمات تصوير زفاف

يُبرم هذا العقد بين المصوّر/ة (الطرف الأول) والعميل/ة [اسم العميل] (الطرف الثاني)، وفق البنود الآتية:

أولاً — تفاصيل الحجز
• تاريخ الحفل: [التاريخ]
• الموقع: [الموقع]
• مدة التصوير المتفق عليها: من [البداية] إلى [النهاية]
• المبلغ الإجمالي: [المجموع] دينار أردني
• العربون: [العربون] دينار أردني
• المتبقي يُسدَّد كحدّ أقصى في تاريخ الحفل قبل بدء التصوير

ثانياً — التسليم
• تُسلَّم الصور النهائية المعدّلة خلال 30 يوم عمل من تاريخ الحفل
• يُسلَّم الفيديو السينمائي (إن وُجد) خلال 60 يوم عمل
• في حال تأخّر الطرف الأول عن التسليم بدون عذر، يلتزم بخصم 5% من المتبقي عن كل أسبوع تأخير

ثالثاً — التزامات الوقت
• على الطرف الثاني الالتزام بمواعيد الجلسة والصالون
• تأخير العميل عن بداية الجلسة المتفق عليها يُحتسب من ساعات التصوير
• كل ساعة إضافية تتجاوز المدة المتفق عليها = [رسوم الساعة الإضافية] دينار، تُسدَّد نقداً في حينه

رابعاً — التعديل والجودة
• يلتزم الطرف الأول بتعديل احترافي يحافظ على ملامح العروسين الطبيعية
• يحق للعميل طلب تعديل بسيط على حتى 5 صور خلال 14 يوم من الاستلام دون رسوم
• التعديلات الجوهرية أو تغيير ألوان الفستان/المكياج تُعتبر خدمة إضافية بسعر يُتفق عليه

خامساً — الخصوصية وحقوق النشر
• مستوى الخصوصية المتفق عليه: [مستوى الخصوصية]
• لا يجوز للطرف الثاني نشر الصور الخام (RAW) أو إزالة شعار المصوّر/ة
• في حال "بدون نشر علني": لا تُنشر أي صورة على أي وسيلة دون إذن خطي
• في حال "خصوصية تامة": تُحفظ الصور لدى الطرف الأول بكلمة سر، ولا تُسلَّم لأي مساعد دون توقيع تعهد سرية

سادساً — الإلغاء
• العربون: [سياسة العربون]
• إلغاء الحجز قبل 30 يوم من الحفل: لا يُستحق المتبقي
• إلغاء قبل 14 يوم: يتحمّل العميل 50% من قيمة الباقة
• إلغاء خلال أسبوع الحفل: يتحمّل العميل كامل المبلغ

سابعاً — حالات استثنائية
• في حال تعذّر حضور الطرف الأول لظرف قهري، يلتزم بإيجاد بديلة بنفس المستوى توافق عليها العميلة، أو بإرجاع العربون كاملاً
• الكوارث الطبيعية والظروف القهرية العامة: يُطبَّق بند العربون أعلاه ما لم يتّفق الطرفان كتابياً على غير ذلك

ثامناً — التوقيع
بتوقيع العميل أدناه يُعدّ موافقًا على جميع البنود أعلاه وله صلاحية الإلزام القانوني الكامل.`;

const PLACEHOLDERS = ["[اسم العميل]", "[التاريخ]", "[الموقع]", "[البداية]", "[النهاية]", "[المجموع]", "[العربون]", "[رسوم الساعة الإضافية]", "[مستوى الخصوصية]", "[سياسة العربون]"];

function normalizeWa(phone?: string | null) {
  if (!phone) return "";
  let p = phone.replace(/[^\d]/g, "");
  if (p.startsWith("00")) p = p.slice(2);
  if (p.startsWith("0")) p = "962" + p.slice(1);
  return p;
}

function Contracts() {
  const { isLocked, lockReason, lockLoading } = useSubscriptionLock();

  const nav = useNavigate();
  const [uid, setUid] = useState("");
  const [templates, setTemplates] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [body, setBody] = useState(DEFAULT_TEMPLATE);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "signed">("all");
  const [editorOpen, setEditorOpen] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const insertPlaceholder = (ph: string) => {
    const el = bodyRef.current;
    const start = el?.selectionStart ?? body.length;
    const end = el?.selectionEnd ?? body.length;
    setBody(body.slice(0, start) + ph + body.slice(end));
    requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(start + ph.length, start + ph.length); });
  };

  const load = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return nav({ to: "/login" });
    setUid(session.user.id);
    const [{ data: t }, { data: c }] = await Promise.all([
      supabase.from("contract_templates").select("*").eq("photographer_id", session.user.id).order("created_at", { ascending: false }),
      supabase.from("contracts").select("*, bookings(client_name,event_date,client_phone)").eq("photographer_id", session.user.id).order("created_at", { ascending: false }),
    ]);
    setTemplates(t ?? []); setContracts(c ?? []);
  };
  useEffect(() => {
    (async () => {
      try {
        await load();
      } catch (error: any) {
        setLoadError(error?.message || tr("تعذّر تحميل العقود."));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const saveTemplate = async () => {
    if (!name.trim() || !body.trim()) return toast.error(tr("الاسم والمحتوى مطلوبان"));
    const { error } = await supabase.from("contract_templates").insert({ photographer_id: uid, name, body });
    if (error) return toast.error(error.message);
    toast.success(tr("حُفظ قالب «{0}» — يظهر الآن في صفحة كل حجز", [name.trim()])); setName(""); setEditorOpen(false); load();
  };

  // حذف القالب مع مهلة تراجع
  const removeTemplate = (t: any) => {
    setTemplates((l) => l.filter((x) => x.id !== t.id));
    let settled = false;
    const commit = async () => {
      if (settled) return;
      settled = true;
      const { error } = await supabase.from("contract_templates").delete().eq("id", t.id);
      if (error) { toast.error(error.message); load(); }
    };
    toast(tr("حُذف قالب «{0}»", [t.name]), {
      duration: 5000,
      action: { label: tr("تراجع"), onClick: () => { settled = true; load(); } },
      onAutoClose: commit,
      onDismiss: commit,
    });
  };

  const pendingCount = contracts.filter((c) => c.status !== "signed").length;
  const shown = contracts.filter((c) => filter === "all" || (filter === "signed" ? c.status === "signed" : c.status !== "signed"));
  const missingCancel = body.trim().length > 0 && !/إلغاء|الإلغاء/.test(body);

  if (loading || lockLoading) return <PageLoader />;
  if (loadError) return <div className="min-h-screen grid place-items-center px-4 text-sm text-destructive">{friendlyError(loadError)}</div>;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <section className="container-editorial py-12 relative">
        {isLocked && <PremiumLock reason={lockReason} />}
        <div className="mb-4"><BackToDashboard /></div>
        <div className="text-xs uppercase tracking-[0.3em] text-gold mb-1">{tr("العقود")}</div>
        <h1 className="font-serif text-4xl mb-8">{tr("قوالب وعقود التصوير")}</h1>

        {templates.length === 0 && contracts.length === 0 && (
          <div className="rounded-sm border border-border bg-card p-6 shadow-soft mb-8">
            <h2 className="font-serif text-2xl mb-2">{tr("كيف يعمل قسم العقود؟")}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              {g(tr("هنا تبنين القالب مرة واحدة فقط. بعد ذلك، من صفحة أي حجز، يمكنك إنشاء عقد جاهز باسم العميل وتاريخ الحدث والسعر، ثم إرسال رابط التوقيع له مباشرة."), tr("هنا تبني القالب مرة واحدة فقط. بعد ذلك، من صفحة أي حجز، يمكنك إنشاء عقد جاهز باسم العميل وتاريخ الحدث والسعر، ثم إرسال رابط التوقيع له مباشرة."))}
            </p>
            <div className="grid gap-3 md:grid-cols-3 text-sm">
              <div className="rounded-sm border border-border bg-background p-4">{g(tr("1) احفظي قالبًا أساسيًا للعقود."), tr("1) احفظ قالبًا أساسيًا للعقود."))}</div>
              <div className="rounded-sm border border-border bg-background p-4">{g(tr("2) افتحي أي حجز ثم أنشئي عقدًا منه."), tr("2) افتح أي حجز ثم أنشئ عقدًا منه."))}</div>
              <div className="rounded-sm border border-border bg-background p-4">{g(tr("3) انسخي رابط التوقيع وأرسليه للعميل."), tr("3) انسخ رابط التوقيع وأرسله للعميل."))}</div>
            </div>
          </div>
        )}

        {/* ── العقود المُنشأة أولاً: هذا ما تحتاج المصوّرة متابعته ── */}
        <div className="rounded-2xl border border-border bg-card p-6 mb-8">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-serif text-2xl flex items-center gap-2"><ScrollText className="h-5 w-5 text-gold" />{" "}{tr("العقود")}</h2>
            {contracts.length > 0 && (
              <div className="flex gap-1 rounded-full bg-secondary p-1 text-xs">
                {([["all", tr("الكل")], ["pending", tr("بانتظار التوقيع ({0})", [pendingCount])], ["signed", tr("موقّعة")]] as const).map(([k, l]) => (
                  <button key={k} onClick={() => setFilter(k)} className={`relative rounded-full px-3 py-1 transition-colors ${filter === k ? "text-foreground" : "text-muted-foreground"}`}>
                    {filter === k && <motion.span layoutId="contracts-filter" className="absolute inset-0 rounded-full bg-card shadow-sm" />}
                    <span className="relative">{tx(l)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {contracts.length === 0 ? (
            <p className="text-sm text-muted-foreground">{tr("لا عقود بعد. يُنشأ العقد تلقائياً عند تأكيد عربون أي حجز، أو من صفحة الحجز يدوياً.")}</p>
          ) : shown.length === 0 ? (
            <p className="text-sm text-muted-foreground">{tr("لا عقود في هذا القسم.")}</p>
          ) : (
            <ul className="divide-y divide-border">
              {shown.map((c) => {
                const waitingDays = c.status !== "signed" ? Math.floor((Date.now() - new Date(c.created_at).getTime()) / 86400000) : 0;
                const url = typeof window !== "undefined" ? `${window.location.origin}/contracts/${c.sign_token}` : "";
                return (
                  <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <div className="font-medium">{c.bookings?.client_name ?? "—"}</div>
                      <div className="mt-0.5 flex items-center gap-1.5 text-xs">
                        {c.status === "signed" ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400"><CheckCircle2 className="h-3.5 w-3.5" />{" "}{tr("وُقّع {0}", [new Date(c.signed_at).toLocaleDateString(locale("ar-JO"), { day: "numeric", month: "short" })])}</span>
                        ) : (
                          <span className={`inline-flex items-center gap-1 ${waitingDays >= 3 ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground"}`}>
                            <Clock className="h-3.5 w-3.5" />{" "}{tr("بانتظار التوقيع")}{" "}{waitingDays > 0 ? tr("منذ {0} {1}", [waitingDays, waitingDays === 1 ? "يوم" : "أيام"]) : tr("منذ اليوم")}
                          </span>
                        )}
                        {c.bookings?.event_date && <span className="text-muted-foreground">{tr("· الحفل {0}", [new Date(c.bookings.event_date).toLocaleDateString(locale("ar-JO"), { day: "numeric", month: "short" })])}</span>}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {c.status !== "signed" && c.bookings?.client_phone && (
                        <a
                          href={`https://wa.me/${normalizeWa(c.bookings.client_phone)}?text=${encodeURIComponent(tr("مرحباً {0} 🤍 يرجى مراجعة عقد التصوير وتوقيعه من هنا: {1}", [c.bookings.client_name, url]))}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs hover:border-emerald-400 hover:text-emerald-700"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />{" "}{tr("تذكير")}
                        </a>
                      )}
                      <CopyButton value={url} label={tr("الرابط")} />
                      <Link to="/contracts/$token" params={{ token: c.sign_token }} className="rounded-full border border-border px-3 py-1 text-xs hover:bg-secondary">{tr("عرض")}</Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* ── القوالب ── */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-serif text-2xl">{tr("قوالبي")}{" "}<span className="text-base text-muted-foreground tabular-nums">({tx(templates.length)})</span></h2>
            <button onClick={() => setEditorOpen((v) => !v)} className="inline-flex items-center gap-1.5 rounded-full bg-charcoal px-4 py-2 text-sm text-ivory active:scale-95 transition-transform dark:bg-gold dark:text-charcoal">
              <Plus className="h-4 w-4" />{" "}{tr("قالب جديد")}
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${editorOpen ? "rotate-180" : ""}`} />
            </button>
          </div>
          {templates.length === 0 ? (
            <p className="text-sm text-muted-foreground">{g(tr("لا قوالب بعد — العقد القياسي يُستخدم تلقائياً حتى تضيفي قالبك."), tr("لا قوالب بعد — العقد القياسي يُستخدم تلقائياً حتى تضيف قالبك."))}</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              <AnimatePresence initial={false}>
                {templates.map((t) => (
                  <motion.li key={t.id} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-1.5 text-sm">
                    {tx(t.name)}
                    <button onClick={() => removeTemplate(t)} aria-label={tr("حذف {0}", [t.name])} className="text-muted-foreground hover:text-destructive">×</button>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}

          <AnimatePresence initial={false}>
            {editorOpen && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="mt-6 border-t border-border pt-6">
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder={tr("اسم القالب (مثال: عقد عرس قياسي)")}
                    className="w-full rounded-xl border border-input px-3 py-2 mb-3 bg-background" />
                  <textarea ref={bodyRef} value={body} onChange={(e) => setBody(e.target.value)} rows={14}
                    className="w-full rounded-xl border border-input px-3 py-2 bg-background text-sm leading-loose" />
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className="w-full text-xs text-muted-foreground">{g(tr("انقري لإضافة حقل يُملأ تلقائياً من بيانات الحجز:"), tr("انقر لإضافة حقل يُملأ تلقائياً من بيانات الحجز:"))}</span>
                    {PLACEHOLDERS.map((ph) => (
                      <button key={ph} type="button" onClick={() => insertPlaceholder(ph)} className="rounded-full border border-gold/30 bg-gold/5 px-2.5 py-1 text-[11px] text-gold hover:bg-gold/15 active:scale-95">
                        {ph.slice(1, -1)}
                      </button>
                    ))}
                  </div>
                  {missingCancel && <p className="mt-3 text-xs text-amber-700 dark:text-amber-400">{tr("القالب لا يحتوي بنداً للإلغاء — يُفضّل إضافته لحماية حقّك.")}</p>}
                  <button onClick={saveTemplate} disabled={!name.trim()} className="mt-4 rounded-full bg-charcoal px-5 py-2 text-ivory hover:opacity-90 disabled:opacity-50 active:scale-95 transition-transform dark:bg-gold dark:text-charcoal">{tr("حفظ القالب")}</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>
      <Footer />
    </div>
  );
}