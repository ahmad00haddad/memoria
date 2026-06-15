import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MessageCircle, X, Send, Sparkles } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";

type Booking = {
  id: string;
  client_name?: string | null;
  client_phone?: string | null;
  event_date?: string | null;
  venue_name?: string | null;
  venue_address?: string | null;
  deposit_amount?: number | null;
  total_price?: number | null;
  service?: string | null;
  client_tracking_token?: string | null;
};

function substitute(body: string, b: Booking): string {
  const trackingUrl = b.client_tracking_token && typeof window !== "undefined"
    ? `${window.location.origin}/track/${b.client_tracking_token}`
    : "";
  const map: Record<string, string> = {
    client_name: b.client_name ?? "",
    event_date: b.event_date ?? "",
    venue: b.venue_name ?? b.venue_address ?? "",
    deposit_amount: b.deposit_amount != null ? String(b.deposit_amount) : "",
    total_price: b.total_price != null ? String(b.total_price) : "",
    service: b.service ?? "",
    tracking_url: trackingUrl,
  };
  return body.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, k: string) => map[k] ?? "");
}

function normalizePhone(raw: string): string {
  let n = raw.replace(/[^\d+]/g, "");
  if (n.startsWith("00")) n = "+" + n.slice(2);
  if (n.startsWith("+")) n = n.slice(1);
  // Jordanian default: 07XXXXXXXX → 9627XXXXXXXX
  if (/^0\d{9}$/.test(n)) n = "962" + n.slice(1);
  return n;
}

export function WhatsAppQuickSend({ booking }: { booking: Booking }) {
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      let { data } = await supabase
        .from("whatsapp_templates")
        .select("*")
        .eq("photographer_id", session.user.id)
        .order("sort_order");
      if (!data || data.length === 0) {
        await supabase.rpc("seed_default_whatsapp_templates", { _photographer_id: session.user.id });
        const r = await supabase
          .from("whatsapp_templates")
          .select("*")
          .eq("photographer_id", session.user.id)
          .order("sort_order");
        data = r.data ?? [];
      }
      setTemplates(data);
      if (data && data.length > 0) {
        setSelected(data[0].id);
        setBody(substitute(data[0].body, booking));
      }
      setLoading(false);
    })();
  }, [open, booking]);

  const pickTemplate = (id: string) => {
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    setSelected(id);
    setBody(substitute(t.body, booking));
  };

  const send = () => {
    if (!booking.client_phone) {
      toast.error("لا يوجد رقم هاتف للعميل");
      return;
    }
    const phone = normalizePhone(booking.client_phone);
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(body)}`;
    window.open(url, "_blank");
    setOpen(false);
  };

  const copy = async () => {
    await navigator.clipboard.writeText(body);
    toast.success("تم نسخ النص");
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={!booking.client_phone}
        className="inline-flex items-center gap-2 text-sm bg-emerald-600 text-white px-3 py-2 rounded-sm hover:bg-emerald-700 disabled:opacity-50"
      >
        <MessageCircle className="h-4 w-4" />
        رسالة واتساب
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/60 grid place-items-center p-4" onClick={() => setOpen(false)}>
          <div className="bg-card border border-border rounded-sm w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-emerald-600" />
                <h3 className="font-serif text-xl">إرسال رسالة واتساب</h3>
              </div>
              <button onClick={() => setOpen(false)} className="p-1 hover:bg-secondary rounded-sm"><X className="h-5 w-5" /></button>
            </div>

            <div className="p-4 space-y-4">
              {loading ? (
                <div className="text-center text-muted-foreground py-8">جاري التحميل…</div>
              ) : templates.length === 0 ? (
                <div className="text-sm text-muted-foreground">لا توجد قوالب. <Link to="/dashboard/whatsapp-templates" className="text-gold underline">أنشئي قالباً</Link></div>
              ) : (
                <>
                  <div>
                    <label className="text-xs text-muted-foreground mb-2 block">اختاري قالباً</label>
                    <div className="flex flex-wrap gap-2">
                      {templates.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => pickTemplate(t.id)}
                          className={`text-xs px-3 py-1.5 rounded-sm border ${selected === t.id ? "bg-charcoal text-ivory border-charcoal" : "border-border hover:bg-secondary"}`}
                        >
                          {t.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-muted-foreground mb-2 block">نص الرسالة (يمكنك تعديلها قبل الإرسال)</label>
                    <textarea
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      rows={10}
                      className="w-full text-sm border border-border bg-background rounded-sm p-3 leading-loose"
                      dir="rtl"
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>الإرسال إلى: {booking.client_phone || "لا يوجد رقم"}</span>
                    <Link to="/dashboard/whatsapp-templates" className="text-gold inline-flex items-center gap-1">
                      <Sparkles className="h-3 w-3" /> إدارة القوالب
                    </Link>
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 p-4 border-t border-border">
              <button onClick={copy} className="text-sm border border-border px-4 py-2 rounded-sm hover:bg-secondary">نسخ النص</button>
              <button onClick={send} disabled={!booking.client_phone} className="inline-flex items-center gap-2 text-sm bg-emerald-600 text-white px-4 py-2 rounded-sm hover:bg-emerald-700 disabled:opacity-50">
                <Send className="h-4 w-4" />
                فتح واتساب
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}