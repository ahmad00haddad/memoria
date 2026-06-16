import { createFileRoute, Link } from "@tanstack/react-router";
import { PageLoader } from "@/components/ui/loading";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { submitReviewByToken, getBookingByToken } from "@/lib/booking.functions";
import { useQuery } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/review/$token")({ component: ReviewPage });

function ReviewPage() {
  const { token } = Route.useParams();
  const fetchBooking = useServerFn(getBookingByToken);
  const submitFn = useServerFn(submitReviewByToken);

  const { data: booking, isLoading } = useQuery({
    queryKey: ["review-booking", token],
    queryFn: () => fetchBooking({ data: { token } }),
    staleTime: 30_000,
  });

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [name, setName] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!name.trim()) return toast.error("الاسم مطلوب");
    setBusy(true);
    try {
      await submitFn({ data: { token, rating, comment, client_name: name.trim() } });
      setDone(true);
    } catch (e: any) {
      toast.error(e.message || "تعذّر إرسال التقييم");
    } finally {
      setBusy(false);
    }
  };

  if (isLoading) return <div className="min-h-screen grid place-items-center">جاري التحميل…</div>;
  if (!booking) return <div className="min-h-screen grid place-items-center">رابط غير صالح</div>;

  const status = (booking as any).status;
  if (status !== "completed") {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <section className="container-editorial py-16 max-w-xl text-center">
          <h1 className="font-serif text-3xl mb-3">لا يمكن التقييم بعد</h1>
          <p className="text-muted-foreground">يمكنك تقييم تجربتك بعد تأكيد استلام الصور.</p>
        </section>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <section className="container-editorial py-16 max-w-xl">
        <h1 className="font-serif text-4xl mb-6 text-center">قيّمي تجربتك</h1>
        {done ? (
          <div className="rounded-sm border border-border bg-card p-8 text-center">
            <div className="text-5xl mb-3">✓</div>
            <p>شكرًا! تم حفظ تقييمك.</p>
            <Link to="/" className="text-gold underline text-sm mt-4 inline-block">العودة للرئيسية</Link>
          </div>
        ) : (
          <div className="rounded-sm border border-border bg-card p-8 space-y-5">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="اسمك" maxLength={120}
              className="w-full border border-border rounded-sm px-3 py-2 bg-background" />
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setRating(n)} aria-label={`${n} نجوم`}>
                  <Star className={`h-8 w-8 ${n <= rating ? "fill-gold text-gold" : "text-muted-foreground/30"}`} />
                </button>
              ))}
            </div>
            <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={4} maxLength={2000}
              placeholder="كلمة عن تجربتك (اختياري)"
              className="w-full border border-border rounded-sm px-3 py-2 bg-background" />
            <button onClick={submit} disabled={busy}
              className="w-full bg-charcoal text-ivory py-3 rounded-sm hover:opacity-90 disabled:opacity-60">
              {busy ? "جاري الإرسال…" : "إرسال التقييم"}
            </button>
          </div>
        )}
      </section>
      <Footer />
    </div>
  );
}