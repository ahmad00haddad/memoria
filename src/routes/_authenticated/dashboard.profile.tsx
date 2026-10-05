import { motion, AnimatePresence } from "framer-motion";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { PageLoader } from "@/components/ui/loading";
import { useEffect, useRef, useState } from "react";
import { Header } from "@/components/site/Header";
import { BackToDashboard } from "@/components/site/BackToDashboard";
import { Footer } from "@/components/site/Footer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, X, Eye, Check, ChevronDown } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { updateRefundPolicy } from "@/lib/cancellation.functions";
import { uploadProfilePhoto, uploadPortfolioPhoto, deletePortfolioPhoto, MAX_PORTFOLIO_PHOTOS } from "@/lib/upload";
import { requestVerification, updateNotificationPreferences } from "@/lib/trust.functions";
import { startTour, useTourState, resetTour } from "@/components/ClientTour";

// Empty input means "use the default"; 0 is a real value and must be kept.
const numOr = (v: unknown, def: number) => (v === "" || v == null ? def : Number(v));

export const Route = createFileRoute("/_authenticated/dashboard/profile")({ component: ProfilePage });


function LivePhonePreview({ p }: { p: any }) {
  return (
    <div className="hidden lg:block sticky top-24">
      <div className="text-xs font-bold text-muted-foreground mb-3 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        المعاينة الحية (كما تراها العروس)
      </div>
      <div className="relative w-[320px] h-[650px] bg-background border-[10px] border-charcoal rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col">
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-charcoal rounded-b-2xl z-50"></div>
        
        {/* Cover */}
        <div className="h-40 bg-secondary/50 relative overflow-hidden shrink-0">
          {p.cover_url ? (
            <img src={p.cover_url} className="w-full h-full object-cover" alt="Cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground/30 font-bold text-2xl">MEMORIA</div>
          )}
        </div>
        
        {/* Avatar */}
        <div className="absolute top-28 right-6 w-20 h-20 bg-background rounded-full p-1 shadow-md z-10">
          {p.avatar_url ? (
             <img src={p.avatar_url} className="w-full h-full rounded-full object-cover" alt="Avatar" />
          ) : (
             <div className="w-full h-full rounded-full bg-secondary flex items-center justify-center">📷</div>
          )}
        </div>

        {/* Info */}
        <div className="px-5 pt-12 pb-4 flex-1 overflow-y-auto">
          <h2 className="font-serif text-xl font-bold">{p.display_name || "اسم المصورة"}</h2>
          <p className="text-[10px] text-muted-foreground mb-3">{p.city || "المدينة"} • 100% نسبة الرد</p>
          <div className="text-xs mb-4 p-3 bg-secondary/30 rounded-lg text-foreground/80 leading-relaxed border border-border/50">
            {p.bio || "اكتبي نبذة تعريفية جذابة هنا لتظهر للعرائس..."}
          </div>
          
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="bg-emerald-50 text-emerald-700 text-center py-2 rounded-md text-[10px] font-bold border border-emerald-100">
              واتساب
            </div>
            <div className="bg-charcoal text-white text-center py-2 rounded-md text-[10px] font-bold">
              طلب حجز
            </div>
          </div>
          
          <h3 className="font-bold text-xs mb-2">معرض الصور</h3>
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
  const nav = useNavigate();
  const updRefundFn = useServerFn(updateRefundPolicy);
  const verifyFn = useServerFn(requestVerification);
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
        e.returnValue = "لديك تعديلات غير محفوظة. هل أنت متأكد من المغادرة؟";
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
      toast.success("تم رفع الصورة وحفظها");
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
      toast.success("تم رفع الغلاف وحفظه");
    } else {
      toast.error(res.userMessage);
    }
  };

  const onPortfolio = async (files: FileList) => {
    const room = MAX_PORTFOLIO_PHOTOS - (p.portfolio_urls ?? []).length;
    if (room <= 0) return toast.error(`وصلتِ للحد الأقصى (${MAX_PORTFOLIO_PHOTOS} صورة). احذفي صورة لإضافة أخرى.`);
    const picked = Array.from(files);
    if (picked.length > room) toast(`سيتم رفع ${room} صور فقط — الحد الأقصى ${MAX_PORTFOLIO_PHOTOS} صورة`);
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
        toast.success(urls.length === 1 ? "أُضيفت الصورة" : `أُضيفت ${urls.length} صور`);
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
    toast("أُزيلت الصورة", { action: { label: "تراجع", onClick: () => { undone = true; savePortfolio(before); } } });
    // بعد انتهاء مهلة التراجع نحذف الملف فعلياً من التخزين
    setTimeout(() => { if (!undone) deletePortfolioPhoto(before[i]).catch(() => {}); }, 8000);
  };

  const save = async () => {
    if (usernameState === "taken") return toast.error("اسم المستخدم محجوز — اختاري اسماً آخر");
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
        policy: (p.deposit_refund_policy as any) || "full",
        percent: p.deposit_refund_policy === "partial" ? Number(p.deposit_refund_percent || 0) : null,
      }});
    } catch (e: any) {
      setSaving(false);
      return toast.error(e?.message || "تعذّر حفظ سياسة الاسترداد");
    }
    setSaving(false);
    if (error || pErr) return toast.error((error ?? pErr)!.message);
    setOriginalP(p);
    toast.success(p.is_published && !originalP?.is_published ? "حُفظ ملفك وأصبح منشوراً للعرائس" : "حُفظت التغييرات");
  };

  if (loading) return <PageLoader />;

  const isDirty = !!originalP && JSON.stringify(originalP) !== JSON.stringify(p);
  const portfolioCount = (p.portfolio_urls ?? []).length;
  const bioWords = String(p.bio ?? "").trim().split(/\s+/).filter(Boolean).length;
  const depositPct = Math.max(0, Math.min(100, numOr(p.deposit_percent, 25)));
  const checklist = [
    { key: "photos", label: "صورة شخصية وغلاف", done: !!p.avatar_url && !!p.cover_url, section: "sec-photos" },
    { key: "portfolio", label: "٥ صور أعمال على الأقل", done: portfolioCount >= 5, section: "sec-photos" },
    { key: "basics", label: "الاسم واسم المستخدم والمدينة", done: !!p.display_name && !!p.username && !!p.city, section: "sec-basics" },
    { key: "bio", label: "نبذة تعريفية", done: bioWords >= 15, section: "sec-basics" },
    { key: "payment", label: "طريقة استلام العربون", done: !!(p.cliq_alias || p.bank_info), section: "sec-contact" },
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
          <h1 className="font-serif text-4xl">ملفي</h1>
          {p?.username && (
            <Link
              to="/photographers/$username"
              params={{ username: p.username }}
              target="_blank"
              className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm hover:border-gold/50 hover:text-gold transition-colors"
            >
              <Eye className="h-4 w-4" />
              كما تراه العرائس
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
                <div className="font-medium">{pct === 100 ? "ملفك مكتمل" : `ملفك مكتمل ${pct}٪`}</div>
                <div className="text-xs text-muted-foreground">{pct === 100 ? "جاهز ليظهر بأفضل صورة في البحث." : "الملفات المكتملة تظهر أعلى نتائج البحث."}</div>
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
              {p.is_published ? "منشور للعرائس" : "غير منشور"}
            </button>
          </div>
          {pct < 100 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {checklist.filter((c) => !c.done).map((c) => (
                <button key={c.key} onClick={() => jump(c.section)} className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-border px-3 py-1.5 text-xs text-muted-foreground hover:border-gold/50 hover:text-foreground transition-colors">
                  <span className="h-1.5 w-1.5 rounded-full bg-gold" /> {c.label}
                </button>
              ))}
            </div>
          )}
          {!p.is_published && pct === 100 && (
            <p className="mt-4 text-sm text-gold">كل شيء جاهز — فعّلي النشر واحفظي ليظهر ملفك في البحث.</p>
          )}
        </div>

        <Card id="sec-photos" title="الصور" done={!!p.avatar_url && !!p.cover_url && portfolioCount >= 5} open={openSections["sec-photos"] ?? true} onToggle={toggle}>
            <div className="grid sm:grid-cols-2 gap-4">
              <ImgPicker label="الصورة الشخصية" url={p.avatar_url} onPick={onAvatar} />
              <ImgPicker label="صورة الغلاف" url={p.cover_url} onPick={onCover} aspect="aspect-[16/9]" hint={!p.cover_url ? "الغلاف أول ما تراه العروس في ملفك" : undefined} />
            </div>

            <div className="mt-6">
              <div className="mb-1 flex items-baseline justify-between">
                <span className="text-sm">معرض الأعمال</span>
                <span className={`text-xs tabular-nums ${portfolioCount >= 5 ? "text-muted-foreground" : "text-gold"}`}>{portfolioCount}/{MAX_PORTFOLIO_PHOTOS} {portfolioCount < 5 ? `· أضيفي ${5 - portfolioCount} لتظهري في البحث` : "صورة"}</span>
              </div>
              <p className="mb-3 text-xs text-muted-foreground">الصورة الأولى هي ما تراه العروس في نتائج البحث.</p>
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
                      <img src={u} className="w-full h-full object-cover" alt="" loading="lazy" />
                      {i === 0 && <span className="absolute bottom-1.5 start-1.5 rounded-full bg-black/60 px-2 py-0.5 text-[10px] text-white">الغلاف في البحث</span>}
                      <button onClick={() => removePortfolio(i)} aria-label="إزالة الصورة" className="absolute top-1.5 start-1.5 grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white opacity-100 sm:opacity-0 sm:group-hover:opacity-100 hover:bg-red-500 transition"><X className="h-3.5 w-3.5" /></button>
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
                  <span className="text-[11px] text-center px-2">{portfolioUploading ? "جاري الرفع…" : dragOver ? "أفلتي الصور هنا" : "إضافة صور"}</span>
                </div>}
                <input ref={portfolioRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => e.target.files && onPortfolio(e.target.files)} />
              </div>
            </div>
          </Card>

          <Card id="sec-basics" title="المعلومات الأساسية" done={!!p.display_name && !!p.username && !!p.city && bioWords >= 15} open={openSections["sec-basics"] ?? true} onToggle={toggle}>
            <Field label="الاسم المعروض" v={p.display_name} on={(v) => setP({ ...p, display_name: v })} />
            <label className="block">
              <span className="text-sm text-muted-foreground">اسم المستخدم (يظهر في رابط ملفك)</span>
              <div className="relative mt-1">
                <input
                  dir="ltr"
                  value={p.username ?? ""}
                  onChange={(e) => setP({ ...p, username: e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, "") })}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 pe-28"
                />
                <span className={`absolute end-3 top-1/2 -translate-y-1/2 text-xs ${usernameState === "taken" ? "text-destructive" : usernameState === "free" ? "text-emerald-600" : "text-muted-foreground"}`}>
                  {usernameState === "checking" ? "نتحقّق…" : usernameState === "taken" ? "محجوز" : usernameState === "free" ? "متاح ✓" : ""}
                </span>
              </div>
              {p.username && <span className="mt-1 block text-xs text-muted-foreground" dir="ltr">{typeof window !== "undefined" ? window.location.host : ""}/photographers/{p.username}</span>}
            </label>
            <Field label="شعار قصير — مثال: PHOTOGRAPHY" v={p.tagline} on={(v) => setP({ ...p, tagline: v })} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="المدينة" v={p.city} on={(v) => setP({ ...p, city: v })} />
              <Field label="الموقع الأساسي (لحساب رسوم التنقّل)" v={p.base_location} on={(v) => setP({ ...p, base_location: v })} />
            </div>
            <Area
              label="نبذة قصيرة"
              v={p.bio}
              on={(v) => setP({ ...p, bio: v })}
              hint={bioWords === 0 ? "النبذات بين ٤٠ و٨٠ كلمة تحصل على حجوزات أكثر." : bioWords < 40 ? `${bioWords} كلمة — أضيفي قليلاً عن أسلوبك وما يميّزك.` : bioWords > 120 ? `${bioWords} كلمة — النبذة الأقصر تُقرأ أكثر.` : `${bioWords} كلمة — طول مناسب.`}
            />
            <Area label="المعدّات" v={p.equipment} on={(v) => setP({ ...p, equipment: v })} />
          </Card>

          <Card id="sec-contact" title="التواصل والدفع" done={!!(p.cliq_alias || p.bank_info) && !!(p.whatsapp || p.phone)} open={openSections["sec-contact"] ?? true} onToggle={toggle}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="رقم الهاتف" v={p.phone} on={(v) => setP({ ...p, phone: v })} hint="لا يظهر للعموم" ltr />
              <Field label="واتساب" v={p.whatsapp} on={(v) => setP({ ...p, whatsapp: v })} hint="تصلك عليه طلبات الحجز — لا يظهر للعموم" ltr />
            </div>
            <Field label="إنستغرام (اسم المستخدم)" v={p.instagram} on={(v) => setP({ ...p, instagram: v })} ltr />
            <Field label="CliQ Alias لاستلام العربون" v={p.cliq_alias} on={(v) => setP({ ...p, cliq_alias: v })} hint={!p.cliq_alias ? "بدون CliQ أو حساب بنكي لن تعرف العروس أين تحوّل العربون." : "يظهر للعروس فقط بعد طلب الحجز."} ltr />
            <Area label="معلومات الحساب البنكي (بنك / رقم حساب / IBAN)" v={p.bank_info} on={(v) => setP({ ...p, bank_info: v })} />
          </Card>

          <Card id="sec-booking" title="إعدادات الحجز" open={openSections["sec-booking"] ?? false} onToggle={toggle}>
            <div className="grid sm:grid-cols-2 gap-4">
              <NumField label="نسبة العربون (%)" value={p.deposit_percent} onChange={(v) => setP({ ...p, deposit_percent: v })} min={0} max={100} />
              <NumField label="أو عربون ثابت (د.أ)" value={p.fixed_deposit} onChange={(v) => setP({ ...p, fixed_deposit: v })} min={0} placeholder="اختياري — يُلغي النسبة" />
            </div>
            <p className="rounded-xl bg-secondary/50 px-3 py-2 text-xs text-muted-foreground">
              مثال: على باقة ٥٠٠ د.أ يكون العربون <strong className="text-foreground tabular-nums">{p.fixed_deposit ? Number(p.fixed_deposit) : Math.round(500 * depositPct / 100)} د.أ</strong>
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              <NumField label="تكلفة الكيلومتر الإضافي (د.أ)" value={p.travel_fee_per_km} onChange={(v) => setP({ ...p, travel_fee_per_km: v })} min={0} step={0.1} />
              <NumField label="الكيلومترات المجانية" value={p.free_km} onChange={(v) => setP({ ...p, free_km: v })} min={0} />
            </div>
            <Area label="ملاحظات تظهر للعميلة قبل الحجز" v={p.booking_notes} on={(v) => setP({ ...p, booking_notes: v })} hint="مثال: تسليم الصور خلال أسبوعين، الفيديو خلال شهر." />
          </Card>

          <Card id="sec-refund" title="سياسة استرداد العربون" open={openSections["sec-refund"] ?? false} onToggle={toggle}>
            <p className="text-xs text-muted-foreground -mt-2">
              تُطبَّق تلقائياً عند إلغاء حجز مؤكَّد العربون فقط.
            </p>
            <div className="grid sm:grid-cols-3 gap-2">
              {[
                { v: "full", l: "استرداد كامل" },
                { v: "partial", l: "استرداد جزئي" },
                { v: "none", l: "لا استرداد" },
              ].map((o) => (
                <label key={o.v} className={`flex items-center gap-2 border rounded-xl px-3 py-2 text-sm cursor-pointer transition-colors ${ (p.deposit_refund_policy || "full") === o.v ? "border-gold bg-gold/5" : "border-border hover:border-gold/30"}`}>
                  <input
                    type="radio" name="refundPolicy" value={o.v}
                    checked={(p.deposit_refund_policy || "full") === o.v}
                    onChange={() => setP({ ...p, deposit_refund_policy: o.v })}
                    className="accent-[var(--gold)]"
                  />
                  {o.l}
                </label>
              ))}
            </div>
            {(p.deposit_refund_policy === "partial") && (
              <NumField label="نسبة الاسترداد %" value={p.deposit_refund_percent} onChange={(v) => setP({ ...p, deposit_refund_percent: v })} min={0} max={100} />
            )}
          </Card>

          <Card id="sec-trust" title="التوثيق" done={p.verification_status === "verified"} open={openSections["sec-trust"] ?? false} onToggle={toggle}>
            <div className="flex items-center gap-3">
              {p.verification_status === "verified" && (
                <span className="inline-flex items-center gap-1 text-emerald-600 text-sm font-medium">✓ موثّقة</span>
              )}
              {p.verification_status === "pending_review" && (
                <span className="inline-flex items-center gap-1 text-amber-600 text-sm font-medium">قيد المراجعة</span>
              )}
              {p.verification_status === "rejected" && (
                <span className="inline-flex items-center gap-1 text-red-500 text-sm font-medium">رُفض الطلب</span>
              )}
              {(!p.verification_status || p.verification_status === "unverified") && (
                <>
                  <span className="text-sm text-muted-foreground">غير موثّقة</span>
                  <button
                    onClick={async () => {
                      try {
                        await verifyFn();
                        toast.success("أُرسل طلب التوثيق");
                        setP({ ...p, verification_status: "pending_review" });
                        setOriginalP((o: any) => ({ ...o, verification_status: "pending_review" }));
                      } catch (e: any) {
                        toast.error(e?.message || "تعذّر إرسال الطلب");
                      }
                    }}
                    className="text-xs border border-gold/40 text-gold px-3 py-1.5 rounded-full hover:bg-gold/10"
                  >
                    اطلبي التوثيق
                  </button>
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground">المصوّرات الموثّقات يحصلن على شارة ✓ تزيد ثقة العرائس.</p>
          </Card>

          <Card id="sec-notifs" title="الإشعارات والجولة التعريفية" open={openSections["sec-notifs"] ?? false} onToggle={toggle}>
            <div className="divide-y divide-border">
              {[
                { key: "booking_new", label: "طلب حجز جديد" },
                { key: "booking_confirmed", label: "تأكيد حجز" },
                { key: "booking_cancelled", label: "إلغاء حجز" },
                { key: "deposit_received", label: "استلام عربون" },
                { key: "message_new", label: "رسالة جديدة" },
                { key: "review_new", label: "تقييم جديد" },
                { key: "subscription_expiring", label: "اشتراك ينتهي قريباً" },
                { key: "event_reminder", label: "تذكير قبل المناسبة" },
                { key: "marketing", label: "عروض وأخبار ميموريا" },
              ].map((pref) => {
                const prefs = p.notification_preferences ?? {};
                const enabled = prefs[pref.key] !== false;
                return (
                  <label key={pref.key} className="flex items-center justify-between py-2.5 cursor-pointer">
                    <span className="text-sm">{pref.label}</span>
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
                          toast.success(`${pref.label}: ${!enabled ? "مفعّل" : "متوقّف"}`);
                        } catch (e: any) {
                          toast.error(e?.message || "تعذّر تحديث التفضيلات");
                        }
                      }}
                    />
                  </label>
                );
              })}
            </div>
            <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4 text-sm">
              <span className="text-muted-foreground">جولة العميلة التعريفية:</span>
              <span className="font-medium">
                {tourState.status === "active" ? "فعّالة" : tourState.status === "completed" ? "مكتملة" : tourState.status === "skipped" ? "متخطّاة" : "لم تبدأ"}
              </span>
              <button onClick={() => { startTour(); toast.success("شغّلنا الجولة التعريفية"); }} className="ms-auto rounded-full border border-border px-3 py-1 text-xs hover:bg-secondary">تشغيل</button>
              <button onClick={() => { resetTour(); toast.success("صفّرنا الجولة"); }} className="rounded-full border border-border px-3 py-1 text-xs hover:bg-secondary">تصفير</button>
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
              <span className="flex-1 text-sm">لديكِ تغييرات غير محفوظة</span>
              <button onClick={() => setP(originalP)} className="rounded-full px-3 py-2 text-sm text-ivory/70 hover:text-ivory dark:text-muted-foreground dark:hover:text-foreground">تراجع</button>
              <button onClick={save} disabled={saving || usernameState === "taken"} className="inline-flex items-center gap-2 rounded-full bg-gold px-5 py-2 text-sm font-medium text-charcoal disabled:opacity-60 active:scale-95 transition-transform">
                {saving && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-charcoal/30 border-t-charcoal" />}
                {saving ? "نحفظ…" : "حفظ"}
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
      <span className="absolute text-xs font-bold tabular-nums">{value}٪</span>
    </div>
  );
}

