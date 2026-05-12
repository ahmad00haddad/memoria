import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Sparkles, Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  aiGenerateBio, aiSuggestReply, aiAnalyzeBrief, aiGenerateCaption,
  aiSuggestPricing, aiContractClause, aiTranslate, aiAskAssistant, aiSeoMeta,
} from "@/lib/ai.functions";

export const Route = createFileRoute("/dashboard/ai-tools")({ component: AiToolsPage });

function AiToolsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <section className="container-editorial py-12 max-w-4xl">
        <Link to="/dashboard" className="text-xs text-muted-foreground hover:text-gold">← اللوحة</Link>
        <div className="mt-2 mb-2 flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-gold" />
          <h1 className="font-serif text-4xl">أدوات الذكاء الاصطناعي</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-8">مدعومة بـ Lovable AI — مجانية ضمن حدود الاستخدام.</p>

        <div className="space-y-6">
          <BioTool />
          <ReplyTool />
          <BriefTool />
          <CaptionTool />
          <PricingTool />
          <ClauseTool />
          <TranslateTool />
          <SeoTool />
          <AssistantTool />
        </div>
      </section>
      <Footer />
    </div>
  );
}

function Box({ title, desc, children }: any) {
  return (
    <div className="rounded-sm border border-border bg-card p-6 shadow-soft">
      <h2 className="font-serif text-xl mb-1">{title}</h2>
      <p className="text-xs text-muted-foreground mb-4">{desc}</p>
      {children}
    </div>
  );
}

function Output({ text }: { text: string }) {
  if (!text) return null;
  return (
    <div className="mt-4 relative rounded-sm border border-border bg-secondary/50 p-4 whitespace-pre-wrap text-sm leading-relaxed">
      <button onClick={() => { navigator.clipboard.writeText(text); toast.success("نُسخ"); }}
        className="absolute top-2 left-2 text-xs inline-flex items-center gap-1 bg-card border border-border rounded-sm px-2 py-1 hover:bg-secondary">
        <Copy className="h-3 w-3" /> نسخ
      </button>
      {text}
    </div>
  );
}

function RunBtn({ loading, onClick, label = "توليد" }: any) {
  return (
    <button onClick={onClick} disabled={loading}
      className="inline-flex items-center gap-2 bg-charcoal text-ivory px-4 py-2 rounded-sm hover:opacity-90 disabled:opacity-60 text-sm">
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
      {label}
    </button>
  );
}

const inp = "w-full mt-1 border border-border rounded-sm px-3 py-2 bg-background text-sm";

function BioTool() {
  const fn = useServerFn(aiGenerateBio);
  const [s, setS] = useState({ name: "", city: "عمّان", style: "", years: "", equipment: "" });
  const [o, setO] = useState(""); const [l, setL] = useState(false);
  const run = async () => { setL(true); try { const r = await fn({ data: s }); setO(r.text); } catch (e: any) { toast.error(e.message); } setL(false); };
  return (
    <Box title="مولّد النبذة الشخصية" desc="انسخها للملف الشخصي.">
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="text-xs">الاسم<input className={inp} value={s.name} onChange={(e) => setS({ ...s, name: e.target.value })} /></label>
        <label className="text-xs">المدينة<input className={inp} value={s.city} onChange={(e) => setS({ ...s, city: e.target.value })} /></label>
        <label className="text-xs">الأسلوب<input className={inp} placeholder="سينمائي/كلاسيكي…" value={s.style} onChange={(e) => setS({ ...s, style: e.target.value })} /></label>
        <label className="text-xs">سنوات الخبرة<input className={inp} value={s.years} onChange={(e) => setS({ ...s, years: e.target.value })} /></label>
        <label className="text-xs sm:col-span-2">المعدّات<input className={inp} value={s.equipment} onChange={(e) => setS({ ...s, equipment: e.target.value })} /></label>
      </div>
      <div className="mt-3"><RunBtn loading={l} onClick={run} /></div>
      <Output text={o} />
    </Box>
  );
}

function ReplyTool() {
  const fn = useServerFn(aiSuggestReply);
  const [m, setM] = useState(""); const [t, setT] = useState<"ودّي" | "رسمي" | "مختصر">("ودّي");
  const [o, setO] = useState(""); const [l, setL] = useState(false);
  const run = async () => { setL(true); try { const r = await fn({ data: { clientMessage: m, tone: t } }); setO(r.text); } catch (e: any) { toast.error(e.message); } setL(false); };
  return (
    <Box title="مساعد الردود على العملاء" desc="ألصق رسالة العميل واحصل على ردّ مهذّب جاهز.">
      <textarea rows={3} className={inp} value={m} onChange={(e) => setM(e.target.value)} placeholder="رسالة العميل…" />
      <select className={`${inp} mt-2 max-w-xs`} value={t} onChange={(e) => setT(e.target.value as any)}>
        <option>ودّي</option><option>رسمي</option><option>مختصر</option>
      </select>
      <div className="mt-3"><RunBtn loading={l} onClick={run} label="اقترح ردًا" /></div>
      <Output text={o} />
    </Box>
  );
}

function BriefTool() {
  const fn = useServerFn(aiAnalyzeBrief);
  const [b, setB] = useState(""); const [o, setO] = useState(""); const [l, setL] = useState(false);
  const run = async () => { setL(true); try { const r = await fn({ data: { brief: b } }); setO(r.text); } catch (e: any) { toast.error(e.message); } setL(false); };
  return (
    <Box title="محلّل ملخّص الحجز" desc="حوّل ملاحظات العميل إلى قائمة تحضير.">
      <textarea rows={4} className={inp} value={b} onChange={(e) => setB(e.target.value)} placeholder="عرس بفستان أبيض في فندق X، قاعة داخلية، ٥٠٠ مدعو، الزفّة ٧ مساء…" />
      <div className="mt-3"><RunBtn loading={l} onClick={run} label="حلّل" /></div>
      <Output text={o} />
    </Box>
  );
}

