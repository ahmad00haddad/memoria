import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import {
  Smartphone, Download, Share2, Plus, CheckCircle2, Wifi, Zap, Bell,
  Apple, Chrome, MonitorSmartphone, ChevronRight, Store, Home,
} from "lucide-react";

export const Route = createFileRoute("/app")({
  head: () => ({
    meta: [
      { title: "حمّل تطبيق EliteCapture على هاتفك | EliteCapture" },
      {
        name: "description",
        content: "ثبّتي EliteCapture كتطبيق على هاتفك (iPhone أو Android) أو على سطح المكتب — يعمل دون متجر، بسرعة، ومع أيقونة على الشاشة الرئيسية.",
      },
    ],
  }),
  component: AppDownloadPage,
});

type Platform = "ios" | "android" | "desktop" | "other";

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent || "";
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && "ontouchend" in document);
  if (isIOS) return "ios";
  if (/Android/.test(ua)) return "android";
  if (/Windows|Macintosh|Linux/.test(ua)) return "desktop";
  return "other";
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)")?.matches ||
    (window.navigator as any)?.standalone === true
  );
}

const platformHeadline: Record<Platform, string> = {
  ios: "ثبّتيه على iPhone في 3 خطوات",
  android: "ثبّتيه على Android بنقرة واحدة",
  desktop: "ثبّته على سطح المكتب",
  other: "ثبّت تطبيق EliteCapture",
};

const iosSteps = [
  { icon: Share2, label: "اضغطي على زر المشاركة", desc: "زر السهم للأعلى في شريط Safari السفلي" },
  { icon: Plus, label: "اختاري «إضافة إلى الشاشة الرئيسية»", desc: "مرّري للأسفل في قائمة المشاركة حتى تجديه" },
  { icon: Home, label: "اضغطي «إضافة» وانتهى", desc: "ستظهر أيقونة EliteCapture على شاشتك الرئيسية" },
];

const desktopSteps = [
  { icon: Chrome, label: "افتحي الصفحة في Chrome أو Edge", desc: "تأكّدي من استخدام أحد هذين المتصفحين" },
  { icon: MonitorSmartphone, label: "انقري على أيقونة التثبيت في شريط العنوان", desc: "ستجدين أيقونة صغيرة على يمين شريط العنوان" },
  { icon: CheckCircle2, label: "اضغطي «تثبيت» وانتهى", desc: "سيُفتح التطبيق في نافذة مستقلة كبرنامج كامل" },
];

