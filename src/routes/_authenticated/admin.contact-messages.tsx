import { createFileRoute } from "@tanstack/react-router";
import { getLang, dirOf } from "@/i18n";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mail, Clock, MessageCircle, CheckCircle, AlertCircle, Trash2 } from "lucide-react";
import { locale } from "@/i18n";
import { t, tx } from "@/i18n";

export const Route = createFileRoute("/_authenticated/admin/contact-messages")({
  component: AdminContactMessages,
});

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  new:     { label: "جديدة",       color: "bg-blue-100 text-blue-700" },
  read:    { label: "مقروءة",      color: "bg-gray-100 text-gray-700" },
  replied: { label: "تم الرد",     color: "bg-green-100 text-green-700" },
  spam:    { label: "سبام",        color: "bg-red-100 text-red-700" },
};

async function fetchMessages(filter: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  let q: any = (supabaseAdmin as any).from("contact_messages").select("*").order("created_at", { ascending: false });
  if (filter !== "all") q = q.eq("status", filter);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

function AdminContactMessages() {
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const qc = useQueryClient();

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["admin-contact-messages", filter],
    queryFn: () => fetchMessages(filter),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, admin_notes }: { id: string; status: string; admin_notes?: string }) => {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { error } = await (supabaseAdmin as any)
        .from("contact_messages")
        .update({ status, ...(admin_notes !== undefined ? { admin_notes } : {}) })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-contact-messages"] });
      toast.success(t("تم التحديث"));
    },
    onError: () => toast.error(t("فشل التحديث")),
  });

  const selectedMsg = messages.find((m: any) => m.id === selected);

  return (
    <div className="p-6 max-w-6xl mx-auto" dir={dirOf(getLang())}>
      <div className="mb-6">
        <h1 className="font-serif text-3xl mb-1">{t("رسائل التواصل")}</h1>
        <p className="text-muted-foreground text-sm">{t("الرسائل الواردة من صفحة /contact — راجعها وردّ يدوياً على البريد.")}</p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {["all", "new", "read", "replied", "spam"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              filter === f ? "bg-charcoal text-ivory border-charcoal" : "border-border hover:bg-accent"
            }`}
          >
            {f === "all" ? t("الكل") : STATUS_LABELS[f]?.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        {/* Messages List */}
        <div className="lg:col-span-2 space-y-2">
          {isLoading && <p className="text-muted-foreground text-sm">{t("جاري التحميل...")}</p>}
          {!isLoading && messages.length === 0 && (
            <p className="text-muted-foreground text-sm py-8 text-center">{t("لا توجد رسائل")}</p>
          )}
          {messages.map((msg: any) => (
            <button
              key={msg.id}
              onClick={() => { setSelected(msg.id); setNotes(msg.admin_notes || ""); }}
              className={`w-full text-start rounded-lg border p-3 transition-colors hover:bg-accent ${
                selected === msg.id ? "border-gold bg-gold/5" : "border-border"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-sm truncate">{tx(msg.name)}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${STATUS_LABELS[msg.status]?.color}`}>
                  {tx(STATUS_LABELS[msg.status]?.label)}
                </span>
              </div>
              <div className="text-xs text-muted-foreground truncate">{tx(msg.email)}</div>
              <div className="text-xs text-muted-foreground mt-1 line-clamp-1">{tx(msg.message)}</div>
              <div className="text-[10px] text-muted-foreground mt-1">
                {new Date(msg.created_at).toLocaleDateString(locale("ar-JO"), { day: "numeric", month: "long", year: "numeric" })}
              </div>
            </button>
          ))}
        </div>

        {/* Message Detail */}
        <div className="lg:col-span-3">
          {!selectedMsg ? (
            <div className="border border-border rounded-xl h-full flex items-center justify-center min-h-64">
              <p className="text-muted-foreground text-sm">{t("اختر رسالة للعرض")}</p>
            </div>
          ) : (
            <div className="border border-border rounded-xl p-5 space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="font-serif text-xl">{tx(selectedMsg.name)}</h2>
                  <a href={`mailto:${selectedMsg.email}`} className="text-sm text-gold hover:underline">
                    {tx(selectedMsg.email)}
                  </a>
                  {selectedMsg.phone && (
                    <div className="text-xs text-muted-foreground mt-0.5">{tx(selectedMsg.phone)}</div>
                  )}
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${STATUS_LABELS[selectedMsg.status]?.color}`}>
                  {tx(STATUS_LABELS[selectedMsg.status]?.label)}
                </span>
              </div>

              <div className="rounded-lg bg-secondary p-4 text-sm leading-relaxed whitespace-pre-wrap">
                {tx(selectedMsg.message)}
              </div>

              <div>
                <label className="text-xs text-muted-foreground block mb-1">{t("ملاحظات داخلية")}</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder={t("ملاحظاتك الداخلية (لن تُرسل للمستخدم)")}
                  className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm resize-none"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <a
                  href={t("mailto:{0}?subject=ردّ على رسالتك — Memoria", [selectedMsg.email])}
                  onClick={() => updateStatus.mutate({ id: selectedMsg.id, status: "replied", admin_notes: notes })}
                  className="flex items-center gap-1.5 rounded-md bg-charcoal text-ivory px-3 py-1.5 text-xs hover:opacity-90"
                >
                  <Mail className="h-3.5 w-3.5" />{" "}{t("الرد بالبريد")}
                </a>
                <button
                  onClick={() => updateStatus.mutate({ id: selectedMsg.id, status: "read", admin_notes: notes })}
                  className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-accent"
                >
                  <CheckCircle className="h-3.5 w-3.5" />{" "}{t("تعيين كمقروءة")}
                </button>
                <button
                  onClick={() => updateStatus.mutate({ id: selectedMsg.id, status: "spam", admin_notes: notes })}
                  className="flex items-center gap-1.5 rounded-md border border-red-200 text-red-600 px-3 py-1.5 text-xs hover:bg-red-50"
                >
                  <AlertCircle className="h-3.5 w-3.5" />{" "}{t("سبام")}
                </button>
                {notes !== (selectedMsg.admin_notes || "") && (
                  <button
                    onClick={() => updateStatus.mutate({ id: selectedMsg.id, status: selectedMsg.status, admin_notes: notes })}
                    className="flex items-center gap-1.5 rounded-md bg-gold/10 text-gold px-3 py-1.5 text-xs hover:bg-gold/20"
                  >
                    {t("حفظ الملاحظات")}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
