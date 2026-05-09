import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { supabase } from "@/integrations/supabase/client";
import { Star } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/review/$bookingId")({ component: ReviewPage });

function ReviewPage() {
  const { bookingId } = Route.useParams();
  const [b, setB] = useState<any>(null);
  const [existing, setExisting] = useState<any>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("bookings").select("client_name,photographer_id,status").eq("id", bookingId).maybeSingle();
      setB(data); setName(data?.client_name ?? "");
      const { data: r } = await supabase.from("reviews").select("*").eq("booking_id", bookingId).maybeSingle();
      if (r) { setExisting(r); setRating(r.rating); setComment(r.comment ?? ""); }
      setLoading(false);
    })();
  }, [bookingId]);

  const submit = async () => {
    if (!b) return;
    const { error } = await supabase.from("reviews").insert({
      booking_id: bookingId, photographer_id: b.photographer_id, client_name: name, rating, comment,
    });
    if (error) return toast.error(error.message);
    setDone(true);
  };

  if (loading) return <div className="min-h-screen grid place-items-center">جاري التحميل…</div>;
  if (!b) return <div className="min-h-screen grid place-items-center">حجز غير موجود</div>;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <section className="container-editorial py-16 max-w-xl">
        <h1 className="font-serif text-4xl mb-6 text-center">قيّمي تجربتك</h1>
        {done || existing ? (
          <div className="rounded-sm border border-border bg-card p-8 text-center">
            <div className="text-5xl mb-3">✓</div>
            <p>شكرًا! تم حفظ تقييمك.</p>
            <Link to="/" className="text-gold underline text-sm mt-4 inline-block">العودة للرئيسية</Link>
          </div>
        ) : (
          <div className="rounded-sm border border-border bg-card p-8 space-y-5">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="اسمك" className="w-full border border-border rounded-sm px-3 py-2 bg-background" />
            <div className="flex justify-center gap-2">
              {[1,2,3,4,5].map((n) => (
                <button key={n} onClick={() => setRating(n)}><Star className={`h-8 w-8 ${n <= rating ? "fill-gold text-gold" : "text-muted-foreground/30"}`} /></button>
              ))}
            </div>
            <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={4} placeholder="كلمة عن تجربتك (اختياري)" className="w-full border border-border rounded-sm px-3 py-2 bg-background" />
            <button onClick={submit} className="w-full bg-charcoal text-ivory py-3 rounded-sm hover:opacity-90">إرسال التقييم</button>
          </div>
        )}
      </section>
      <Footer />
    </div>
  );
}