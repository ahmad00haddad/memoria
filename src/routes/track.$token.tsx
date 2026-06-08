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
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, Clock, Upload, Copy, Camera, Image as ImageIcon, Truck, MessageSquare } from "lucide-react";
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