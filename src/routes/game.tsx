import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { BrideGame } from "@/components/site/BrideGame";
import { t } from "@/i18n";

export const Route = createFileRoute("/game")({
  head: () => ({
    meta: [
      { title: t("اهربي يا عروس — Memoria · ميموريا") },
      { name: "description", content: t("لعبة ميموريا: اهربي من العريس واكسري رقمك القياسي، ثم شاركي نتيجتك.") },
      { property: "og:title", content: t("اهربي يا عروس — Memoria") },
      { property: "og:description", content: t("اهربي من العريس واكسري رقمك القياسي.") },
    ],
  }),
  component: GamePage,
});

function GamePage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container-editorial py-12 max-w-4xl">
        <div className="text-center text-xs uppercase tracking-[0.3em] text-gold mb-6">{t("استراحة")}</div>
        <BrideGame />
      </main>
      <Footer />
    </div>
  );
}
