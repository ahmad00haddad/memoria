import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
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
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [name, setName] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!name.trim()) return toast.error("الاسم مطلوب");
    if (rating <= 3 && comment.trim().length < 5) return toast.error("يرجى كتابة سبب التقييم (5 أحرف على الأقل) لنتمكن من تحسين خدماتنا.");
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

  if (isLoading) return <PageLoader />;
  if (!booking || (booking as any).deleted_at || (booking as any).expired) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container-editorial py-24 text-center">
          <h1 className="font-serif text-3xl mb-2 text-destructive">رابط غير صالح</h1>
          <p className="text-muted-foreground">هذا الرابط أصبح غير فعّال أو تم حذفه.</p>
        </div>
        <Footer />
      </div>
    );
  }

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
            <div className="flex flex-col items-center gap-2">
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} onMouseEnter={() => setHoverRating(n)} onMouseLeave={() => setHoverRating(0)} onClick={() => setRating(n)} aria-label={`${n} نجوم`} className="transition-transform hover:scale-110 active:scale-95">
                    <Star className={`h-8 w-8 transition-colors duration-200 ${(hoverRating || rating) >= n ? "fill-gold text-gold" : "text-muted-foreground/30"}`} />
                  </button>
                ))}
              </div>
              <motion.div key={hoverRating || rating} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="text-sm font-medium text-gold h-5">
                {{ 1: "سيء جداً 😞", 2: "غير مرضٍ 😕", 3: "جيد 😐", 4: "ممتاز! 😊", 5: "استثنائي! 🌟" }[hoverRating || rating]}
              </motion.div>
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