function Card({ id, title, done, open, onToggle, children }: { id: string; title: string; done?: boolean; open: boolean; onToggle: (id: string) => void; children: React.ReactNode }) {
  return (
    <div id={id} className="scroll-mt-24 rounded-2xl border border-border bg-card">
      <button type="button" onClick={() => onToggle(id)} aria-expanded={open} className="flex w-full items-center gap-3 p-6 text-start">
        <h2 className="font-serif text-xl flex-1">{title}</h2>
        <AnimatePresence>
          {done && (
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="grid h-6 w-6 place-items-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400" title="مكتمل">
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
      <span className="text-sm text-muted-foreground">{label}</span>
      <input type={type} dir={ltr ? "ltr" : undefined} value={v ?? ""} onChange={(e) => on(e.target.value)} className="w-full mt-1 rounded-xl border border-border bg-background px-3 py-2 focus:border-gold/60 focus:outline-none transition-colors" />
      {hint && <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}
function NumField({ label, value, onChange, min, max, step, placeholder }: { label: string; value: any; onChange: (v: string) => void; min?: number; max?: number; step?: number; placeholder?: string }) {
  const invalid = value !== "" && value != null && ((min !== undefined && Number(value) < min) || (max !== undefined && Number(value) > max));
  return (
    <label className="block">
      <span className="text-sm text-muted-foreground">{label}</span>
      <motion.input
        type="number"
        min={min} max={max} step={step}
        value={value ?? ""}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        animate={invalid ? { x: [0, -4, 4, -3, 3, 0] } : { x: 0 }}
        transition={{ duration: 0.3 }}
        className={`w-full mt-1 rounded-xl border bg-background px-3 py-2 tabular-nums focus:outline-none transition-colors ${invalid ? "border-destructive" : "border-border focus:border-gold/60"}`}
      />
      {invalid && <span className="mt-1 block text-xs text-destructive">القيمة بين {min} و{max}</span>}
    </label>
  );
}
function Area({ label, v, on, hint }: { label: string; v: any; on: (v: string) => void; hint?: string }) {
  return (
    <label className="block">
      <span className="text-sm text-muted-foreground">{label}</span>
      <textarea value={v ?? ""} onChange={(e) => on(e.target.value)} rows={4} className="w-full mt-1 rounded-xl border border-border bg-background px-3 py-2 leading-relaxed focus:border-gold/60 focus:outline-none transition-colors" />
      {hint && <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}
function ImgPicker({ label, url, onPick, aspect = "aspect-square", hint }: any) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  return (
    <div>
      <div className="text-sm mb-2">{label}</div>
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
          {busy ? "جاري الرفع…" : url ? "تغيير الصورة" : "اختيار صورة"}
        </span>
        {busy && <span className="absolute inset-0 grid place-items-center bg-black/40"><span className="h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white" /></span>}
      </button>
      {hint && <p className="mt-1.5 text-xs text-gold">{hint}</p>}
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
