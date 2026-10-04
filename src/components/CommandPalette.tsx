import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Calendar, CalendarDays, FileText, Home, Link2, ListChecks, MessageCircle, Package, Bell, Star, TrendingUp, User, Gift, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuthState } from "@/hooks/use-auth-state";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandShortcut } from "@/components/ui/command";

export const OPEN_COMMAND_EVENT = "memoria:open-command";

/** يفتح لوحة الأوامر من أي زر في الصفحة. */
export function openCommandPalette() {
  window.dispatchEvent(new Event(OPEN_COMMAND_EVENT));
}

const PAGES = [
  { label: "لوحتي", to: "/dashboard", icon: Home, keywords: "dashboard home الرئيسية" },
  { label: "الحجوزات", to: "/dashboard/bookings", icon: Calendar, keywords: "bookings طلبات" },
  { label: "متابعة الإنتاج", to: "/dashboard/production", icon: ListChecks, keywords: "production تحرير تسليم" },
  { label: "التقويم والتوفّر", to: "/dashboard/calendar", icon: CalendarDays, keywords: "calendar حجب أيام" },
  { label: "الأسعار والباقات", to: "/dashboard/pricing", icon: Package, keywords: "pricing باقة سعر" },
  { label: "تعديل ملفي", to: "/dashboard/profile", icon: User, keywords: "profile صور نبذة cliq" },
  { label: "التقارير المالية", to: "/dashboard/reports", icon: TrendingUp, keywords: "reports إيرادات csv" },
  { label: "العقود", to: "/dashboard/contracts", icon: FileText, keywords: "contracts توقيع" },
  { label: "قوالب واتساب", to: "/dashboard/whatsapp-templates", icon: MessageCircle, keywords: "whatsapp رسائل" },
  { label: "الاشتراك", to: "/dashboard/subscription", icon: CreditCard, keywords: "subscription دفع تجديد" },
  { label: "الإشعارات", to: "/notifications", icon: Bell, keywords: "notifications تنبيهات" },
  { label: "برنامج الإحالة", to: "/dashboard/referrals", icon: Gift, keywords: "referral دعوة" },
] as const;

const STATUS: Record<string, string> = {
  quote: "عرض سعر", pending_deposit: "بانتظار العربون", confirmed: "مؤكّد", completed: "مكتمل", cancelled: "ملغى",
};

/** تُركّب اللوحة للمصوّرات المسجّلات فقط، في كل الصفحات. */
export function PhotographerCommandPalette() {
  const { authed, isPhotographer } = useAuthState();
  return authed && isPhotographer ? <CommandPalette /> : null;
}

/**
 * لوحة أوامر (Ctrl/⌘ + K): بحث في الحجوزات والصفحات والإجراءات من أي مكان في لوحة المصوّرة.
 */
export function CommandPalette() {
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [bookings, setBookings] = useState<any[] | null>(null);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_COMMAND_EVENT, onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_COMMAND_EVENT, onOpen);
    };
  }, []);

  // تحميل الحجوزات عند أول فتح فقط
  useEffect(() => {
    if (!open || bookings) return;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const [{ data }, { data: prof }] = await Promise.all([
        supabase.from("bookings").select("id,client_name,client_phone,event_date,status").eq("photographer_id", session.user.id).is("deleted_at", null).order("event_date", { ascending: false }).limit(200),
        supabase.from("profiles").select("username").eq("id", session.user.id).maybeSingle(),
      ]);
      setBookings(data ?? []);
      setUsername((prof as any)?.username ?? null);
    })();
  }, [open, bookings]);

  const go = (fn: () => void) => {
    setOpen(false);
    fn();
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <div dir="rtl">
        <CommandInput placeholder="ابحثي عن عروس أو صفحة أو إجراء…" />
        <CommandList className="max-h-[60vh]">
          <CommandEmpty>لا نتائج. جرّبي اسم العروس أو رقم هاتفها.</CommandEmpty>

          {bookings && bookings.length > 0 && (
            <CommandGroup heading="الحجوزات">
              {bookings.map((b) => (
                <CommandItem
                  key={b.id}
                  value={`${b.client_name} ${b.client_phone ?? ""} ${b.id}`}
                  onSelect={() => go(() => nav({ to: "/dashboard/bookings/$id", params: { id: b.id } }))}
                >
                  <Calendar className="me-2 text-muted-foreground" />
                  <span className="flex-1 truncate">{b.client_name}</span>
                  <span className="ms-2 text-xs text-muted-foreground">
                    {b.event_date ? new Date(b.event_date).toLocaleDateString("ar-JO", { day: "numeric", month: "short" }) : ""} · {STATUS[b.status] ?? b.status}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          <CommandGroup heading="إجراءات سريعة">
            <CommandItem value="إضافة باقة جديدة سعر" onSelect={() => go(() => nav({ to: "/dashboard/pricing" }))}>
              <Package className="me-2 text-muted-foreground" /> إضافة باقة جديدة
            </CommandItem>
            <CommandItem value="حجب يوم عطلة تقويم" onSelect={() => go(() => nav({ to: "/dashboard/calendar" }))}>
              <CalendarDays className="me-2 text-muted-foreground" /> حجب يوم في التقويم
            </CommandItem>
            {username && (
              <CommandItem
                value="نسخ رابط ملفي العام انستجرام"
                onSelect={() => go(async () => {
                  try {
                    await navigator.clipboard.writeText(`${window.location.origin}/photographers/${username}`);
                    toast.success("نُسخ رابط ملفك");
                  } catch { toast.message(`${window.location.origin}/photographers/${username}`); }
                })}
              >
                <Link2 className="me-2 text-muted-foreground" /> نسخ رابط ملفي العام
              </CommandItem>
            )}
            {username && (
              <CommandItem value="عرض ملفي العام كما تراه العرائس" onSelect={() => go(() => window.open(`/photographers/${username}`, "_blank"))}>
                <Star className="me-2 text-muted-foreground" /> عرض ملفي كما تراه العرائس
              </CommandItem>
            )}
          </CommandGroup>

          <CommandGroup heading="الصفحات">
            {PAGES.map((p) => (
              <CommandItem key={p.to} value={`${p.label} ${p.keywords}`} onSelect={() => go(() => nav({ to: p.to as any }))}>
                <p.icon className="me-2 text-muted-foreground" /> {p.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
        <div className="flex items-center justify-between border-t border-border px-3 py-2 text-[11px] text-muted-foreground">
          <span>↑↓ للتنقّل · Enter للفتح</span>
          <CommandShortcut className="ms-0 tracking-normal">Ctrl K</CommandShortcut>
        </div>
      </div>
    </CommandDialog>
  );
}