function CaptionTool() {
  const fn = useServerFn(aiGenerateCaption);
  const [t, setT] = useState(""); const [o, setO] = useState(""); const [l, setL] = useState(false);
  const run = async () => { setL(true); try { const r = await fn({ data: { topic: t } }); setO(r.text); } catch (e: any) { toast.error(e.message); } setL(false); };
  return (
    <Box title="مولّد كابشن إنستغرام" desc="٣ خيارات + هاشتاقات.">
      <input className={inp} value={t} onChange={(e) => setT(e.target.value)} placeholder="مثال: لقطة الزفّة في ضوء الذهب" />
      <div className="mt-3"><RunBtn loading={l} onClick={run} /></div>
      <Output text={o} />
    </Box>
  );
}

function PricingTool() {
  const fn = useServerFn(aiSuggestPricing);
  const [s, setS] = useState({ city: "عمّان", years: "", style: "" });
  const [o, setO] = useState(""); const [l, setL] = useState(false);
  const run = async () => { setL(true); try { const r = await fn({ data: s }); setO(r.text); } catch (e: any) { toast.error(e.message); } setL(false); };
  return (
    <Box title="مستشار التسعير" desc="٣ باقات حسب السوق الأردني.">
      <div className="grid sm:grid-cols-3 gap-3">
        <label className="text-xs">المدينة<input className={inp} value={s.city} onChange={(e) => setS({ ...s, city: e.target.value })} /></label>
        <label className="text-xs">سنوات الخبرة<input className={inp} value={s.years} onChange={(e) => setS({ ...s, years: e.target.value })} /></label>
        <label className="text-xs">الأسلوب<input className={inp} value={s.style} onChange={(e) => setS({ ...s, style: e.target.value })} /></label>
      </div>
      <div className="mt-3"><RunBtn loading={l} onClick={run} label="اقترح باقات" /></div>
      <Output text={o} />
    </Box>
  );
}

function ClauseTool() {
  const fn = useServerFn(aiContractClause);
  const [t, setT] = useState(""); const [o, setO] = useState(""); const [l, setL] = useState(false);
  const run = async () => { setL(true); try { const r = await fn({ data: { topic: t } }); setO(r.text); } catch (e: any) { toast.error(e.message); } setL(false); };
  return (
    <Box title="مولّد بنود العقد" desc="مثال: التأجيل، الاسترداد، حقوق النشر…">
      <input className={inp} value={t} onChange={(e) => setT(e.target.value)} placeholder="موضوع البند" />
      <div className="mt-3"><RunBtn loading={l} onClick={run} label="صُغ البند" /></div>
      <Output text={o} />
    </Box>
  );
}

function TranslateTool() {
  const fn = useServerFn(aiTranslate);
  const [t, setT] = useState(""); const [to, setTo] = useState<"ar" | "en">("en");
  const [o, setO] = useState(""); const [l, setL] = useState(false);
  const run = async () => { setL(true); try { const r = await fn({ data: { text: t, to } }); setO(r.text); } catch (e: any) { toast.error(e.message); } setL(false); };
  return (
    <Box title="ترجمة عربي ↔ إنجليزي" desc="ترجم نبذتك أو عقدك للعملاء الأجانب.">
      <textarea rows={3} className={inp} value={t} onChange={(e) => setT(e.target.value)} />
      <select className={`${inp} mt-2 max-w-xs`} value={to} onChange={(e) => setTo(e.target.value as any)}>
        <option value="en">إلى الإنجليزية</option><option value="ar">إلى العربية</option>
      </select>
      <div className="mt-3"><RunBtn loading={l} onClick={run} label="ترجم" /></div>
      <Output text={o} />
    </Box>
  );
}

function SeoTool() {
  const fn = useServerFn(aiSeoMeta);
  const [s, setS] = useState({ name: "", city: "عمّان", bio: "" });
  const [o, setO] = useState(""); const [l, setL] = useState(false);
  const run = async () => { setL(true); try { const r = await fn({ data: s }); setO(r.text); } catch (e: any) { toast.error(e.message); } setL(false); };
  return (
    <Box title="مولّد SEO Meta" desc="title و description لصفحتك العامة.">
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="text-xs">الاسم<input className={inp} value={s.name} onChange={(e) => setS({ ...s, name: e.target.value })} /></label>
        <label className="text-xs">المدينة<input className={inp} value={s.city} onChange={(e) => setS({ ...s, city: e.target.value })} /></label>
      </div>
      <textarea rows={2} className={`${inp} mt-3`} placeholder="نبذة قصيرة" value={s.bio} onChange={(e) => setS({ ...s, bio: e.target.value })} />
      <div className="mt-3"><RunBtn loading={l} onClick={run} /></div>
      <Output text={o} />
    </Box>
  );
}

function AssistantTool() {
  const fn = useServerFn(aiAskAssistant);
  const [q, setQ] = useState(""); const [o, setO] = useState(""); const [l, setL] = useState(false);
  const run = async () => { setL(true); try { const r = await fn({ data: { question: q } }); setO(r.text); } catch (e: any) { toast.error(e.message); } setL(false); };
  return (
    <Box title="مستشار الأعمال" desc="اسأل عن التسويق، التعامل مع العملاء، تحسين خدمتك…">
      <textarea rows={3} className={inp} value={q} onChange={(e) => setQ(e.target.value)} placeholder="كيف أزيد حجوزاتي في موسم الصيف؟" />
      <div className="mt-3"><RunBtn loading={l} onClick={run} label="اسأل" /></div>
      <Output text={o} />
    </Box>
  );
}