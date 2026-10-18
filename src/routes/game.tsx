import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { BrideGame } from "@/components/site/BrideGame";

export const Route = createFileRoute("/game")({
  head: () => ({
    meta: [
      { title: "ضاعت العروس — Memoria · ميموريا" },
      { name: "description", content: "لعبة ميموريا: اهربي من العريس واكسري رقمك القياسي، ثم شاركي نتيجتك." },
      { property: "og:title", content: "ضاعت العروس — Memoria" },
      { property: "og:description", content: "اهربي من العريس واكسري رقمك القياسي." },
    ],
  }),
  component: GamePage,
});

function GamePage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container-editorial py-12 max-w-4xl">
        <div className="text-center text-xs uppercase tracking-[0.3em] text-gold mb-6">استراحة</div>
        <BrideGame />
      </main>
      <Footer />
    </div>
  );
}
