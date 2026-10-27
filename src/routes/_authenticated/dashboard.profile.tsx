import { motion, AnimatePresence } from "framer-motion";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { PageLoader } from "@/components/ui/loading";
import { useEffect, useRef, useState } from "react";
import { GenderPicker } from "@/components/dashboard/GenderPicker";
import { g, useGender } from "@/hooks/use-gender";
import { Header } from "@/components/site/Header";
import { BackToDashboard } from "@/components/site/BackToDashboard";
import { Footer } from "@/components/site/Footer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, X, Eye, Check, ChevronDown, Link2 } from "lucide-react";
import { splitPortfolioItem, joinPortfolioItem, safeLink, linkLabel } from "@/lib/portfolio-link";
import { useServerFn } from "@tanstack/react-start";
import { updateRefundPolicy } from "@/lib/cancellation.functions";
import { uploadProfilePhoto, uploadPortfolioPhoto, deletePortfolioPhoto, MAX_PORTFOLIO_PHOTOS } from "@/lib/upload";
import { getMyVerification, requestVerification, updateNotificationPreferences } from "@/lib/trust.functions";
import { startTour, useTourState, resetTour } from "@/components/ClientTour";
import { locale } from "@/i18n";
import { t as tr, tx } from "@/i18n";

// Empty input means "use the default"; 0 is a real value and must be kept.
const numOr = (v: unknown, def: number) => (v === "" || v == null ? def : Number(v));

export const Route = createFileRoute("/_authenticated/dashboard/profile")({ component: ProfilePage });


