import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Mail, MessageCircle, Clock, MapPin } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "تواصلي معنا — Memoria · ميموريا" },
      { name: "description", content: "فريق ميموريا هنا للمساعدة في الحجوزات، الاشتراكات، والاستفسارات. تواصلي عبر البريد أو نموذج التواصل." },
      { property: "og:title", content: "تواصلي معنا — Memoria · ميموريا" },
      { property: "og:description", content: "بريد الدعم، ساعات الرد، ونموذج تواصل سريع." },
      { property: "og:url", content: "https://memoria-jo.lovable.app/contact" },
    ],
    links: [{ rel: "canonical", href: "https://memoria-jo.lovable.app/contact" }],
  }),
  component: ContactPage,
});

function ContactPage() {
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    const subject = encodeURIComponent(`[ميموريا] رسالة من ${fd.get("name") || "زائر"}`);
    const body = encodeURIComponent(`الاسم: ${fd.get("name")}\nالبريد: ${fd.get("email")}\nالهاتف: ${fd.get("phone") || "—"}\n\n${fd.get("message")}`);
    window.location.href = `mailto:support@memoria.jo?subject=${subject}&body=${body}`;
    setTimeout(() => { setSent(true); setSubmitting(false); toast.success("جاري فتح بريدك لإرسال الرسالة"); }, 400);
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container-editorial py-16">
        <div className="text-xs uppercase tracking-[0.3em] text-gold mb-2">تواصلي معنا</div>
        <h1 className="font-serif text-4xl sm:text-5xl mb-4">نحن هنا للمساعدة</h1>
        <p className="text-muted-foreground mb-10 max-w-2xl">سواء كنتِ عروساً تبحثين عن مصوّرة، أو مصوّرة تريدين الانضمام، أو لديكِ ملاحظة على المنصّة — يسعدنا سماع منكِ.</p>

        <div className="grid gap-10 lg:grid-cols-2">
          <div className="space-y-6">
            <Item icon={Mail} label="البريد الإلكتروني">
              <a href="mailto:support@memoria.jo" className="hover:text-gold">support@memoria.jo</a>
            </Item>
            <Item icon={Clock} label="ساعات الرد">
              السبت – الخميس · 9 صباحاً – 8 مساءً (بتوقيت عمّان). نردّ عادة خلال 24 ساعة.
            </Item>
            <Item icon={MapPin} label="المقرّ الرسمي">
              شركة ميموريا ذ.م.م<br />عمّان، المملكة الأردنية الهاشمية
            </Item>
            <Item icon={MessageCircle} label="نوع الاستفسارات">
              مشاكل الحجز · الاشتراكات · إبلاغ عن مصوّرة · اقتراحات لتحسين المنصّة
            </Item>
          </div>

          <form onSubmit={submit} className="rounded-2xl border border-border/60 bg-card p-6 space-y-4">
            <h2 className="font-serif text-2xl">أرسلي رسالة</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field name="name" label="الاسم" required />
              <Field name="phone" label="الهاتف (اختياري)" type="tel" />
            </div>
            <Field name="email" label="البريد الإلكتروني" type="email" required />
            <div>
              <label className="text-sm mb-1 block">الرسالة</label>
              <textarea name="message" required rows={5} className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm" placeholder="اكتبي رسالتك هنا..." />
            </div>
            <button disabled={submitting} type="submit" className="w-full rounded-md bg-primary text-primary-foreground py-2 text-sm hover:opacity-90 disabled:opacity-50">
              {submitting ? "جاري الإرسال..." : sent ? "تم الفتح في بريدك" : "إرسال"}
            </button>
            <p className="text-xs text-muted-foreground">سيُفتح تطبيق البريد على جهازك لإرسال الرسالة إلى support@memoria.jo.</p>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function Item({ icon: Icon, label, children }: { icon: typeof Mail; label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <div className="shrink-0 grid h-10 w-10 place-items-center rounded-md bg-secondary"><Icon className="h-4 w-4 text-gold" /></div>
      <div>
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1">{label}</div>
        <div className="text-sm leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

function Field({ name, label, type = "text", required }: { name: string; label: string; type?: string; required?: boolean }) {
  return (
    <div>
      <label className="text-sm mb-1 block">{label}</label>
      <input name={name} type={type} required={required} className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm" />
    </div>
  );
}