function AppDownloadPage() {
  const [platform, setPlatform] = useState<Platform>("other");
  const [installed, setInstalled] = useState(false);
  const [canInstall, setCanInstall] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setPlatform(detectPlatform());
    setInstalled(isStandalone());
    const checkInstallable = () => setCanInstall(!!(window as any).__deferredInstallPrompt);
    checkInstallable();
    window.addEventListener("pwa-installable", checkInstallable);
    return () => window.removeEventListener("pwa-installable", checkInstallable);
  }, []);

  const triggerInstall = async () => {
    if (typeof window === "undefined") return;
    const prompt = (window as any).__deferredInstallPrompt;
    if (!prompt) return;
    setBusy(true);
    try {
      await prompt.prompt();
      const { outcome } = await prompt.userChoice;
      if (outcome === "accepted") setInstalled(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col" dir="rtl">
      <Header />

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-12 space-y-10">

        {/* ── Celebration banner ── */}
        <AnimatePresence>
          {installed && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center justify-center min-h-[50vh] text-center gap-6 py-16"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
                className="text-7xl"
              >
                🎉
              </motion.div>
              <h2 className="font-serif text-3xl">التطبيق جاهز!</h2>
              <p className="text-muted-foreground">
                يمكنك الآن فتح EliteCapture مباشرة من شاشتك الرئيسية
              </p>
              <Link
                to="/"
                className="bg-charcoal text-ivory px-8 py-3 rounded-sm font-medium hover:opacity-90 transition-opacity"
              >
                ابدئي الآن
              </Link>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Hero ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center space-y-3"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gold/10 mb-2">
            <Smartphone className="h-8 w-8 text-gold" />
          </div>
          <h1 className="font-serif text-3xl md:text-4xl">
            {platformHeadline[platform]}
          </h1>
          <p className="text-muted-foreground text-sm max-w-sm mx-auto">
            بدون متجر · يعمل بدون إنترنت · سريع كتطبيق أصلي
          </p>
        </motion.div>

        {/* ── Features strip ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="grid grid-cols-3 gap-3 text-center text-xs"
        >
          {[
            { icon: Wifi, label: "يعمل أوفلاين" },
            { icon: Zap, label: "سريع جداً" },
            { icon: Bell, label: "إشعارات فورية" },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="border border-border rounded-sm py-3 px-2 flex flex-col items-center gap-1.5">
              <Icon className="h-4 w-4 text-gold" />
              <span className="text-muted-foreground">{label}</span>
            </div>
          ))}
        </motion.div>

        {/* ── iOS steps ── */}
        {(platform === "ios" || platform === "other") && (
          <section className="space-y-4">
            <h2 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
              <Apple className="h-4 w-4" />
              {platform === "ios" ? "خطوات التثبيت على iPhone" : "التثبيت على iPhone"}
            </h2>
            {iosSteps.map((step, index) => (
              <motion.div
                key={step.label}
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="flex items-start gap-4 border border-border rounded-sm p-4"
              >
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-gold/10 text-gold flex items-center justify-center text-sm font-bold">
                  {index + 1}
                </span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <step.icon className="h-4 w-4 text-gold" />
                    <span className="font-medium text-sm">{step.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{step.desc}</p>
                </div>
                {index < iosSteps.length - 1 && (
                  <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 self-center" />
                )}
              </motion.div>
            ))}
          </section>
        )}

        {/* ── Android install button ── */}
        {platform === "android" && (
          <section className="space-y-4">
            <h2 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
              <Store className="h-4 w-4" />
              تثبيت التطبيق على Android
            </h2>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="border border-border rounded-sm p-6 flex flex-col items-center gap-4 text-center"
            >
              <div className="w-14 h-14 rounded-full bg-gold/10 flex items-center justify-center">
                <Download className="h-6 w-6 text-gold" />
              </div>
              <div>
                <p className="font-medium mb-1">جاهز للتثبيت</p>
                <p className="text-xs text-muted-foreground">سيُضاف التطبيق إلى شاشتك الرئيسية فوراً</p>
              </div>
              {busy && canInstall && (
                <div className="w-full h-0.5 bg-border rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 1.5 }}
                    className="h-full bg-gold origin-start rounded-full"
                  />
                </div>
              )}
              {canInstall ? (
                <button
                  onClick={triggerInstall}
                  disabled={busy}
                  className="w-full bg-gold text-background font-medium py-3 rounded-sm disabled:opacity-60 transition-opacity"
                >
                  {busy ? "جاري التثبيت…" : "ثبّت التطبيق"}
                </button>
              ) : (
                <p className="text-xs text-muted-foreground border border-dashed border-border rounded-sm px-4 py-3 w-full">
                  افتحي الصفحة في Chrome ثم اختاري «إضافة إلى الشاشة الرئيسية» من القائمة ⋮
                </p>
              )}
            </motion.div>
          </section>
        )}

        {/* ── Desktop steps ── */}
        {platform === "desktop" && (
          <section className="space-y-4">
            <h2 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
              <MonitorSmartphone className="h-4 w-4" />
              تثبيت التطبيق على الكمبيوتر
            </h2>
            {desktopSteps.map((step, index) => (
              <motion.div
                key={step.label}
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="flex items-start gap-4 border border-border rounded-sm p-4"
              >
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-gold/10 text-gold flex items-center justify-center text-sm font-bold">
                  {index + 1}
                </span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <step.icon className="h-4 w-4 text-gold" />
                    <span className="font-medium text-sm">{step.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{step.desc}</p>
                </div>
              </motion.div>
            ))}
            {canInstall && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                {busy && (
                  <div className="w-full h-0.5 bg-border rounded-full overflow-hidden mb-2">
                    <motion.div
                      initial={{ width: "0%" }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 1.5 }}
                      className="h-full bg-gold origin-start rounded-full"
                    />
                  </div>
                )}
                <button
                  onClick={triggerInstall}
                  disabled={busy}
                  className="w-full bg-gold text-background font-medium py-3 rounded-sm disabled:opacity-60 transition-opacity"
                >
                  {busy ? "جاري التثبيت…" : "ثبّت التطبيق الآن"}
                </button>
              </motion.div>
            )}
          </section>
        )}

        {/* ── Already installed notice ── */}
        {!installed && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center text-xs text-muted-foreground"
          >
            إذا كنتِ قد ثبّتتِ التطبيق بالفعل،{" "}
            <Link to="/" className="underline underline-offset-2">
              افتحيه من هنا
            </Link>
          </motion.p>
        )}
      </main>

      <Footer />
    </div>
  );
}