function LivePhonePreview({ p }: { p: any }) {
  return (
    <div className="hidden lg:block sticky top-24">
      <div className="text-xs font-bold text-muted-foreground mb-3 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        {tr("المعاينة الحية (كما تراها العروس)")}
      </div>
      <div className="relative w-[320px] h-[650px] bg-background border-[10px] border-charcoal rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col">
        {/* Notch */}
        <div className="absolute top-0 end-1/2 -translate-x-1/2 w-32 h-6 bg-charcoal rounded-b-2xl z-50"></div>
        
        {/* Cover */}
        <div className="h-40 bg-secondary/50 relative overflow-hidden shrink-0">
          {p.cover_url ? (
            <img src={p.cover_url} className="w-full h-full object-cover" alt="Cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground/30 font-bold text-2xl">MEMORIA</div>
          )}
        </div>
        
        {/* Avatar */}
        <div className="absolute top-28 start-6 w-20 h-20 bg-background rounded-full p-1 shadow-md z-10">
          {p.avatar_url ? (
             <img src={p.avatar_url} className="w-full h-full rounded-full object-cover" alt="Avatar" />
          ) : (
             <div className="w-full h-full rounded-full bg-secondary flex items-center justify-center">📷</div>
          )}
        </div>

        {/* Info */}
        <div className="px-5 pt-12 pb-4 flex-1 overflow-y-auto">
          <h2 className="font-serif text-xl font-bold">{p.display_name || tr("اسم المصورة")}</h2>
          <p className="text-[10px] text-muted-foreground mb-3">{p.city || tr("المدينة")}{" "}{tr("• 100% نسبة الرد")}</p>
          <div className="text-xs mb-4 p-3 bg-secondary/30 rounded-lg text-foreground/80 leading-relaxed border border-border/50">
            {p.bio || g(tr("اكتبي نبذة تعريفية جذابة هنا لتظهر للعرائس..."), tr("اكتب نبذة تعريفية جذابة هنا لتظهر للعرائس..."))}
          </div>
          
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="bg-emerald-50 text-emerald-700 text-center py-2 rounded-md text-[10px] font-bold border border-emerald-100">
              {tr("واتساب")}
            </div>
            <div className="bg-charcoal text-white text-center py-2 rounded-md text-[10px] font-bold">
              {tr("طلب حجز")}
            </div>
          </div>
          
          <h3 className="font-bold text-xs mb-2">{tr("معرض الصور")}</h3>
          <div className="grid grid-cols-2 gap-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="aspect-square bg-secondary/50 rounded-md"></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfilePage() {
  useGender(); // يعيد الرسم فور تغيير صيغة المخاطبة
  const nav = useNavigate();
  const updRefundFn = useServerFn(updateRefundPolicy);
  const verifyFn = useServerFn(requestVerification);
  const myVerificationFn = useServerFn(getMyVerification);
  const [vInfo, setVInfo] = useState<{ status: string; verified_at: string | null; checks: { key: string; label: string; ok: boolean }[] } | null>(null);
  const loadVerification = () => { myVerificationFn().then(setVInfo as any).catch(() => {}); };
  useEffect(() => { loadVerification(); /* eslint-disable-next-line */ }, []);
  const notifFn = useServerFn(updateNotificationPreferences);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uid, setUid] = useState("");
  const [p, setP] = useState<any>({});
  const fileRef = useRef<HTMLInputElement>(null);
  const portfolioRef = useRef<HTMLInputElement>(null);
  const tourState = useTourState();

  const [originalP, setOriginalP] = useState<any>(null);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const toggle = (id: string) => setOpenSections((s) => ({ ...s, [id]: !(s[id] ?? ["sec-photos", "sec-basics", "sec-contact"].includes(id)) }));
  const [dragOver, setDragOver] = useState(false);
  const [portfolioUploading, setPortfolioUploading] = useState(false);
  const [usernameState, setUsernameState] = useState<"idle" | "checking" | "free" | "taken">("idle");

  // التحقق من توفّر اسم المستخدم أثناء الكتابة
  useEffect(() => {
    const u = String(p?.username ?? "").trim();
    if (!u || !originalP || u === originalP.username) { setUsernameState("idle"); return; }
    setUsernameState("checking");
    const t = setTimeout(async () => {
      const { data } = await supabase.from("profiles").select("id").eq("username", u).neq("id", uid).maybeSingle();
      setUsernameState(data ? "taken" : "free");
    }, 450);
    return () => clearTimeout(t);
  }, [p?.username, originalP, uid]);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return nav({ to: "/login" });
      setUid(session.user.id);
      const [{ data }, { data: priv }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", session.user.id).maybeSingle(),
        supabase.from("photographer_private").select("*").eq("user_id", session.user.id).maybeSingle(),
      ]);
      const merged = { ...(data ?? {}), ...(priv ?? {}) };
      setP(merged);
      setOriginalP(merged);
      setLoading(false);
    })();
  }, [nav]);

  // Idea 9: Unsaved Changes Warning
  useEffect(() => {
    const isDirty = originalP && p && JSON.stringify(originalP) !== JSON.stringify(p);
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = tr("لديك تعديلات غير محفوظة. هل أنت متأكد من المغادرة؟");
        return e.returnValue;
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [originalP, p]);

  const onAvatar = async (f: File) => {
    const res = await uploadProfilePhoto(f, uid, "avatar");
    if (res.ok) {
      const url = res.publicUrl || res.path;
      setP((cur: any) => ({ ...cur, avatar_url: url }));
      setOriginalP((o: any) => ({ ...o, avatar_url: url }));
      const { error } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", uid);
      if (error) return toast.error(error.message);
      toast.success(tr("صورتك الجديدة ظاهرة الآن"));
    } else {
      toast.error(res.userMessage);
    }
  };

  const onCover = async (f: File) => {
    const res = await uploadProfilePhoto(f, uid, "cover");
    if (res.ok) {
      const url = res.publicUrl || res.path;
      setP((cur: any) => ({ ...cur, cover_url: url }));
      setOriginalP((o: any) => ({ ...o, cover_url: url }));
      const { error } = await supabase.from("profiles").update({ cover_url: url }).eq("id", uid);
      if (error) return toast.error(error.message);
      toast.success(tr("الغلاف الجديد ظاهر الآن"));
    } else {
      toast.error(res.userMessage);
    }
  };

  const onPortfolio = async (files: FileList) => {
    const room = MAX_PORTFOLIO_PHOTOS - (p.portfolio_urls ?? []).length;
    if (room <= 0) return toast.error(g(tr("وصلتِ للحد الأقصى ({0} صورة). احذفي صورة لإضافة أخرى.", [MAX_PORTFOLIO_PHOTOS]), tr("وصلت للحد الأقصى ({0} صورة). احذف صورة لإضافة أخرى.", [MAX_PORTFOLIO_PHOTOS])));
    const picked = Array.from(files);
    if (picked.length > room) toast(tr("سيتم رفع {0} صور فقط — الحد الأقصى {1} صورة", [room, MAX_PORTFOLIO_PHOTOS]));
    setPortfolioUploading(true);
    try {
      const urls: string[] = [];
      for (const f of picked.slice(0, room)) {
        const res = await uploadPortfolioPhoto(f, uid);
        if (res.ok) urls.push(res.publicUrl || res.path);
        else toast.error(res.userMessage);
      }
      if (urls.length > 0) {
        const newUrls = [...(p.portfolio_urls ?? []), ...urls];
        setP((cur: any) => ({ ...cur, portfolio_urls: newUrls }));
        setOriginalP((o: any) => ({ ...o, portfolio_urls: newUrls }));
        const { error } = await supabase.from("profiles").update({ portfolio_urls: newUrls }).eq("id", uid);
        if (error) return toast.error(error.message);
        toast.success(urls.length === 1 ? tr("أُضيفت الصورة") : tr("أُضيفت {0} صور", [urls.length]));
      }
    } catch (e: any) { toast.error(e.message); }
    finally { setPortfolioUploading(false); }
  };

  const savePortfolio = async (arr: string[]) => {
    setP((cur: any) => ({ ...cur, portfolio_urls: arr }));
    setOriginalP((o: any) => ({ ...o, portfolio_urls: arr }));
    const { error } = await supabase.from("profiles").update({ portfolio_urls: arr }).eq("id", uid);
    if (error) toast.error(error.message);
    return !error;
  };

  // إزالة مع إمكانية التراجع
  const removePortfolio = async (i: number) => {
    const before = [...(p.portfolio_urls ?? [])];
    const arr = before.filter((_, idx) => idx !== i);
    if (!(await savePortfolio(arr))) return;
    let undone = false;
    toast(tr("أُزيلت الصورة"), { action: { label: tr("تراجع"), onClick: () => { undone = true; savePortfolio(before); } } });
    // بعد انتهاء مهلة التراجع نحذف الملف فعلياً من التخزين
    setTimeout(() => { if (!undone) deletePortfolioPhoto(splitPortfolioItem(before[i]).src).catch(() => {}); }, 8000);
  };

  // ربط صورة برابط خارجي (فيديو/ألبوم). فارغ = إزالة الرابط.
  const editPortfolioLink = async (i: number) => {
    const arr = [...(p.portfolio_urls ?? [])];
    const { src, link } = splitPortfolioItem(arr[i]);
    const input = window.prompt(g(tr("رابط يفتح عند النقر على الصورة (يوتيوب، Drive، Behance…). اتركيه فارغاً لإزالته."), tr("رابط يفتح عند النقر على الصورة (يوتيوب، Drive، Behance…). اتركه فارغاً لإزالته.")), link ?? "");
    if (input === null) return;
    if (input.trim() && !safeLink(input)) return toast.error(tr("الرابط غير صالح"));
    arr[i] = joinPortfolioItem(src, input);
    if (await savePortfolio(arr)) toast.success(input.trim() ? tr("رُبطت الصورة بالرابط") : tr("أُزيل الرابط"));
  };

  const save = async () => {
    if (usernameState === "taken") return toast.error(g(tr("اسم المستخدم محجوز — اختاري اسماً آخر"), tr("اسم المستخدم محجوز — اختر اسماً آخر")));
    setSaving(true);
    const finalDepositPercent = Math.max(0, Math.min(100, numOr(p.deposit_percent, 25)));
    const finalFixedDeposit = p.fixed_deposit ? Math.max(0, Number(p.fixed_deposit)) : null;

    const { error } = await supabase.from("profiles").update({
      display_name: p.display_name, username: p.username, bio: p.bio, city: p.city,
      base_location: p.base_location, instagram: p.instagram,
      equipment: p.equipment, deposit_percent: finalDepositPercent,
      travel_fee_per_km: Math.max(0, numOr(p.travel_fee_per_km, 0.5)), free_km: Math.max(0, numOr(p.free_km, 20)),
      avatar_url: p.avatar_url, cover_url: p.cover_url, portfolio_urls: p.portfolio_urls ?? [],
      is_published: !!p.is_published,
      tagline: p.tagline ?? null,
      booking_notes: p.booking_notes ?? null,
      fixed_deposit: finalFixedDeposit,
    }).eq("id", uid);
    const { error: pErr } = await supabase.from("photographer_private").upsert({
      user_id: uid,
      phone: p.phone ?? null,
      whatsapp: p.whatsapp ?? null,
      cliq_alias: p.cliq_alias ?? null,
      bank_info: p.bank_info ?? null,
    }, { onConflict: "user_id" });
    // سياسة استرداد العربون عبر server fn مُصادَق (تتحقّق من ownership)
    try {
      await updRefundFn({ data: {
        policy: "none",
        percent: null,
      }});
    } catch (e: any) {
      setSaving(false);
      return toast.error(e?.message || tr("تعذّر حفظ سياسة الاسترداد"));
    }
    setSaving(false);
    if (error || pErr) return toast.error((error ?? pErr)!.message);
    setOriginalP(p);
    loadVerification();
    toast.success(p.is_published && !originalP?.is_published ? tr("حُفظ ملفك وأصبح منشوراً للعرائس") : tr("حُفظت التغييرات"));
  };

  if (loading) return <PageLoader />;

  const isDirty = !!originalP && JSON.stringify(originalP) !== JSON.stringify(p);
  const portfolioCount = (p.portfolio_urls ?? []).length;
  const bioWords = String(p.bio ?? "").trim().split(/\s+/).filter(Boolean).length;
  const depositPct = Math.max(0, Math.min(100, numOr(p.deposit_percent, 25)));
  const checklist = [
    { key: "photos", label: tr("صورة شخصية وغلاف"), done: !!p.avatar_url && !!p.cover_url, section: "sec-photos" },
    { key: "portfolio", label: tr("٥ صور أعمال على الأقل"), done: portfolioCount >= 5, section: "sec-photos" },
    { key: "basics", label: tr("الاسم واسم المستخدم والمدينة"), done: !!p.display_name && !!p.username && !!p.city, section: "sec-basics" },
    { key: "bio", label: tr("نبذة تعريفية"), done: bioWords >= 15, section: "sec-basics" },
    { key: "payment", label: tr("طريقة استلام العربون"), done: !!(p.cliq_alias || p.bank_info), section: "sec-contact" },
  ];
  const doneCount = checklist.filter((c) => c.done).length;
  const pct = Math.round((doneCount / checklist.length) * 100);
  const jump = (id: string) => {
    setOpenSections((s) => ({ ...s, [id]: true }));
    requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <section className="container-editorial py-12 pb-32 max-w-6xl">
        <BackToDashboard />
        <div className="flex items-center justify-between mt-2 mb-8 flex-wrap gap-4">
          <h1 className="font-serif text-4xl">{tr("ملفي")}</h1>
          {p?.username && (
            <Link
              to="/photographers/$username"
              params={{ username: p.username }}
              target="_blank"
              className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm hover:border-gold/50 hover:text-gold transition-colors"
            >
              <Eye className="h-4 w-4" />
              {tr("كما تراه العرائس")}
            </Link>
          )}
        </div>
<div className="grid lg:grid-cols-[1fr_auto] gap-12 items-start"><div className="space-y-6 min-w-0">

        {/* ── النشر + نسبة الاكتمال في مكان واحد أعلى الصفحة ── */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <CompletionRing value={pct} />
              <div>
                <div className="font-medium">{pct === 100 ? tr("ملفك مكتمل") : tr("ملفك مكتمل {0}٪", [pct])}</div>
                <div className="text-xs text-muted-foreground">{pct === 100 ? tr("جاهز ليظهر بأفضل صورة في البحث.") : tr("الملفات المكتملة تظهر أعلى نتائج البحث.")}</div>
              </div>
            </div>
            <button
              role="switch"
              aria-checked={!!p.is_published}
              onClick={() => setP({ ...p, is_published: !p.is_published })}
              className={`inline-flex items-center gap-3 rounded-full border px-4 py-2 text-sm transition-colors ${p.is_published ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300" : "border-border"}`}
            >
              <span className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${p.is_published ? "bg-emerald-500" : "bg-secondary ring-1 ring-border"}`}>
                <motion.span layout transition={{ type: "spring", stiffness: 600, damping: 35 }} className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow ${p.is_published ? "start-[18px]" : "start-0.5"}`} />
              </span>
              {p.is_published ? tr("منشور للعرائس") : tr("غير منشور")}
            </button>
          </div>
          {pct < 100 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {checklist.filter((c) => !c.done).map((c) => (
                <button key={c.key} onClick={() => jump(c.section)} className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-border px-3 py-1.5 text-xs text-muted-foreground hover:border-gold/50 hover:text-foreground transition-colors">
                  <span className="h-1.5 w-1.5 rounded-full bg-gold" /> {tx(c.label)}
                </button>
              ))}
            </div>
          )}
          {!p.is_published && pct === 100 && (
            <p className="mt-4 text-sm text-gold">{g(tr("كل شيء جاهز — فعّلي النشر واحفظي ليظهر ملفك في البحث."), tr("كل شيء جاهز — فعّل النشر واحفظ ليظهر ملفك في البحث."))}</p>
          )}
        </div>

        <Card id="sec-photos" title={tr("الصور")} done={!!p.avatar_url && !!p.cover_url && portfolioCount >= 5} open={openSections["sec-photos"] ?? true} onToggle={toggle}>
            <div className="grid sm:grid-cols-2 gap-4">
              <ImgPicker label={tr("الصورة الشخصية")} url={p.avatar_url} onPick={onAvatar} />
              <ImgPicker label={tr("صورة الغلاف")} url={p.cover_url} onPick={onCover} aspect="aspect-[16/9]" hint={!p.cover_url ? tr("الغلاف أول ما تراه العروس في ملفك") : undefined} />
            </div>

            <div className="mt-6">
              <div className="mb-1 flex items-baseline justify-between">
                <span className="text-sm">{tr("معرض الأعمال")}</span>
                <span className={`text-xs tabular-nums ${portfolioCount >= 5 ? "text-muted-foreground" : "text-gold"}`}>{tx(portfolioCount)}/{tx(MAX_PORTFOLIO_PHOTOS)} {portfolioCount < 5 ? g(tr("· أضيفي {0} لتظهري في البحث", [5 - portfolioCount]), tr("· أضف {0} لتظهر في البحث", [5 - portfolioCount])) : tr("صورة")}</span>
              </div>
              <p className="mb-3 text-xs text-muted-foreground">{tr("الصورة الأولى هي ما تراه العروس في نتائج البحث.")}</p>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                <AnimatePresence initial={false}>
                  {(p.portfolio_urls ?? []).map((u: string, i: number) => (
                    <motion.div
                      key={u}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="group relative aspect-square bg-secondary rounded-xl overflow-hidden border border-border"
                    >
                      <img src={splitPortfolioItem(u).src} className="w-full h-full object-cover" alt="" loading="lazy" />
                      {splitPortfolioItem(u).link && <span className="absolute bottom-1.5 end-1.5 rounded-full bg-gold px-2 py-0.5 text-[10px] font-medium text-charcoal">{linkLabel(splitPortfolioItem(u).link!)}</span>}
                      <button onClick={() => editPortfolioLink(i)} aria-label={tr("ربط الصورة برابط")} title={tr("ربط برابط فيديو أو ألبوم")} className="absolute top-1.5 end-1.5 grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white opacity-100 sm:opacity-0 sm:group-hover:opacity-100 hover:bg-gold hover:text-charcoal transition"><Link2 className="h-3.5 w-3.5" /></button>
                      {i === 0 && <span className="absolute bottom-1.5 start-1.5 rounded-full bg-black/60 px-2 py-0.5 text-[10px] text-white">{tr("الغلاف في البحث")}</span>}
                      <button onClick={() => removePortfolio(i)} aria-label={tr("إزالة الصورة")} className="absolute top-1.5 start-1.5 grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white opacity-100 sm:opacity-0 sm:group-hover:opacity-100 hover:bg-red-500 transition"><X className="h-3.5 w-3.5" /></button>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {portfolioCount < MAX_PORTFOLIO_PHOTOS && <div
                  onClick={() => portfolioRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) onPortfolio(e.dataTransfer.files);
                  }}
                  className={`aspect-square border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 text-muted-foreground group active:scale-95 ${dragOver ? "border-gold bg-gold/10 scale-105" : "border-border hover:bg-secondary"}`}
                >
                  {portfolioUploading ? (
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-gold/30 border-t-gold" />
                  ) : (
                    <Upload className="h-6 w-6 mb-2 transition-transform duration-300 group-hover:-translate-y-1 group-hover:text-gold" />
                  )}
                  <span className="text-[11px] text-center px-2">{portfolioUploading ? tr("جاري الرفع…") : dragOver ? g(tr("أفلتي الصور هنا"), tr("أفلت الصور هنا")) : tr("إضافة صور")}</span>
                </div>}
                <input ref={portfolioRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => e.target.files && onPortfolio(e.target.files)} />
              </div>
            </div>
          </Card>

          <Card id="sec-basics" title={tr("المعلومات الأساسية")} done={!!p.display_name && !!p.username && !!p.city && bioWords >= 15} open={openSections["sec-basics"] ?? true} onToggle={toggle}>
            <div className="block">
              <span className="mb-1 block text-sm text-muted-foreground">{tr("صيغة المخاطبة في لوحة التحكم")}</span>
              <GenderPicker />
            </div>
            <Field label={tr("الاسم المعروض")} v={p.display_name} on={(v) => setP({ ...p, display_name: v })} />
            <label className="block">
              <span className="text-sm text-muted-foreground">{tr("اسم المستخدم (يظهر في رابط ملفك)")}</span>
              <div className="relative mt-1">
                <input
                  dir="ltr"
                  value={p.username ?? ""}
                  onChange={(e) => setP({ ...p, username: e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, "") })}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 pe-28"
                />
                <span className={`absolute end-3 top-1/2 -translate-y-1/2 text-xs ${usernameState === "taken" ? "text-destructive" : usernameState === "free" ? "text-emerald-600" : "text-muted-foreground"}`}>
                  {usernameState === "checking" ? tr("نتحقّق…") : usernameState === "taken" ? tr("محجوز") : usernameState === "free" ? tr("متاح ✓") : ""}
                </span>
              </div>
              {p.username && <span className="mt-1 block text-xs text-muted-foreground" dir="ltr">{typeof window !== "undefined" ? window.location.host : ""}/photographers/{tx(p.username)}</span>}
            </label>
            <Field label={tr("شعار قصير — مثال: PHOTOGRAPHY")} v={p.tagline} on={(v) => setP({ ...p, tagline: v })} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={tr("المدينة")} v={p.city} on={(v) => setP({ ...p, city: v })} />
              <Field label={tr("الموقع الأساسي (لحساب رسوم التنقّل)")} v={p.base_location} on={(v) => setP({ ...p, base_location: v })} />
            </div>
            <Area
              label={tr("نبذة قصيرة")}
              v={p.bio}
              on={(v) => setP({ ...p, bio: v })}
              hint={bioWords === 0 ? tr("النبذات بين ٤٠ و٨٠ كلمة تحصل على حجوزات أكثر.") : bioWords < 40 ? g(tr("{0} كلمة — أضيفي قليلاً عن أسلوبك وما يميّزك.", [bioWords]), tr("{0} كلمة — أضف قليلاً عن أسلوبك وما يميّزك.", [bioWords])) : bioWords > 120 ? tr("{0} كلمة — النبذة الأقصر تُقرأ أكثر.", [bioWords]) : tr("{0} كلمة — طول مناسب.", [bioWords])}
            />
            <Area label={tr("المعدّات")} v={p.equipment} on={(v) => setP({ ...p, equipment: v })} />
          </Card>

          <Card id="sec-contact" title={tr("التواصل والدفع")} done={!!(p.cliq_alias || p.bank_info) && !!(p.whatsapp || p.phone)} open={openSections["sec-contact"] ?? true} onToggle={toggle}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={tr("رقم الهاتف")} v={p.phone} on={(v) => setP({ ...p, phone: v })} hint={tr("لا يظهر للعموم")} ltr />
              <Field label={tr("واتساب")} v={p.whatsapp} on={(v) => setP({ ...p, whatsapp: v })} hint={tr("تصلك عليه طلبات الحجز — لا يظهر للعموم")} ltr />
            </div>
            <Field label={tr("إنستغرام (اسم المستخدم)")} v={p.instagram} on={(v) => setP({ ...p, instagram: v })} ltr />
            <Field label={tr("CliQ Alias لاستلام العربون")} v={p.cliq_alias} on={(v) => setP({ ...p, cliq_alias: v })} hint={!p.cliq_alias ? tr("بدون CliQ أو حساب بنكي لن تعرف العروس أين تحوّل العربون.") : tr("يظهر للعروس فقط بعد طلب الحجز.")} ltr />
            <Area label={tr("معلومات الحساب البنكي (بنك / رقم حساب / IBAN)")} v={p.bank_info} on={(v) => setP({ ...p, bank_info: v })} />
          </Card>

          <Card id="sec-booking" title={tr("إعدادات الحجز")} open={openSections["sec-booking"] ?? false} onToggle={toggle}>
            <div className="grid sm:grid-cols-2 gap-4">
              <NumField label={tr("نسبة العربون (%)")} value={p.deposit_percent} onChange={(v) => setP({ ...p, deposit_percent: v })} min={0} max={100} />
              <NumField label={tr("أو عربون ثابت (د.أ)")} value={p.fixed_deposit} onChange={(v) => setP({ ...p, fixed_deposit: v })} min={0} placeholder={tr("اختياري — يُلغي النسبة")} />
            </div>
            <p className="rounded-xl bg-secondary/50 px-3 py-2 text-xs text-muted-foreground">
              {tr("مثال: على باقة ٥٠٠ د.أ يكون العربون")}{" "}<strong className="text-foreground tabular-nums">{p.fixed_deposit ? Number(p.fixed_deposit) : Math.round(500 * depositPct / 100)}{" "}{tr("د.أ")}</strong>
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              <NumField label={tr("تكلفة الكيلومتر الإضافي (د.أ)")} value={p.travel_fee_per_km} onChange={(v) => setP({ ...p, travel_fee_per_km: v })} min={0} step={0.1} />
              <NumField label={tr("الكيلومترات المجانية")} value={p.free_km} onChange={(v) => setP({ ...p, free_km: v })} min={0} />
            </div>
            <Area label={tr("ملاحظات تظهر للعميلة قبل الحجز")} v={p.booking_notes} on={(v) => setP({ ...p, booking_notes: v })} hint={tr("مثال: تسليم الصور خلال أسبوعين، الفيديو خلال شهر.")} />
          </Card>

          <Card id="sec-refund" title={tr("سياسة العربون")} open={openSections["sec-refund"] ?? false} onToggle={toggle}>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {g(tr("العربون غير قابل للاسترداد على كل حجوزات ميموريا. يصلكِ مباشرة ويثبّت الموعد، وتظهر هذه السياسة للعميلة قبل التحويل."), tr("العربون غير قابل للاسترداد على كل حجوزات ميموريا. يصلك مباشرة ويثبّت الموعد، وتظهر هذه السياسة للعميلة قبل التحويل."))}
            </p>
          </Card>

          <Card id="sec-trust" title={tr("التوثيق")} done={(vInfo?.status ?? p.verification_status) === "verified"} open={openSections["sec-trust"] ?? false} onToggle={toggle}>
            {(() => {
              const status = vInfo?.status ?? p.verification_status ?? "unverified";
              const checks = vInfo?.checks ?? [];
              const missing = checks.filter((c) => !c.ok);
              return (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {g(tr("التوثيق يعني أن فريق ميموريا راجع ملفكِ وتأكّد أن الأعمال والهوية حقيقية. الموثّقات يحصلن على شارة"), tr("التوثيق يعني أن فريق ميموريا راجع ملفك وتأكّد أن الأعمال والهوية حقيقية. الموثّقات يحصلن على شارة"))}
                    <span className="mx-1 font-medium text-foreground">{tr("✓ موثّقة")}</span>
                    {tr("على الملف وفي نتائج البحث والمقارنة، ويظهرن عند تفعيل فلتر «الموثّقات فقط».")}
                  </p>

                  {status === "verified" && (
                    <div className="rounded-sm border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
                      ✓ {g(tr("ملفكِ"), tr("ملفك"))}{" "}{tr("موثّق")}{vInfo?.verified_at ? tr("منذ {0}", [new Date(vInfo.verified_at).toLocaleDateString(locale("ar-JO"), { day: "numeric", month: "long", year: "numeric" })]) : ""}.
                    </div>
                  )}
                  {status === "pending_review" && (
                    <div className="rounded-sm border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                      {g(tr("طلبكِ قيد المراجعة. سيصلكِ إشعار عند القرار."), tr("طلبك قيد المراجعة. سيصلك إشعار عند القرار."))}
                    </div>
                  )}
                  {status === "rejected" && (
                    <div className="rounded-sm border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                      {g(tr("لم يُقبل الطلب السابق. أكملي ما ينقص ثم أعيدي الطلب (السبب في إشعاراتكِ)."), tr("لم يُقبل الطلب السابق. أكمل ما ينقص ثم أعد الطلب (السبب في إشعاراتك)."))}
                    </div>
                  )}

                  {checks.length > 0 && status !== "verified" && (
                    <ul className="space-y-1.5 text-sm">
                      {checks.map((c) => (
                        <li key={c.key} className={`flex items-center gap-2 ${c.ok ? "text-foreground" : "text-muted-foreground"}`}>
                          <span className={`grid h-5 w-5 place-items-center rounded-full text-[11px] ${c.ok ? "bg-emerald-600 text-white" : "border border-border"}`}>
                            {c.ok ? "✓" : ""}
                          </span>
                          {tx(c.label)}
                        </li>
                      ))}
                    </ul>
                  )}

                  {(status === "unverified" || status === "rejected" || !status) && (
                    <button
                      disabled={!checks.length || missing.length > 0}
                      onClick={async () => {
                        try {
                          await verifyFn();
                          toast.success(g(tr("أُرسل طلب التوثيق — سيصلكِ إشعار بالقرار"), tr("أُرسل طلب التوثيق — سيصلك إشعار بالقرار")));
                          setP({ ...p, verification_status: "pending_review" });
                          setOriginalP((o: any) => ({ ...o, verification_status: "pending_review" }));
                          loadVerification();
                        } catch (e: any) {
                          toast.error(e?.message || tr("تعذّر إرسال الطلب"));
                        }
                      }}
                      className="text-sm border border-gold/50 text-gold px-4 py-2 rounded-full hover:bg-gold/10 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {missing.length ? g(tr("أكملي {0} من الشروط لطلب التوثيق", [missing.length]), tr("أكمل {0} من الشروط لطلب التوثيق", [missing.length])) : g(tr("اطلبي التوثيق"), tr("اطلب التوثيق"))}
                    </button>
                  )}
                  {missing.length > 0 && status !== "verified" && (
                    <p className="text-xs text-muted-foreground">{tr("بعد حفظ التعديلات أعلاه تتحدّث القائمة تلقائياً.")}</p>
                  )}
                </div>
              );
            })()}
          </Card>

          <Card id="sec-notifs" title={tr("الإشعارات والجولة التعريفية")} open={openSections["sec-notifs"] ?? false} onToggle={toggle}>
            <div className="divide-y divide-border">
              {[
                { key: "booking_new", label: tr("طلب حجز جديد") },
                { key: "booking_confirmed", label: tr("تأكيد حجز") },
                { key: "booking_cancelled", label: tr("إلغاء حجز") },
                { key: "deposit_received", label: tr("استلام عربون") },
                { key: "message_new", label: tr("رسالة جديدة") },
                { key: "review_new", label: tr("تقييم جديد") },
                { key: "subscription_expiring", label: tr("اشتراك ينتهي قريباً") },
                { key: "event_reminder", label: tr("تذكير قبل المناسبة") },
                { key: "marketing", label: tr("عروض وأخبار ميموريا") },
              ].map((pref) => {
                const prefs = p.notification_preferences ?? {};
                const enabled = prefs[pref.key] !== false;
                return (
                  <label key={pref.key} className="flex items-center justify-between py-2.5 cursor-pointer">
                    <span className="text-sm">{tx(pref.label)}</span>
                    <input
                      type="checkbox"
                      checked={enabled}
                      className="h-4 w-4 accent-[var(--gold)]"
                      onChange={async () => {
                        const newPrefs = { ...prefs, [pref.key]: !enabled };
                        setP({ ...p, notification_preferences: newPrefs });
                        setOriginalP((o: any) => ({ ...o, notification_preferences: newPrefs }));
                        try {
                          await notifFn({ data: { preferences: newPrefs } });
                          toast.success(`${pref.label}: ${!enabled ? tr("مفعّل") : tr("متوقّف")}`);
                        } catch (e: any) {
                          toast.error(e?.message || tr("تعذّر تحديث التفضيلات"));
                        }
                      }}
                    />
                  </label>
                );
              })}
            </div>
            <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4 text-sm">
              <span className="text-muted-foreground">{tr("جولة العميلة التعريفية:")}</span>
              <span className="font-medium">
                {tourState.status === "active" ? tr("فعّالة") : tourState.status === "completed" ? tr("مكتملة") : tourState.status === "skipped" ? tr("متخطّاة") : tr("لم تبدأ")}
              </span>
              <button onClick={() => { startTour(); toast.success(tr("شغّلنا الجولة التعريفية")); }} className="ms-auto rounded-full border border-border px-3 py-1 text-xs hover:bg-secondary">{tr("تشغيل")}</button>
              <button onClick={() => { resetTour(); toast.success(tr("صفّرنا الجولة")); }} className="rounded-full border border-border px-3 py-1 text-xs hover:bg-secondary">{tr("تصفير")}</button>
            </div>
          </Card>
      </div><LivePhonePreview p={p} /></div></section>

      {/* شريط الحفظ يظهر فقط عند وجود تغييرات */}
      <AnimatePresence>
        {isDirty && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 34 }}
            className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom,0px)+4.5rem)] z-40 px-4 sm:bottom-6"
          >
            <div className="mx-auto flex max-w-xl items-center gap-3 rounded-full bg-charcoal py-2 ps-5 pe-2 text-ivory shadow-2xl dark:bg-card dark:text-foreground dark:ring-1 dark:ring-gold/30">
              <span className="flex-1 text-sm">{g(tr("لديكِ تغييرات غير محفوظة"), tr("لديك تغييرات غير محفوظة"))}</span>
              <button onClick={() => setP(originalP)} className="rounded-full px-3 py-2 text-sm text-ivory/70 hover:text-ivory dark:text-muted-foreground dark:hover:text-foreground">{tr("تراجع")}</button>
              <button onClick={save} disabled={saving || usernameState === "taken"} className="inline-flex items-center gap-2 rounded-full bg-gold px-5 py-2 text-sm font-medium text-charcoal disabled:opacity-60 active:scale-95 transition-transform">
                {saving && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-charcoal/30 border-t-charcoal" />}
                {saving ? tr("نحفظ…") : tr("حفظ")}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <Footer />
    </div>
  );
}

