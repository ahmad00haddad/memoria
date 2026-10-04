import { createFileRoute, Link } from "@tanstack/react-router";
import { hapticVibrate } from "@/lib/utils";
import { motion } from "framer-motion";
import { PageLoader } from "@/components/ui/loading";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { submitReviewByToken, getBookingByToken } from "@/lib/booking.functions";
import { useQuery } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/review/$token")({
  head: () => ({
    meta: [
      { title: "قيّمي تجربتك — ميموريا" },
      { name: "description", content: "شاركي رأيك في جلسة التصوير وساعدي غيرك على الاختيار." },
      { property: "og:title", content: "قيّمي تجربتك — ميموريا" },
      { property: "og:description", content: "شاركي رأيك في جلسة التصوير وساعدي غيرك على الاختيار." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ReviewPage,
});

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
  const [pop, setPop] = useState(0);

  // نملأ الاسم من الحجز حتى لا تكتبه العروس مرة أخرى
  useEffect(() => {
    const n = (booking as any)?.client_name;
    if (n && !name) setName(n);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booking]);

  const TAGS = ["التزام بالمواعيد", "جودة الصور", "تعامل لطيف", "سرعة التسليم", "تنظيم يوم العرس"];
  const toggleTag = (t: string) => {
    hapticVibrate("light");
    setComment((c) => (c.includes(t) ? c.replace(new RegExp(`(،\\s*)?${t}`), "").replace(/^،\s*/, "") : c ? `${c}، ${t}` : t));
  };

  const submit = async () => {
    if (!name.trim()) return toast.error("اكتبي اسمك ليظهر مع التقييم");
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
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300, damping: 15 }} className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-full bg-gold/15 text-3xl text-gold">✓</motion.div>
            <p className="font-serif text-2xl">شكراً لكِ</p>
            <p className="mt-1 text-sm text-muted-foreground">رأيك يساعد عرائس أخريات على اختيار مصوّرتهن.</p>
            <Link to="/" className="text-gold underline text-sm mt-4 inline-block">العودة للرئيسية</Link>
          </div>
        ) : (
          <div className="rounded-sm border border-border bg-card p-8 space-y-5">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="اسمك" maxLength={120}
              className="w-full border border-border rounded-sm px-3 py-2 bg-background" />
            <div className="flex flex-col items-center gap-2">
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <motion.button
                    key={n}
                    onMouseEnter={() => setHoverRating(n)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => { setRating(n); setPop((p) => p + 1); hapticVibrate(n >= 4 ? "success" : "light"); }}
                    aria-label={`${n} نجوم`}
                    animate={pop && n <= rating ? { scale: [1, 1.3, 1] } : { scale: 1 }}
                    transition={{ delay: (n - 1) * 0.05, duration: 0.3 }}
                    className="transition-transform hover:scale-110"
                  >
                    <Star className={`h-9 w-9 transition-colors duration-200 ${(hoverRating || rating) >= n ? "fill-gold text-gold" : "text-muted-foreground/30"}`} />
                  </motion.button>
                ))}
              </div>
              <motion.div key={hoverRating || rating} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="text-sm font-medium text-gold h-5">
                {{ 1: "سيء جداً 😞", 2: "غير مرضٍ 😕", 3: "جيد 😐", 4: "ممتاز! 😊", 5: "استثنائي! 🌟" }[hoverRating || rating]}
              </motion.div>
            </div>
            <div className="flex flex-wrap justify-center gap-1.5">
              {TAGS.map((t) => (
                <button key={t} type="button" onClick={() => toggleTag(t)} className={`rounded-full border px-3 py-1 text-xs transition-colors ${comment.includes(t) ? "border-gold bg-gold/15 text-foreground" : "border-border text-muted-foreground hover:border-gold/40"}`}>
                  {t}
                </button>
              ))}
            </div>
            <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={4} maxLength={2000}
              placeholder={rating <= 3 ? "ما الذي كان يمكن أن يكون أفضل؟ (مطلوب)" : "كلمة عن تجربتك (اختياري)"}
              className="w-full border border-border rounded-xl px-3 py-2 bg-background" />
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