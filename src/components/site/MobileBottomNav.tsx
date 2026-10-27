import { useState } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { LayoutDashboard, Calendar, ListChecks, User, Plus, CalendarX, Link2, MessageCircle, Clapperboard, X } from "lucide-react";
import { toast } from "sonner";
import { useAuthState } from "@/hooks/use-auth-state";
import { supabase } from "@/integrations/supabase/client";
import { g } from "@/hooks/use-gender";
import { tx, t } from "@/i18n";

type NavItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
};

// الإشعارات في جرس الهيدر؛ الوسط لزر «+» للإجراءات السريعة أثناء العمل.
const left: NavItem[] = [
  { to: "/dashboard", label: "الرئيسية", icon: LayoutDashboard, exact: true },
  { to: "/dashboard/bookings", label: "الحجوزات", icon: ListChecks },
];
const right: NavItem[] = [
  { to: "/dashboard/calendar", label: "التقويم", icon: Calendar },
  { to: "/dashboard/profile", label: "ملفّي", icon: User },
];

export function MobileBottomNav() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  const tab = (it: NavItem) => {
    const active = it.exact ? pathname === it.to : pathname.startsWith(it.to);
    const Icon = it.icon;
    return (
      <li key={it.to}>
        <Link
          to={it.to as any}
          className={`relative flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${active ? "text-gold" : "text-muted-foreground hover:text-foreground"}`}
        >
          <Icon className="h-5 w-5" />
          <span>{tx(it.label)}</span>
        </Link>
      </li>
    );
  };

  return (
    <>
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 pb-[env(safe-area-inset-bottom)]">
        <ul className="grid grid-cols-5 items-center">
          {left.map(tab)}
          <li className="grid place-items-center">
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label={t("إجراء سريع")}
              className="-mt-5 grid h-14 w-14 place-items-center rounded-full bg-charcoal text-ivory shadow-lg ring-4 ring-background active:scale-95 transition dark:bg-gold dark:text-charcoal"
            >
              <Plus className="h-6 w-6" />
            </button>
          </li>
          {right.map(tab)}
        </ul>
      </nav>
      <QuickActions open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function QuickActions({ open, onClose }: { open: boolean; onClose: () => void }) {
  const nav = useNavigate();
  const { userId } = useAuthState();

  const go = (to: string) => {
    onClose();
    nav({ to: to as any });
  };

  const copyLink = async () => {
    onClose();
    if (!userId) return;
    const { data } = await supabase.from("profiles").select("username").eq("id", userId).maybeSingle();
    if (!data?.username) return toast.error(g(t("أكملي اسم المستخدم من ملفّك أولاً"), t("أكمل اسم المستخدم من ملفّك أولاً")));
    const url = `${window.location.origin}/photographers/${data.username}`;
    try {
      if (navigator.share) await navigator.share({ url });
      else {
        await navigator.clipboard.writeText(url);
        toast.success(t("نُسخ رابط ملفّك"));
      }
    } catch { /* ignore */ }
  };

  const actions = [
    { icon: Plus, label: t("حجز جديد"), hint: g(t("لعميلة تواصلت معكِ خارج المنصّة"), t("لعميلة تواصلت معك خارج المنصّة")), run: () => go("/dashboard/bookings?new=1") },
    { icon: CalendarX, label: t("حجب يوم"), hint: t("سفر أو ارتباط آخر"), run: () => go("/dashboard/calendar") },
    { icon: Link2, label: t("مشاركة رابط ملفّي"), hint: t("للبايو أو الواتساب"), run: copyLink },
    { icon: MessageCircle, label: t("عروض الأسعار"), hint: t("أسعار اقترحتها العرائس"), run: () => go("/dashboard/offers") },
    { icon: MessageCircle, label: t("قوالب واتساب"), hint: t("رسائل جاهزة للعميلات"), run: () => go("/dashboard/whatsapp-templates") },
    { icon: Clapperboard, label: t("متابعة الإنتاج"), hint: t("من التصوير إلى التسليم"), run: () => go("/dashboard/production") },
  ];

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="scrim"
            className="md:hidden fixed inset-0 z-50 bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            key="sheet"
            role="dialog"
            aria-label={t("إجراءات سريعة")}
            className="md:hidden fixed inset-x-0 bottom-0 z-50 rounded-t-3xl border-t border-border bg-background px-4 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))]"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 420, damping: 38 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, i) => { if (i.offset.y > 80 || i.velocity.y > 500) onClose(); }}
          >
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-border" />
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-serif text-lg">{t("إجراء سريع")}</h2>
              <button onClick={onClose} aria-label={t("إغلاق")} className="grid h-11 w-11 place-items-center text-muted-foreground"><X className="h-5 w-5" /></button>
            </div>
            <ul className="divide-y divide-border">
              {actions.map((a) => (
                <li key={a.label}>
                  <button onClick={a.run} className="flex min-h-14 w-full items-center gap-3 py-2 text-start active:bg-secondary/60">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-secondary text-gold"><a.icon className="h-5 w-5" /></span>
                    <span className="min-w-0">
                      <span className="block text-[15px] font-medium">{tx(a.label)}</span>
                      <span className="block text-xs text-muted-foreground">{tx(a.hint)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
