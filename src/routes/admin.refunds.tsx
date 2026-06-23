import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PageLoader } from "@/components/ui/loading";
import { useEffect, useState } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { processDepositRefund } from "@/lib/payments.functions";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { RefreshCw, CheckCircle2, Clock, DollarSign } from "lucide-react";

export const Route = createFileRoute("/admin/refunds")({
  component: AdminRefundsPage,
});

function AdminRefundsPage() {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [loading, setLoading] = useState(true);
  const [refunds, setRefunds] = useState<any[]>([]);
  const [processing, setProcessing] = useState<string | null>(null);
  const processRefundFn = useServerFn(processDepositRefund);

  const load = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate({ to: "/login" }); return; }

    // التحقق من أن المستخدم أدمن
    const { data: roles } = await supabase
      .from("user_roles").select("role").eq("user_id", session.user.id);
    const isAdmin = (roles ?? []).some((r: any) => r.role === "admin");
    if (!isAdmin) { navigate({ to: "/dashboard" }); return; }

    // جلب الحجوزات التي تحتاج استرداداً
    const { data: bks, error } = await supabase
      .from("bookings")
      .select("id, client_name, client_email, event_date, refund_amount, refund_status, cancelled_at, cancellation_reason, total_price, deposit_amount, deposit_payment_provider, photographer_id")
      .eq("refund_status", "pending")
      .is("deleted_at", null)
      .order("cancelled_at", { ascending: false });

    if (error) { toast.error(error.message); setLoading(false); return; }

    // ربط بيانات المصوّرة
    const photographerIds = [...new Set((bks ?? []).map((b: any) => b.photographer_id))];
    const { data: profiles } = photographerIds.length
      ? await supabase.from("profiles").select("id, display_name, username").in("id", photographerIds)
      : { data: [] as any[] };
    const profMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));

    setRefunds((bks ?? []).map((b: any) => ({ ...b, photographer: profMap.get(b.photographer_id) })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleProcess = async (bookingId: string, amount: number) => {
    if (!(await confirm({
      title: "تأكيد معالجة الاسترداد",
      description: `هل تريد تأكيد استرداد مبلغ ${amount} للحجز؟ سيتم إرسال إيميل للعميل تلقائياً.`,
      confirmText: "معالجة الاسترداد",
    }))) return;

    setProcessing(bookingId);
    try {
      const res: any = await processRefundFn({ data: { booking_id: bookingId, amount } });
      if (res?.ok) {
        toast.success(`✅ تم معالجة الاسترداد${res.provider_refund_id ? ` (ID: ${res.provider_refund_id})` : ""}`);
        load();
      }
    } catch (e: any) {
      toast.error(e?.message || "تعذّرت معالجة الاسترداد");
    } finally {
      setProcessing(null);
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container-editorial max-w-5xl mx-auto py-10 px-4">
        <div className="flex items-center gap-3 mb-8">
          <DollarSign className="h-6 w-6 text-amber-600" />
          <h1 className="font-serif text-2xl">طلبات استرداد العربون</h1>
          <button
            onClick={load}
            className="mr-auto p-2 rounded-full hover:bg-muted transition-colors"
            title="تحديث"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        {refunds.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500 opacity-60" />
            <p className="text-lg">لا توجد طلبات استرداد معلّقة</p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground mb-4">
              {refunds.length} طلب استرداد معلّق
            </p>
            {refunds.map((b) => (
              <div key={b.id} className="bg-card border border-border rounded-lg p-5">
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-amber-500" />
                      <span className="font-medium">{b.client_name}</span>
                      <span className="text-muted-foreground text-sm">—</span>
                      <span className="text-sm text-muted-foreground">{b.client_email}</span>
                    </div>

                    <div className="text-sm space-y-1">
                      <p>
                        <span className="text-muted-foreground">تاريخ الفعالية:</span>{" "}
                        <span className="font-medium">{b.event_date}</span>
                      </p>
                      <p>
                        <span className="text-muted-foreground">المصوّرة:</span>{" "}
                        <span>{b.photographer?.display_name || b.photographer_id}</span>
                      </p>
                      <p>
                        <span className="text-muted-foreground">مبلغ الاسترداد:</span>{" "}
                        <span className="font-semibold text-amber-700">
                          {Number(b.refund_amount || 0).toFixed(3)} دينار
                        </span>
                        {b.deposit_amount && (
                          <span className="text-xs text-muted-foreground mr-2">
                            (من إجمالي عربون: {Number(b.deposit_amount).toFixed(3)})
                          </span>
                        )}
                      </p>
                      {b.cancellation_reason && (
                        <p>
                          <span className="text-muted-foreground">سبب الإلغاء:</span>{" "}
                          <span className="italic">{b.cancellation_reason}</span>
                        </p>
                      )}
                      <p>
                        <span className="text-muted-foreground">بوّابة الدفع:</span>{" "}
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          b.deposit_payment_provider === "stripe"
                            ? "bg-purple-100 text-purple-700"
                            : b.deposit_payment_provider === "hyperpay"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-gray-100 text-gray-600"
                        }`}>
                          {b.deposit_payment_provider || "يدوي (CliQ)"}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 min-w-[140px]">
                    <button
                      onClick={() => handleProcess(b.id, Number(b.refund_amount || 0))}
                      disabled={processing === b.id}
                      className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2 justify-center"
                    >
                      {processing === b.id ? (
                        <><RefreshCw className="h-4 w-4 animate-spin" /> جاري المعالجة…</>
                      ) : (
                        <><DollarSign className="h-4 w-4" /> معالجة الاسترداد</>
                      )}
                    </button>
                    <span className="text-xs text-center text-muted-foreground">
                      تأكّد من الاسترداد يدوياً إن كان CliQ
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
