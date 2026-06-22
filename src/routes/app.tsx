import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import {
  Smartphone, Download, Share, Plus, CheckCircle2, Wifi, Zap, Bell,
  Apple, Chrome, MonitorSmartphone, ChevronRight, Store,
} from "lucide-react";

export const Route = createFileRoute("/app")({
  head: () => ({
    meta: [
      { title: "حمّل تطبيق EliteCapture على هاتفك | EliteCapture" },
      {
        name: "description",
        content:
          "ثبّتي EliteCapture كتطبيق على هاتفك (iPhone أو Android) أو على سطح المكتب — يعمل دون متجر، بسرعة، ومع أيقونة على الشاشة الرئيسية.",
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
    // iOS Safari
    (window.navigator as any)?.standalone === true
  );
}

function AppDownloadPage() {
  const [platform, setPlatform] = useState<Platform>("other");
  const [installed, setInstalled] = useState(false);
  const [canInstall, setCanInstall] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setPlatform(detectPlatform());
    setInstalled(isStandalone());
    setCanInstall(!!(window as any).__deferredInstallPrompt);

    const onInstallable = () => setCanInstall(true);
    const onInstalled = () => {
      setInstalled(true);
      setCanInstall(false);
    };
    window.addEventListener("pwa-installable", onInstallable);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("pwa-installable", onInstallable);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const handleInstall = async () => {
    const deferred = (window as any).__deferredInstallPrompt;
    if (!deferred) return;
    setBusy(true);
    try {
      deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice?.outcome === "accepted") setInstalled(true);
      (window as any).__deferredInstallPrompt = null;
      setCanInstall(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Header />

      <section className="container-editorial py-12">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-1.5 rounded-sm border border-border bg-card px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-secondary hover:text-gold"
        >
          <ChevronRight className="h-4 w-4" /> العودة للرئيسية
        </Link>

        <div className="max-w-2xl">
          <div className="text-xs uppercase tracking-[0.3em] text-gold mb-2">تطبيق الهاتف</div>
          <h1 className="font-serif text-4xl mb-3 flex items-center gap-3">
            <Smartphone className="h-8 w-8 text-gold" />
            حمّلي EliteCapture على هاتفك
          </h1>
          <p className="text-muted-foreground leading-relaxed">
            EliteCapture يعمل كتطبيق كامل على هاتفك — بأيقونة على الشاشة الرئيسية، وفتحٍ سريع،
            وعملٍ حتى مع ضعف الاتصال. لا حاجة لأي متجر؛ التثبيت يتم بنقرات بسيطة.
          </p>
        </div>

        {installed ? (
          <div className="mt-8 max-w-2xl rounded-sm border border-emerald-200 bg-emerald-50 p-6 dark:border-emerald-900 dark:bg-emerald-950/40">
            <div className="flex items-center gap-3 text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="h-6 w-6" />
              <div>
                <div className="font-medium">أنتِ تستخدمين التطبيق المثبّت بالفعل 🎉</div>
                <div className="text-sm opacity-80">يمكنك فتح EliteCapture من أيقونته على الشاشة الرئيسية في أي وقت.</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            {/* البطاقة الأساسية حسب المنصّة */}
            <div className="lg:col-span-2 rounded-sm border border-border bg-card p-6 shadow-soft">
              <InstallInstructions
                platform={platform}
                canInstall={canInstall}
                busy={busy}
                onInstall={handleInstall}
              />
            </div>

            {/* المزايا */}
            <div className="rounded-sm border border-border bg-card p-6 shadow-soft">
              <h3 className="font-serif text-xl mb-4">لماذا التطبيق؟</h3>
              <ul className="space-y-3 text-sm">
                <Benefit icon={<Zap className="h-4 w-4 text-gold" />} text="فتحٌ أسرع ووصول بنقرة من الشاشة الرئيسية" />
                <Benefit icon={<Wifi className="h-4 w-4 text-gold" />} text="يعمل حتى مع ضعف الاتصال (صفحة بلا إنترنت)" />
                <Benefit icon={<Smartphone className="h-4 w-4 text-gold" />} text="تجربة بملء الشاشة بلا شريط المتصفّح" />
                <Benefit icon={<Bell className="h-4 w-4 text-gold" />} text="جاهز للإشعارات مستقبلاً" />
              </ul>
            </div>
          </div>
        )}

        {/* قسم المتاجر الرسمية */}
        <div className="mt-10 max-w-3xl rounded-sm border border-border bg-secondary/20 p-6">
          <div className="flex items-start gap-3">
            <Store className="h-6 w-6 shrink-0 text-muted-foreground" />
            <div>
              <h3 className="font-serif text-lg mb-1">هل سيكون على Google Play و App Store؟</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                التثبيت أعلاه لا يحتاج موافقة أي متجر. للنشر الرسمي لاحقاً: عبر
                <strong> Google Play</strong> (تغليف TWA من PWABuilder) و<strong> App Store</strong>
                (تغليف عبر Capacitor) — ويتطلّب كلٌّ منهما حساب مطوّر ومراجعة المتجر.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function InstallInstructions({
  platform,
  canInstall,
  busy,
  onInstall,
}: {
  platform: Platform;
  canInstall: boolean;
  busy: boolean;
  onInstall: () => void;
}) {
  // iOS لا يدعم زر التثبيت البرمجي — تعليمات يدوية عبر Safari.
  if (platform === "ios") {
    return (
      <div>
        <div className="mb-4 flex items-center gap-2">
          <Apple className="h-5 w-5" />
          <h3 className="font-serif text-xl">على iPhone / iPad</h3>
        </div>
        <ol className="space-y-3 text-sm">
          <Step n={1} icon={<Share className="h-4 w-4" />}>
            افتحي الموقع في متصفّح <strong>Safari</strong>، ثم اضغطي زر <strong>المشاركة</strong> (المربّع مع السهم لأعلى).
          </Step>
          <Step n={2} icon={<Plus className="h-4 w-4" />}>
            اختاري <strong>«إضافة إلى الشاشة الرئيسية» (Add to Home Screen)</strong>.
          </Step>
          <Step n={3} icon={<CheckCircle2 className="h-4 w-4" />}>
            اضغطي <strong>«إضافة»</strong> — وستظهر أيقونة EliteCapture على شاشتك.
          </Step>
        </ol>
        <p className="mt-4 text-xs text-muted-foreground">
          ملاحظة: خطوة «إضافة إلى الشاشة الرئيسية» متاحة في Safari فقط (وليست في Chrome على iPhone).
        </p>
      </div>
    );
  }

  // Android / Desktop: زر تثبيت مباشر إن توفّر، وإلا تعليمات القائمة.
  const Icon = platform === "desktop" ? MonitorSmartphone : Chrome;
  const title = platform === "desktop" ? "على سطح المكتب" : "على Android";
  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <Icon className="h-5 w-5" />
        <h3 className="font-serif text-xl">{title}</h3>
      </div>

      {canInstall ? (
        <>
          <p className="text-sm text-muted-foreground mb-4">
            جهازك يدعم التثبيت المباشر. اضغطي الزر التالي ثم أكّدي التثبيت.
          </p>
          <button
            onClick={onInstall}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-sm bg-charcoal px-5 py-3 text-ivory hover:opacity-90 disabled:opacity-60"
          >
            <Download className="h-5 w-5" />
            {busy ? "جارٍ التثبيت…" : "ثبّتي التطبيق الآن"}
          </button>
        </>
      ) : (
        <ol className="space-y-3 text-sm">
          <Step n={1} icon={<Chrome className="h-4 w-4" />}>
            افتحي الموقع في <strong>Chrome</strong>، ثم افتحي قائمة المتصفّح <strong>(⋮)</strong>.
          </Step>
          <Step n={2} icon={<Download className="h-4 w-4" />}>
            اختاري <strong>«تثبيت التطبيق» / «Install app»</strong> أو <strong>«إضافة إلى الشاشة الرئيسية»</strong>.
          </Step>
          <Step n={3} icon={<CheckCircle2 className="h-4 w-4" />}>
            أكّدي — وستظهر أيقونة EliteCapture على جهازك.
          </Step>
        </ol>
      )}
      <p className="mt-4 text-xs text-muted-foreground">
        إن لم يظهر زر التثبيت، تصفّحي الموقع قليلاً ثم أعيدي فتح هذه الصفحة — يُفعّله المتصفّح بعد تحقّق شروط التطبيق.
      </p>
    </div>
  );
}

function Step({ n, icon, children }: { n: number; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-gold/15 text-xs font-bold text-gold">
        {n}
      </span>
      <span className="flex items-center gap-2 leading-relaxed text-foreground/90">
        <span className="text-muted-foreground">{icon}</span>
        <span>{children}</span>
      </span>
    </li>
  );
}

function Benefit({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <li className="flex items-start gap-2 text-foreground/90">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span>{text}</span>
    </li>
  );
}
