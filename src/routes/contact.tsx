import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Mail, MessageCircle, Clock, MapPin, CheckCircle } from "lucide-react";
import { useId, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { t, tx } from "@/i18n";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: t("تواصلي معنا — Memoria · ميموريا") },
      { name: "description", content: t("فريق ميموريا هنا للمساعدة في الحجوزات، الاشتراكات، والاستفسارات. أرسلي رسالتك وسنردّ خلال 24 ساعة.") },
      { property: "og:title", content: t("تواصلي معنا — Memoria · ميموريا") },
      { property: "og:description", content: t("بريد الدعم، ساعات الرد، ونموذج تواصل سريع.") },
      { property: "og:url", content: "https://memoria-production.ahmad000haddad.workers.dev/contact" },
    ],
    links: [{ rel: "canonical", href: "https://memoria-production.ahmad000haddad.workers.dev/contact" }],
  }),
  component: ContactPage,
});

function ContactPage() {
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);

    const fd = new FormData(e.currentTarget);
    const name = (fd.get("name") as string || "").trim();
    const email = (fd.get("email") as string || "").trim();
    const phone = (fd.get("phone") as string || "").trim();
    const message = (fd.get("message") as string || "").trim();

    if (!name || !email || !message) {
      toast.error(t("يرجى تعبئة جميع الحقول المطلوبة"));
      setSubmitting(false);
      return;
    }

    try {
      const { error } = await (supabase as any)
        .from("contact_messages")
        .insert({ name, email, phone: phone || null, message });

      if (error) throw error;

      setSent(true);
      toast.success(t("تم إرسال رسالتك بنجاح! سنردّ عليكِ خلال 24 ساعة."));
    } catch (err: any) {
      console.error("[contact] failed to save message:", err);
      // Fallback: open mailto if DB fails
      const subject = encodeURIComponent(t("[ميموريا] رسالة من {0}", [name]));
      const body = encodeURIComponent(t("الاسم: {0} البريد: {1} الهاتف: {2} {3}", [name, email, phone || "—", message]));
      window.location.href = `mailto:ahmad000haddad@gmail.com?subject=${subject}&body=${body}`;
      toast.error(t("حدث خطأ — تم فتح بريدك كبديل."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container-editorial py-16">
        <div className="text-xs uppercase tracking-[0.3em] text-gold mb-2">{t("تواصلي معنا")}</div>
        <h1 className="font-serif text-4xl sm:text-5xl mb-4">{t("نحن هنا للمساعدة")}</h1>
        <p className="text-muted-foreground mb-10 max-w-2xl">
          {t("سواء كنتِ عروساً تبحثين عن مصوّرة، أو مصوّرة تريدين الانضمام، أو لديكِ ملاحظة على المنصّة — يسعدنا سماع منكِ.")}
        </p>

        <div className="grid gap-10 lg:grid-cols-2">
          <div className="space-y-6">
            <Item icon={Mail} label={t("البريد الإلكتروني")}>
              <a href="mailto:ahmad000haddad@gmail.com" className="hover:text-gold">
                ahmad000haddad@gmail.com
              </a>
            </Item>
            <Item icon={Clock} label={t("ساعات الرد")}>
              {t("السبت – الخميس · 9 صباحاً – 8 مساءً (بتوقيت عمّان). نردّ عادة خلال 24 ساعة.")}
            </Item>
            <Item icon={MapPin} label={t("المقرّ")}>
              {t("عمّان، المملكة الأردنية الهاشمية")}
            </Item>
            <Item icon={MessageCircle} label={t("نوع الاستفسارات")}>
              {t("مشاكل الحجز · الاشتراكات · إبلاغ عن مصوّرة · اقتراحات لتحسين المنصّة")}
            </Item>
          </div>

          {sent ? (
            <div className="rounded-2xl border border-border/60 bg-card p-8 flex flex-col items-center justify-center text-center gap-4">
              <CheckCircle className="h-12 w-12 text-green-500 animate-pop check-draw" />
              <h2 className="font-serif text-2xl">{t("تم إرسال رسالتك!")}</h2>
              <p className="text-muted-foreground text-sm">
                {t("وصلت رسالتك بنجاح. سنتواصل معكِ على البريد الإلكتروني خلال 24 ساعة.")}
              </p>
              <button
                onClick={() => setSent(false)}
                className="text-xs text-muted-foreground hover:text-foreground underline mt-2"
              >
                {t("إرسال رسالة أخرى")}
              </button>
            </div>
          ) : (
            <form onSubmit={submit} className="rounded-2xl border border-border/60 bg-card p-6 space-y-4">
              <h2 className="font-serif text-2xl">{t("أرسلي رسالة")}</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field name="name" label={t("الاسم")} required />
                <Field name="phone" label={t("الهاتف (اختياري)")} type="tel" />
              </div>
              <Field name="email" label={t("البريد الإلكتروني")} type="email" required />
              <div>
                <label htmlFor="contact-message" className="text-sm mb-1 block">{t("الرسالة")}</label>
                <textarea
                  id="contact-message"
                  name="message"
                  required
                  rows={5}
                  className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm resize-none"
                  placeholder={t("اكتبي رسالتك هنا...")}
                />
              </div>
              <button
                disabled={submitting}
                type="submit"
                className="w-full rounded-md bg-primary text-primary-foreground py-2 text-sm hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {submitting ? t("جاري الإرسال...") : t("إرسال الرسالة")}
              </button>
              <p className="text-xs text-muted-foreground">
                {t("رسالتك ستصلنا مباشرة وستُحفظ بشكل آمن. لن يتم مشاركة بياناتك مع أي طرف آخر.")}
              </p>
            </form>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

function Item({ icon: Icon, label, children }: { icon: typeof Mail; label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <div className="shrink-0 grid h-10 w-10 place-items-center rounded-md bg-secondary">
        <Icon className="h-4 w-4 text-gold" />
      </div>
      <div>
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1">{tx(label)}</div>
        <div className="text-sm leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

function Field({ name, label, type = "text", required }: { name: string; label: string; type?: string; required?: boolean }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="text-sm mb-1 block">{tx(label)}</label>
      <input
        id={id}
        name={name}
        type={type}
        required={required}
        className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm"
      />
    </div>
  );
}