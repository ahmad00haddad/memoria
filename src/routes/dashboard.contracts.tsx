import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ScrollText, Plus, Copy } from "lucide-react";

export const Route = createFileRoute("/dashboard/contracts")({ component: Contracts });

const DEFAULT_TEMPLATE = `بسم الله الرحمن الرحيم

يُعقد هذا العقد بين المصوّر/ة [اسم المصوّر] والعميل/ة [اسم العميل] لتوفير خدمة تصوير حفل الزفاف وفقاً للبنود التالية:

1. تاريخ الحفل: [التاريخ]
2. الموقع: [الموقع]
3. مدة التصوير: من [البداية] إلى [النهاية]
4. المبلغ الكلي: [المجموع] دينار أردني
5. العربون: [العربون] دينار أردني (غير قابل للاسترداد)
6. تسليم الصور النهائية خلال 30 يومًا من الحفل.
7. للمصوّر حق استخدام الصور لأغراض الترويج إلا في حال طلب العميل خلاف ذلك كتابيًا.
8. الإلغاء قبل أسبوعين من الحفل يعفي العميل من المتبقي، أما بعد ذلك فيتحمّل 50% من المبلغ.

بتوقيع العميل أدناه يُعدّ موافقًا على جميع البنود.`;

function Contracts() {
  const nav = useNavigate();
  const [uid, setUid] = useState("");
  const [templates, setTemplates] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [body, setBody] = useState(DEFAULT_TEMPLATE);

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
  useEffect(() => { load(); }, []);

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

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <section className="container-editorial py-12">
        <div className="text-xs uppercase tracking-[0.3em] text-gold mb-1">العقود</div>
        <h1 className="font-serif text-4xl mb-8">قوالب وعقود التصوير</h1>

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