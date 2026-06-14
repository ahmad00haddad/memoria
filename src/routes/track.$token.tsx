import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { useServerFn } from "@tanstack/react-start";
import {
  getBookingByToken,
  clientMarkDepositSent,
  clientMarkReceived,
  clientAddNote,
} from "@/lib/booking.functions";
import { getGalleryByToken, getMessagesByToken, sendMessageByToken } from "@/lib/gallery.functions";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, Clock, Upload, Copy, Camera, Image as ImageIcon, Truck, MessageSquare, Download, Send as SendIcon, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/track/$token")({
  component: TrackingPage,
});

type Booking = any;

function TrackingPage() {
  const { token } = useParams({ from: "/track/$token" });
  const get = useServerFn(getBookingByToken);
  const sendDeposit = useServerFn(clientMarkDepositSent);
  const markReceived = useServerFn(clientMarkReceived);
  const addNote = useServerFn(clientAddNote);

  const [b, setB] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [newNote, setNewNote] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    try {
      const data = await get({ data: { token } });
      setB(data);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [token]);

  // Polling refresh — keeps gallery/messages live without realtime RLS gymnastics
  useEffect(() => {
    const id = setInterval(() => { load(); }, 30000);
    return () => clearInterval(id);
  }, []);

  if (loading) return <div className="min-h-screen grid place-items-center">جاري التحميل…</div>;
  if (!b) return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container-editorial py-24 text-center">
        <h1 className="font-serif text-3xl mb-2">رابط غير صالح</h1>
        <p className="text-muted-foreground">قد يكون الرابط منتهي الصلاحية أو غير صحيح.</p>
      </div>
      <Footer />
    </div>
  );

  const onSendDeposit = async () => {
    setUploading(true);
    try {
      let proofPath: string | null = null;
      const file = fileRef.current?.files?.[0];
      if (file) {
        const ext = file.name.split(".").pop() || "jpg";
        const path = `public-tokens/${token}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("deposit-proofs").upload(path, file);
        if (upErr) throw upErr;
        proofPath = path;
      }
      await sendDeposit({ data: { token, proof_path: proofPath, reference: reference || null, note: note || null } });
      toast.success("تم إبلاغ المصورة. ستتم مراجعة الإثبات قريبًا.");
      setReference(""); setNote("");
      if (fileRef.current) fileRef.current.value = "";
      load();
    } catch (e: any) { toast.error(e.message || "فشل الإرسال"); }
    finally { setUploading(false); }
  };

  const onAddNote = async () => {
    if (!newNote.trim()) return;
    try {
      await addNote({ data: { token, note: newNote.trim() } });
      toast.success("تمت إضافة الملاحظة");
      setNewNote("");
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  const onReceived = async () => {
    if (!window.confirm("هل تأكدتِ من استلام جميع الصور؟")) return;
    try {
      await markReceived({ data: { token } });
      toast.success("شكرًا! تم تأكيد الاستلام.");
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  const ph = b.photographer;
  const stages = [
    { key: "request", label: "طلب الحجز", done: true, icon: <CheckCircle2 className="h-5 w-5" /> },
    { key: "deposit", label: "إرسال العربون", done: !!b.deposit_sent_at, icon: <Upload className="h-5 w-5" /> },
    { key: "confirmed", label: "تأكيد الحجز", done: !!b.deposit_confirmed_at || ["confirmed","in_production","delivered","completed"].includes(b.status), icon: <CheckCircle2 className="h-5 w-5" /> },
    { key: "shoot", label: "يوم التصوير", done: b.production_stage !== "awaiting" || ["delivered","completed"].includes(b.status), icon: <Camera className="h-5 w-5" /> },
    { key: "editing", label: "التحرير", done: ["editing","delivered","completed"].includes(b.production_stage) || ["delivered","completed"].includes(b.status), icon: <ImageIcon className="h-5 w-5" /> },
    { key: "delivered", label: "التسليم", done: !!b.delivered_at || b.status === "completed", icon: <Truck className="h-5 w-5" /> },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <section className="container-editorial py-10 max-w-4xl">
        <div className="text-xs uppercase tracking-[0.3em] text-gold mb-1">تتبع الحجز</div>
        <h1 className="font-serif text-3xl mb-1">مرحبًا {b.client_name}</h1>
        <p className="text-muted-foreground text-sm mb-8">حجز مع {ph.display_name} (@{ph.username})</p>

        {/* Timeline */}
        <div className="rounded-sm border border-border bg-card p-5 mb-6">
          <h2 className="font-serif text-lg mb-4">حالة الحجز</h2>
          <ol className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {stages.map((s) => (
              <li key={s.key} className={`rounded-sm border p-3 text-center ${s.done ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-border bg-secondary/30 text-muted-foreground"}`}>
                <div className="flex justify-center mb-1">{s.icon}</div>
                <div className="text-xs">{s.label}</div>
              </li>
            ))}
          </ol>
        </div>

        {/* Booking summary */}
        <div className="rounded-sm border border-border bg-card p-5 mb-6 text-sm">
          <div className="grid sm:grid-cols-2 gap-3 mb-4">
            <Info label="التاريخ" v={b.event_date} />
            <Info label="الوقت" v={`${(b.start_time||"").slice(0,5)} - ${(b.end_time||"").slice(0,5)}`} />
            <Info label="الموقع" v={b.venue_address || "—"} />
            <Info label="الخدمة" v={b.service === "cinematic_video" ? "فيديو سينمائي" : "تصوير"} />
          </div>
          {Array.isArray(b.addons) && b.addons.length > 0 && (
            <div className="border-t border-border pt-3 mb-3">
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">تفاصيل الباقة</div>
              <ul className="space-y-1">
                {b.addons.map((it: any, i: number) => {
                  const qty = Number(it.qty || 1);
                  const price = Number(it.price || 0);
                  return (
                    <li key={i} className="flex justify-between">
                      <span className={it.kind === "main" ? "font-medium" : "text-muted-foreground"}>
                        {it.label}{qty > 1 ? ` × ${qty}` : ""}
                      </span>
                      {price > 0 && <span>{(price * qty).toLocaleString("ar-JO")} د.أ</span>}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          <div className="border-t border-border pt-3 grid sm:grid-cols-2 gap-3">
            <Info label="المبلغ الإجمالي" v={`${Number(b.total_price).toLocaleString("ar-JO")} د.أ`} />
            <Info label="العربون المطلوب" v={`${Number(b.deposit_amount).toLocaleString("ar-JO")} د.أ`} />
          </div>
        </div>

        {/* Deposit step */}
        {!b.deposit_sent_at && (
          <div className="rounded-sm border border-gold/30 bg-gold/5 p-5 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-5 w-5 text-gold" />
              <h2 className="font-serif text-xl">الخطوة التالية: إرسال العربون</h2>
            </div>
            <p className="text-sm mb-4">حوّلي مبلغ <span className="font-semibold">{Number(b.deposit_amount).toLocaleString("ar-JO")} د.أ</span> ثم ارفعي إثبات التحويل أدناه.</p>

            {ph.cliq_alias && (
              <div className="bg-card border border-border rounded-sm p-3 mb-3 flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">CliQ Alias</div>
                  <div className="font-mono text-lg">{ph.cliq_alias}</div>
                </div>
                <button onClick={() => { navigator.clipboard.writeText(ph.cliq_alias); toast.success("تم النسخ"); }}
                        className="p-2 hover:bg-secondary rounded-sm"><Copy className="h-4 w-4" /></button>
              </div>
            )}
            {ph.bank_info && (
              <div className="bg-card border border-border rounded-sm p-3 mb-3 whitespace-pre-line text-sm">{ph.bank_info}</div>
            )}

            <div className="grid gap-3">
              <input type="text" placeholder="رقم العملية المرجعي (اختياري)" value={reference}
                     onChange={(e) => setReference(e.target.value)}
                     className="border border-border rounded-sm px-3 py-2 text-sm bg-background" />
              <textarea placeholder="ملاحظة للمصورة (اختياري)" value={note} rows={2}
                        onChange={(e) => setNote(e.target.value)}
                        className="border border-border rounded-sm px-3 py-2 text-sm bg-background" />
              <input ref={fileRef} type="file" accept="image/*,application/pdf"
                     className="text-sm" />
              <button onClick={onSendDeposit} disabled={uploading}
                      className="bg-gold text-charcoal py-3 rounded-sm font-medium hover:opacity-90 disabled:opacity-60 inline-flex items-center justify-center gap-2">
                <Upload className="h-4 w-4" /> {uploading ? "جاري الإرسال…" : "تم إرسال العربون"}
              </button>
            </div>
          </div>
        )}

        {b.deposit_sent_at && !b.deposit_confirmed_at && (
          <div className="rounded-sm border border-amber-200 bg-amber-50 p-4 mb-6 text-sm text-amber-900">
            تم استلام إشعار العربون. بانتظار تأكيد المصورة.
          </div>
        )}

        {/* Delivered → mark received */}
        {(b.status === "delivered" || b.delivered_at) && !b.client_received_at && (
          <div className="rounded-sm border border-emerald-200 bg-emerald-50 p-5 mb-6">
            <h2 className="font-serif text-xl mb-2">تم تسليم الصور</h2>
            <p className="text-sm mb-3">إذا استلمتِ الصور بشكل كامل، اضغطي للتأكيد.</p>
            <button onClick={onReceived} className="bg-emerald-600 text-white px-4 py-2 rounded-sm text-sm inline-flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" /> تأكيد استلام الصور
            </button>
          </div>
        )}

        {/* Notes */}
        <div className="rounded-sm border border-border bg-card p-5 mb-6">
          <h2 className="font-serif text-lg mb-3 inline-flex items-center gap-2"><MessageSquare className="h-4 w-4" /> ملاحظاتي</h2>
          {b.client_notes && (
            <div className="bg-secondary/40 rounded-sm p-3 text-sm whitespace-pre-line mb-3">{b.client_notes}</div>
          )}
          <textarea placeholder="أضيفي ملاحظة جديدة…" value={newNote} rows={3}
                    onChange={(e) => setNewNote(e.target.value)}
                    className="w-full border border-border rounded-sm px-3 py-2 text-sm bg-background" />
          <button onClick={onAddNote} disabled={!newNote.trim()}
                  className="mt-2 bg-charcoal text-ivory px-4 py-2 rounded-sm text-sm disabled:opacity-50">
            إرسال ملاحظة
          </button>
        </div>

        {/* Photographer contact */}
        <div className="rounded-sm border border-border bg-card p-5 text-sm">
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">للتواصل عند الحاجة</div>
          <div className="space-y-1">
            {ph.whatsapp && <div>واتساب: <a className="text-gold underline" href={`https://wa.me/${ph.whatsapp.replace(/[^0-9]/g,'')}`} target="_blank" rel="noreferrer">{ph.whatsapp}</a></div>}
            {ph.phone && <div>هاتف: {ph.phone}</div>}
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-8">احفظي هذا الرابط للوصول لاحقًا لتتبع حجزك.</p>

        <ClientGallery token={token} />
        <ClientChat token={token} clientName={b.client_name} />
      </section>
      <Footer />
    </div>
  );
}

function Info({ label, v }: { label: string; v: any }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
      <div className="font-medium">{v ?? "—"}</div>
    </div>
  );
}

function ClientGallery({ token }: { token: string }) {
  const fetchG = useServerFn(getGalleryByToken);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState<string | null>(null);

  const load = async () => {
    try { setData(await fetchG({ data: { token } })); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [token]);

  if (loading) return null;
  if (data?.expired) return <div className="mt-8 rounded-sm border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">انتهت صلاحية معرض الصور.</div>;
  if (!data?.gallery) return null;

  return (
    <div className="mt-8 rounded-sm border border-border bg-card p-5">
      <h2 className="font-serif text-xl mb-4 flex items-center gap-2"><ImageIcon className="h-5 w-5 text-gold" /> {data.gallery.title || "معرض الصور"}</h2>
      {data.photos.length === 0 ? (
        <p className="text-sm text-muted-foreground">لم تُرفع صور بعد. ستظهر هنا فور التسليم.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {data.photos.map((p: any) => (
            <div key={p.id} className="relative group aspect-square bg-secondary rounded-sm overflow-hidden cursor-pointer" onClick={() => setLightbox(p.url)}>
              {p.url && <img src={p.url} alt={p.caption ?? ""} loading="lazy" className="w-full h-full object-cover transition group-hover:scale-105" />}
              {data.gallery.allow_downloads && p.url && (
                <a href={p.url} download onClick={(e) => e.stopPropagation()} className="absolute bottom-1 left-1 bg-black/60 text-white p-1.5 rounded-sm opacity-0 group-hover:opacity-100 transition">
                  <Download className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          ))}
        </div>
      )}
      {lightbox && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <button className="absolute top-4 left-4 text-white p-2" onClick={() => setLightbox(null)}><X className="h-6 w-6" /></button>
          <img src={lightbox} alt="" className="max-w-full max-h-full object-contain" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}

function ClientChat({ token, clientName }: { token: string; clientName: string }) {
  const fetchM = useServerFn(getMessagesByToken);
  const sendM = useServerFn(sendMessageByToken);
  const [msgs, setMsgs] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const load = async () => {
    try { const r = await fetchM({ data: { token } }); setMsgs(r.messages); } catch {}
  };
  useEffect(() => {
    load();
    const id = setInterval(load, 8000);
    return () => clearInterval(id);
    /* eslint-disable-next-line */
  }, [token]);

  const send = async () => {
    if (!text.trim()) return;
    setSending(true);
    try { await sendM({ data: { token, body: text.trim() } }); setText(""); await load(); }
    catch (e: any) { toast.error(e.message); }
    finally { setSending(false); }
  };

  return (
    <div className="mt-8 rounded-sm border border-border bg-card p-5">
      <h2 className="font-serif text-xl mb-4 flex items-center gap-2"><MessageSquare className="h-5 w-5 text-gold" /> المحادثة مع المصوّرة</h2>
      <div className="space-y-2 max-h-96 overflow-y-auto mb-4">
        {msgs.length === 0 && <p className="text-sm text-muted-foreground">ابدئي المحادثة بإرسال رسالة.</p>}
        {msgs.map((m) => {
          const mine = !m.sender_id; // client messages have null sender_id
          return (
            <div key={m.id} className={`p-3 rounded-sm ${mine ? "bg-charcoal text-ivory mr-8" : "bg-secondary ml-8"}`}>
              <div className="text-[10px] opacity-70 mb-1">{mine ? clientName : (m.sender_name || "المصوّرة")} · {new Date(m.created_at).toLocaleString("ar-JO")}</div>
              <div className="text-sm whitespace-pre-wrap">{m.body}</div>
            </div>
          );
        })}
      </div>
      <div className="flex gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="اكتبي رسالة…" className="flex-1 border border-border rounded-sm px-3 py-2 bg-background text-sm" />
        <button onClick={send} disabled={sending || !text.trim()} className="bg-charcoal text-ivory px-4 rounded-sm inline-flex items-center gap-2 disabled:opacity-50">
          <SendIcon className="h-4 w-4" /> إرسال
        </button>
      </div>
    </div>
  );
}