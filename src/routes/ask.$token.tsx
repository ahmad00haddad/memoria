import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { PageLoader } from "@/components/ui/loading";
import { getQuestionByToken } from "@/lib/questions.functions";
import { t, tx, locale } from "@/i18n";

// صفحة العروس الخاصة بسؤالها قبل الحجز: تقرأ الرد هنا (تتحدّث كل 30 ثانية)
export const Route = createFileRoute("/ask/$token")({
  head: () => ({ meta: [{ title: "سؤالكِ للمصوّرة — ميموريا" }, { name: "robots", content: "noindex" }] }),
  component: AskPage,
});

function AskPage() {
  const { token } = useParams({ from: "/ask/$token" });
  const get = useServerFn(getQuestionByToken);
  const [q, setQ] = useState<any>(undefined);
  useEffect(() => {
    const load = () => get({ data: { token } }).then(setQ).catch(() => setQ(null));
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, [token]);

  if (q === undefined) return <PageLoader />;
  const ph = q?.photographer;
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <section className="container-editorial max-w-xl py-12">
        {!q ? (
          <p className="text-center text-muted-foreground">{t("الرابط غير صالح.")}</p>
        ) : (
          <div className="space-y-4">
            <h1 className="font-serif text-3xl">{t("سؤالكِ لـ {0}", [ph?.display_name ?? ""])}</h1>
            <div className="rounded-2xl border border-border bg-card p-5 text-sm">
              <div className="mb-1 text-xs text-muted-foreground">{new Date(q.created_at).toLocaleString(locale("ar-JO"))}</div>
              <p className="whitespace-pre-wrap">{tx(q.question)}</p>
            </div>
            {q.answer ? (
              <div className="rounded-2xl border border-gold/40 bg-gold/5 p-5 text-sm">
                <div className="mb-1 text-xs text-gold">{t("ردّ المصوّرة")}</div>
                <p className="whitespace-pre-wrap">{tx(q.answer)}</p>
              </div>
            ) : (
              <p className="rounded-2xl border border-border p-5 text-sm text-muted-foreground">{t("بانتظار ردّ المصوّرة. احفظي هذا الرابط وارجعي له، الصفحة تتحدّث لوحدها.")}</p>
            )}
            {ph?.username && (
              <Link to="/photographers/$username" params={{ username: ph.username }} className="inline-block rounded-full bg-charcoal px-6 py-2.5 text-sm text-ivory">
                {t("العودة لصفحتها والحجز")}
              </Link>
            )}
          </div>
        )}
      </section>
      <Footer />
    </div>
  );
}
