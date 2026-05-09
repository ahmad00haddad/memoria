import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle2, XCircle } from "lucide-react";

export const Route = createFileRoute("/dashboard/bookings/$id")({ component: BookingDetail });

function BookingDetail() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const [uid, setUid] = useState("");
  const [b, setB] = useState<any>(null);
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return nav({ to: "/login" });
    setUid(session.user.id);
    const [{ data: bk }, { data: m }] = await Promise.all([
      supabase.from("bookings").select("*").eq("id", id).maybeSingle(),
      supabase.from("messages").select("*").eq("booking_id", id).order("created_at"),
    ]);
    setB(bk); setMsgs(m ?? []);
    if (bk?.deposit_proof_url) {
      const { data } = await supabase.storage.from("deposit-proofs").createSignedUrl(bk.deposit_proof_url, 3600);
      setProofUrl(data?.signedUrl ?? null);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const setStatus = async (status: "quote" | "pending_deposit" | "confirmed" | "completed" | "cancelled") => {
    await supabase.from("bookings").update({ status }).eq("id", id);
    toast.success("تم تحديث الحالة");
    load();
  };

  const send = async () => {
    if (!text.trim()) return;
    await supabase.from("messages").insert({ booking_id: id, body: text, sender_id: uid, sender_name: "المصوّر" });
    setText("");
    load();
  };

  if (loading || !b) return <div className="min-h-screen grid place-items-center">جاري التحميل…</div>;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <section className="container-editorial py-12 max-w-4xl">
        <Link to="/dashboard/bookings" className="text-xs text-muted-foreground hover:text-gold">← الحجوزات</Link>
        <h1 className="font-serif text-3xl mt-2 mb-2">{b.client_name}</h1>
        <div className="text-sm text-muted-foreground mb-6">{b.service === "photography" ? "تصوير فوتوغرافي" : "فيديو سينمائي"} · {new Date(b.event_date).toLocaleDateString("ar-JO")} · {b.start_time?.slice(0,5)}–{b.end_time?.slice(0,5)}</div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="rounded-sm border border-border bg-card p-6 space-y-3 text-sm">
            <h2 className="font-serif text-xl mb-2">التفاصيل</h2>
            <Row k="الهاتف" v={b.client_phone} /><Row k="البريد" v={b.client_email} />
            <Row k="الموقع" v={b.venue_name} /><Row k="العنوان" v={b.venue_address} />
            <Row k="ملاحظات العميل" v={b.client_notes} />
            <hr className="my-2 border-border" />
            <Row k="السعر الأساسي" v={`${b.base_price} د.أ`} />
            <Row k="رسوم التنقّل" v={`${b.travel_fee} د.أ`} />
            <Row k="الإجمالي" v={`${b.total_price} د.أ`} bold />
            <Row k="العربون" v={`${b.deposit_amount} د.أ`} />
          </div>

          <div className="rounded-sm border border-border bg-card p-6">
            <h2 className="font-serif text-xl mb-3">الحالة والإجراءات</h2>
            <div className="text-sm mb-3">الحالة الحالية: <strong>{b.status}</strong></div>

            {proofUrl && (
              <div className="mb-4">
                <div className="text-xs text-muted-foreground mb-2">إثبات العربون:</div>
                <a href={proofUrl} target="_blank" rel="noreferrer" className="block">
                  <img src={proofUrl} alt="إثبات" className="w-full max-h-60 object-contain border border-border rounded-sm bg-secondary" />
                </a>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {b.status === "pending_deposit" && proofUrl && (
                <button onClick={() => setStatus("confirmed")} className="inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-sm"><CheckCircle2 className="h-4 w-4" /> تأكيد العربون</button>
              )}
              {b.status !== "completed" && b.status !== "cancelled" && (
                <button onClick={() => setStatus("completed")} className="border border-border px-4 py-2 rounded-sm hover:bg-secondary">إنهاء كمنجز</button>
              )}
              {b.status !== "cancelled" && (
                <button onClick={() => setStatus("cancelled")} className="inline-flex items-center gap-2 text-destructive border border-destructive/30 px-4 py-2 rounded-sm hover:bg-destructive/10"><XCircle className="h-4 w-4" /> إلغاء</button>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-sm border border-border bg-card p-6">
          <h2 className="font-serif text-xl mb-4">الرسائل</h2>
          <div className="space-y-3 max-h-96 overflow-y-auto mb-4">
            {msgs.length === 0 && <p className="text-sm text-muted-foreground">لا رسائل بعد.</p>}
            {msgs.map((m) => (
              <div key={m.id} className={`p-3 rounded-sm ${m.sender_id === uid ? "bg-charcoal text-ivory mr-12" : "bg-secondary ml-12"}`}>
                <div className="text-[10px] opacity-70 mb-1">{m.sender_name} · {new Date(m.created_at).toLocaleString("ar-JO")}</div>
                <div className="text-sm whitespace-pre-wrap">{m.body}</div>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="اكتب رسالة…" className="flex-1 border border-border rounded-sm px-3 py-2 bg-background" />
            <button onClick={send} className="bg-charcoal text-ivory px-5 rounded-sm">إرسال</button>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}

function Row({ k, v, bold }: any) {
  return <div className="flex justify-between gap-3"><span className="text-muted-foreground">{k}</span><span className={bold ? "font-semibold" : ""}>{v || "—"}</span></div>;
}