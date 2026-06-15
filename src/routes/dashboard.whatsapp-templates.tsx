import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Save, RefreshCw, MessageCircle, Info } from "lucide-react";

export const Route = createFileRoute("/dashboard/whatsapp-templates")({ component: TemplatesPage });

const CATEGORIES = [
  { value: "welcome", label: "ترحيب" },
  { value: "deposit", label: "طلب عربون" },
  { value: "confirmed", label: "تأكيد" },
  { value: "reminder", label: "تذكير" },
  { value: "delivery", label: "تسليم" },
  { value: "review", label: "تقييم" },
  { value: "general", label: "عام" },
];

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
  const nav = useNavigate();
  const [uid, setUid] = useState<string>("");
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
    toast.success("تم الحفظ");
  };

  const remove = async (id: string) => {
    if (!confirm("حذف هذا القالب؟")) return;
    const { error } = await supabase.from("whatsapp_templates").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("تم الحذف");
    load();
  };

  const updateLocal = (id: string, patch: any) => {
    setItems((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  };

  if (loading) return <div className="min-h-screen grid place-items-center">جاري التحميل…</div>;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <section className="container-editorial py-12">
        <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">← العودة للوحة</Link>
        <div className="flex items-end justify-between mt-2 mb-6">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-gold mb-1">قوالب جاهزة</div>
            <h1 className="font-serif text-4xl flex items-center gap-2"><MessageCircle className="h-7 w-7 text-emerald-600" /> رسائل واتساب</h1>
            <p className="text-sm text-muted-foreground mt-2">أنشئي قوالب جاهزة وأرسليها بنقرة من صفحة كل حجز.</p>
          </div>
          <div className="flex gap-2">
            {items.length === 0 && (
              <button onClick={seedDefaults} className="inline-flex items-center gap-2 text-sm border border-border px-4 py-2 rounded-sm hover:bg-secondary">
                <RefreshCw className="h-4 w-4" /> إضافة قوالب جاهزة
              </button>
            )}
            <button onClick={addNew} className="inline-flex items-center gap-2 text-sm bg-charcoal text-ivory px-4 py-2 rounded-sm hover:opacity-90">
              <Plus className="h-4 w-4" /> قالب جديد
            </button>
          </div>
        </div>

        <div className="mb-6 rounded-sm border border-border bg-secondary/40 p-4 text-sm">
          <div className="flex items-center gap-2 font-medium mb-2"><Info className="h-4 w-4 text-gold" /> المتغيرات المتاحة</div>
          <div className="flex flex-wrap gap-2 text-xs">
            {VARIABLES.map((v) => (
              <span key={v.k} className="bg-background border border-border px-2 py-1 rounded-sm"><code className="text-gold">{v.k}</code> — {v.desc}</span>
            ))}
          </div>
        </div>

        {items.length === 0 ? (
          <div className="rounded-sm border border-dashed border-border p-12 text-center text-muted-foreground">
            لا توجد قوالب بعد. اضغطي "إضافة قوالب جاهزة" للبدء بـ 6 قوالب جاهزة.
          </div>
        ) : (
          <div className="grid gap-4">
            {items.map((t) => (
              <div key={t.id} className="rounded-sm border border-border bg-card p-4">
                <div className="grid gap-3 md:grid-cols-3 mb-3">
                  <input
                    value={t.name}
                    onChange={(e) => updateLocal(t.id, { name: e.target.value })}
                    placeholder="اسم القالب"
                    className="md:col-span-2 border border-border bg-background rounded-sm p-2 text-sm font-medium"
                  />
                  <select
                    value={t.category}
                    onChange={(e) => updateLocal(t.id, { category: e.target.value })}
                    className="border border-border bg-background rounded-sm p-2 text-sm"
                  >
                    {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <textarea
                  value={t.body}
                  onChange={(e) => updateLocal(t.id, { body: e.target.value })}
                  rows={6}
                  className="w-full border border-border bg-background rounded-sm p-3 text-sm leading-loose"
                  dir="rtl"
                />
                <div className="flex items-center justify-end gap-2 mt-3">
                  <button onClick={() => remove(t.id)} className="inline-flex items-center gap-1 text-xs text-destructive border border-destructive/40 px-3 py-1.5 rounded-sm hover:bg-destructive/10">
                    <Trash2 className="h-3.5 w-3.5" /> حذف
                  </button>
                  <button onClick={() => save(t)} className="inline-flex items-center gap-1 text-xs bg-charcoal text-ivory px-3 py-1.5 rounded-sm hover:opacity-90">
                    <Save className="h-3.5 w-3.5" /> حفظ
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
      <Footer />
    </div>
  );
}