function CompletionRing({ value }: { value: number }) {
  const r = 20, c = 2 * Math.PI * r;
  return (
    <div className="relative grid h-14 w-14 place-items-center">
      <svg viewBox="0 0 48 48" className="h-14 w-14 -rotate-90">
        <circle cx="24" cy="24" r={r} fill="none" stroke="currentColor" strokeWidth="4" className="text-secondary" />
        <motion.circle
          cx="24" cy="24" r={r} fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round"
          className={value === 100 ? "text-emerald-500" : "text-gold"}
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - value / 100) }}
          transition={{ duration: 0.9, ease: "easeOut" }}
        />
      </svg>
      <span className="absolute text-xs font-bold tabular-nums">{tr("{0}٪", [value])}</span>
    </div>
  );
}

function Card({ id, title, done, open, onToggle, children }: { id: string; title: string; done?: boolean; open: boolean; onToggle: (id: string) => void; children: React.ReactNode }) {
  return (
    <div id={id} className="scroll-mt-24 rounded-2xl border border-border bg-card">
      <button type="button" onClick={() => onToggle(id)} aria-expanded={open} className="flex w-full items-center gap-3 p-6 text-start">
        <h2 className="font-serif text-xl flex-1">{tx(title)}</h2>
        <AnimatePresence>
          {done && (
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="grid h-6 w-6 place-items-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400" title={tr("مكتمل")}>
              <Check className="h-3.5 w-3.5" />
            </motion.span>
          )}
        </AnimatePresence>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="space-y-4 px-6 pb-6">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
function Field({ label, v, on, type = "text", hint, ltr }: { label: string; v: any; on: (v: string) => void; type?: string; hint?: string; ltr?: boolean }) {
  return (
    <label className="block">
      <span className="text-sm text-muted-foreground">{tx(label)}</span>
      <input type={type} dir={ltr ? "ltr" : undefined} value={v ?? ""} onChange={(e) => on(e.target.value)} className="w-full mt-1 rounded-xl border border-border bg-background px-3 py-2 focus:border-gold/60 focus:outline-none transition-colors" />
      {hint && <span className="mt-1 block text-xs text-muted-foreground">{tx(hint)}</span>}
    </label>
  );
}
function NumField({ label, value, onChange, min, max, step, placeholder }: { label: string; value: any; onChange: (v: string) => void; min?: number; max?: number; step?: number; placeholder?: string }) {
  const invalid = value !== "" && value != null && ((min !== undefined && Number(value) < min) || (max !== undefined && Number(value) > max));
  return (
    <label className="block">
      <span className="text-sm text-muted-foreground">{tx(label)}</span>
      <motion.input
        type="number"
        min={min} max={max} step={step}
        value={value ?? ""}
        placeholder={tx(placeholder)}
        onChange={(e) => onChange(e.target.value)}
        animate={invalid ? { x: [0, -4, 4, -3, 3, 0] } : { x: 0 }}
        transition={{ duration: 0.3 }}
        className={`w-full mt-1 rounded-xl border bg-background px-3 py-2 tabular-nums focus:outline-none transition-colors ${invalid ? "border-destructive" : "border-border focus:border-gold/60"}`}
      />
      {invalid && <span className="mt-1 block text-xs text-destructive">{tr("القيمة بين {0} و{1}", [min, max])}</span>}
    </label>
  );
}
function Area({ label, v, on, hint }: { label: string; v: any; on: (v: string) => void; hint?: string }) {
  return (
    <label className="block">
      <span className="text-sm text-muted-foreground">{tx(label)}</span>
      <textarea value={v ?? ""} onChange={(e) => on(e.target.value)} rows={4} className="w-full mt-1 rounded-xl border border-border bg-background px-3 py-2 leading-relaxed focus:border-gold/60 focus:outline-none transition-colors" />
      {hint && <span className="mt-1 block text-xs text-muted-foreground">{tx(hint)}</span>}
    </label>
  );
}
function ImgPicker({ label, url, onPick, aspect = "aspect-square", hint }: any) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  return (
    <div>
      <div className="text-sm mb-2">{tx(label)}</div>
      <button
        onClick={() => ref.current?.click()}
        className={`group relative w-full ${aspect} bg-secondary rounded-xl overflow-hidden border border-border grid place-items-center hover:border-gold/50 transition-colors`}
      >
        {url ? (
          <img src={url} onLoad={() => setLoaded(true)} className={`w-full h-full object-cover transition-all duration-700 ${loaded ? "blur-0" : "blur-md"}`} alt="" />
        ) : (
          <Upload className="h-6 w-6 text-muted-foreground" />
        )}
        <span className="absolute inset-0 grid place-items-center bg-black/40 text-sm text-white opacity-0 transition-opacity group-hover:opacity-100">
          {busy ? tr("جاري الرفع…") : url ? tr("تغيير الصورة") : tr("اختيار صورة")}
        </span>
        {busy && <span className="absolute inset-0 grid place-items-center bg-black/40"><span className="h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white" /></span>}
      </button>
      {hint && <p className="mt-1.5 text-xs text-gold">{tx(hint)}</p>}
      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          setBusy(true);
          setLoaded(false);
          try { await onPick(f); } finally { setBusy(false); e.target.value = ""; }
        }}
      />
    </div>
  );
}
