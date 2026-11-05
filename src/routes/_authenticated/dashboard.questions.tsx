import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Header } from "@/components/site/Header";
import { BackToDashboard } from "@/components/site/BackToDashboard";
import { Footer } from "@/components/site/Footer";
import { PageLoader } from "@/components/ui/loading";
import { listMyQuestions, answerQuestion } from "@/lib/questions.functions";
import { g } from "@/hooks/use-gender";
import { t, tx, locale } from "@/i18n";

// أسئلة العرائس قبل الحجز: رد مكتوب يظهر للعروس على رابطها الخاص (بدون أرقام)
export const Route = createFileRoute("/_authenticated/dashboard/questions")({ component: QuestionsPage });

function QuestionsPage() {
  const list = useServerFn(listMyQuestions);
  const answer = useServerFn(answerQuestion);
  const [rows, setRows] = useState<any[] | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const load = () => list().then(setRows).catch(() => setRows([]));
  useEffect(() => { load(); }, []);

  const send = async (id: string) => {
    try { await answer({ data: { id, answer: drafts[id] ?? "" } }); toast.success(t("وصل ردّك للعروس")); load(); }
    catch (e: any) { toast.error(e?.message || t("تعذّر الإرسال")); }
  };

  if (!rows) return <PageLoader />;
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <section className="container-editorial max-w-2xl py-8">
        <BackToDashboard />
        <h1 className="mt-4 font-serif text-3xl">{t("أسئلة قبل الحجز")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{g(t("ردّي بسرعة وباختصار. الأرقام تُخفى تلقائياً، فالحجز يتم من صفحتكِ."), t("ردّ بسرعة وباختصار. الأرقام تُخفى تلقائياً، فالحجز يتم من صفحتك."))}</p>
        {rows.length === 0 && <p className="mt-8 text-sm text-muted-foreground">{t("لا أسئلة بعد.")}</p>}
        <div className="mt-6 space-y-3">
          {rows.map((q) => (
            <div key={q.id} className={`rounded-2xl border p-4 text-sm ${q.answer ? "border-border" : "border-gold/50 bg-gold/5"}`}>
              <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{tx(q.asker_name)}</span>
                <span>{new Date(q.created_at).toLocaleString(locale("ar-JO"))}</span>
              </div>
              <p className="mt-2 whitespace-pre-wrap">{tx(q.question)}</p>
              {q.answer ? (
                <div className="mt-3 rounded-lg bg-secondary/50 p-3"><div className="mb-1 text-xs text-muted-foreground">{t("ردّك")}</div><p className="whitespace-pre-wrap">{tx(q.answer)}</p></div>
              ) : (
                <div className="mt-3 space-y-2">
                  <textarea value={drafts[q.id] ?? ""} onChange={(e) => setDrafts({ ...drafts, [q.id]: e.target.value })} rows={2} maxLength={2000}
                    placeholder={t("اكتب ردّك…")} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
                  <button onClick={() => send(q.id)} disabled={(drafts[q.id] ?? "").trim().length < 2} className="rounded-full bg-charcoal px-5 py-2 text-xs text-ivory disabled:opacity-50">{t("إرسال الرد")}</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
      <Footer />
    </div>
  );
}
