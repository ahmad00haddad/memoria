import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ScrollText, Plus, Copy } from "lucide-react";

export const Route = createFileRoute("/dashboard/contracts")({ component: Contracts });

const DEFAULT_TEMPLATE = `بسم الله الرحمن الرحيم
عقد خدمات تصوير زفاف

يُبرم هذا العقد بين المصوّر/ة (الطرف الأول) والعميل/ة [اسم العميل] (الطرف الثاني)، وفق البنود الآتية:

أولاً — تفاصيل الحجز
• تاريخ الحفل: [التاريخ]
• الموقع: [الموقع]
• مدة التصوير المتفق عليها: من [البداية] إلى [النهاية]
• المبلغ الإجمالي: [المجموع] دينار أردني
• العربون (غير قابل للاسترداد): [العربون] دينار أردني
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
• إلغاء الحجز قبل 30 يوم من الحفل: استرداد كامل المتبقي، العربون يبقى
• إلغاء قبل 14 يوم: يتحمّل العميل 50% من قيمة الباقة
• إلغاء خلال أسبوع الحفل: يتحمّل العميل كامل المبلغ

سابعاً — حالات استثنائية
• في حال تعذّر حضور الطرف الأول لظرف قهري، يلتزم بإيجاد بديلة بنفس المستوى وردّ الفرق إن وُجد
• الكوارث الطبيعية والظروف القهرية تُعفي الطرفين دون استرداد العربون

ثامناً — التوقيع
بتوقيع العميل أدناه يُعدّ موافقًا على جميع البنود أعلاه وله صلاحية الإلزام القانوني الكامل.`;

function Contracts() {
  const nav = useNavigate();
  const [uid, setUid] = useState("");
  const [templates, setTemplates] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [body, setBody] = useState(DEFAULT_TEMPLATE);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return nav({ to: "/login" });
    setUid(session.user.id);
    const [{ data: t }, { data: c }] = await Promise.all([
      supabase.from("contract_templates").select("*").eq("photographer_id", session.user.id).order("created_at", { ascending: false }),
      supabase.from("contracts").select("*, bookings(client_name,event_date)").eq("photographer_id", session.user.id).order("created_at", { ascending: false }),
    ]);
    setTemplates(t ?? []); setContracts(c ?? []);
  };
  useEffect(() => {
    (async () => {
      try {
        await load();
      } catch (error: any) {
        setLoadError(error?.message || "تعذّر تحميل العقود.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const saveTemplate = async () => {
    if (!name.trim() || !body.trim()) return toast.error("الاسم والمحتوى مطلوبان");
    const { error } = await supabase.from("contract_templates").insert({ photographer_id: uid, name, body });
    if (error) return toast.error(error.message);
    toast.success("تم الحفظ"); setName(""); load();
  };

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/contracts/${token}`;
    navigator.clipboard.writeText(url); toast.success("تم نسخ رابط التوقيع");
  };

  if (loading) return <div className="min-h-screen grid place-items-center">جاري التحميل…</div>;
  if (loadError) return <div className="min-h-screen grid place-items-center px-4 text-sm text-destructive">{loadError}</div>;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <section className="container-editorial py-12">
        <div className="text-xs uppercase tracking-[0.3em] text-gold mb-1">العقود</div>
        <h1 className="font-serif text-4xl mb-8">قوالب وعقود التصوير</h1>

        {templates.length === 0 && contracts.length === 0 && (
          <div className="rounded-sm border border-border bg-card p-6 shadow-soft mb-8">
            <h2 className="font-serif text-2xl mb-2">كيف يعمل قسم العقود؟</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              هنا تبنين القالب مرة واحدة فقط. بعد ذلك، من صفحة أي حجز، يمكنك إنشاء عقد جاهز باسم العميل وتاريخ الحدث والسعر، ثم إرسال رابط التوقيع له مباشرة.
            </p>
            <div className="grid gap-3 md:grid-cols-3 text-sm">
              <div className="rounded-sm border border-border bg-background p-4">1) احفظي قالبًا أساسيًا للعقود.</div>
              <div className="rounded-sm border border-border bg-background p-4">2) افتحي أي حجز ثم أنشئي عقدًا منه.</div>
              <div className="rounded-sm border border-border bg-background p-4">3) انسخي رابط التوقيع وأرسليه للعميل.</div>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-8">
          <div className="border border-border rounded-sm p-6 bg-card">
            <h2 className="font-serif text-2xl mb-4 flex items-center gap-2"><Plus className="h-5 w-5" /> قالب جديد</h2>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="اسم القالب (مثال: عقد عرس قياسي)"
              className="w-full border border-input rounded-sm px-3 py-2 mb-3 bg-background" />
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={14}
              className="w-full border border-input rounded-sm px-3 py-2 bg-background text-sm leading-loose" />
            <button onClick={saveTemplate} className="mt-3 bg-charcoal text-ivory px-5 py-2 rounded-sm hover:opacity-90">حفظ القالب</button>
          </div>

          <div className="space-y-6">
            <div className="border border-border rounded-sm p-6 bg-card">
              <h2 className="font-serif text-2xl mb-4">قوالبي ({templates.length})</h2>
              {templates.length === 0 ? <p className="text-sm text-muted-foreground">لا قوالب بعد</p> : (
                <ul className="space-y-2">
                  {templates.map((t) => (
                    <li key={t.id} className="flex items-center justify-between border border-border rounded-sm p-3">
                      <span className="font-medium">{t.name}</span>
                      <button onClick={async () => { await supabase.from("contract_templates").delete().eq("id", t.id); load(); }}
                        className="text-xs text-destructive">حذف</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="border border-border rounded-sm p-6 bg-card">
              <h2 className="font-serif text-2xl mb-4 flex items-center gap-2"><ScrollText className="h-5 w-5" /> العقود المُنشأة</h2>
              {contracts.length === 0 ? <p className="text-sm text-muted-foreground">لم تُنشئ أي عقد بعد. أنشئ عقدًا من صفحة الحجز.</p> : (
                <ul className="space-y-3">
                  {contracts.map((c) => (
                    <li key={c.id} className="border border-border rounded-sm p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{c.bookings?.client_name} — {c.bookings?.event_date}</div>
                          <div className="text-xs text-muted-foreground">
                            {c.status === "signed" ? `وُقّع في ${new Date(c.signed_at).toLocaleString("ar")}` : "في انتظار التوقيع"}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => copyLink(c.sign_token)} className="text-xs border border-border px-3 py-1 rounded-sm hover:bg-secondary inline-flex items-center gap-1"><Copy className="h-3 w-3" /> رابط</button>
                          <Link to="/contracts/$token" params={{ token: c.sign_token }} className="text-xs border border-border px-3 py-1 rounded-sm hover:bg-secondary">عرض</Link>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}