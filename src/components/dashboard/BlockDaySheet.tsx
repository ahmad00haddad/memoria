import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CalendarX } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { t } from "@/i18n";

/** حجب يوم من أي مكان دون مغادرة الصفحة */
export function BlockDaySheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setDate(""); setReason(""); } }, [open]);

  const today = new Date().toISOString().slice(0, 10);
  const save = async () => {
    if (!date || busy) return;
    setBusy(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setBusy(false); return; }
    const { data, error } = await supabase.from("photographer_unavailability")
      .insert({ photographer_id: session.user.id, date, reason: reason.trim() || null }).select("id").maybeSingle();
    setBusy(false);
    if (error) return toast.error(error.message);
    onClose();
    toast.success(t("حُجب اليوم — لن يظهر متاحاً للعرائس"), {
      action: { label: t("تراجع"), onClick: async () => { if (data?.id) await supabase.from("photographer_unavailability").delete().eq("id", data.id); } },
    });
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="rounded-t-3xl px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <SheetHeader className="text-start">
          <SheetTitle className="flex items-center gap-2"><CalendarX className="h-5 w-5 text-gold" />{t("حجب يوم")}</SheetTitle>
        </SheetHeader>
        <label className="mt-4 block text-sm">
          <span className="mb-1 block text-xs text-muted-foreground">{t("اليوم")}</span>
          <input type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} className="h-12 w-full rounded-xl border border-border bg-background px-3 text-base" />
        </label>
        <label className="mt-3 block text-sm">
          <span className="mb-1 block text-xs text-muted-foreground">{t("السبب (اختياري، لا يظهر للعرائس)")}</span>
          <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={80} placeholder={t("سفر، ارتباط آخر…")} className="h-12 w-full rounded-xl border border-border bg-background px-3 text-base" />
        </label>
        <button type="button" onClick={save} disabled={!date || busy} className="mt-5 h-12 w-full rounded-full bg-gold font-medium text-white disabled:opacity-50">
          {busy ? t("نحجب…") : t("احجبي هذا اليوم")}
        </button>
      </SheetContent>
    </Sheet>
  );
}
