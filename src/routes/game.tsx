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
        <div className="text-xs uppercase tracking-[0.3em] text-gold mb-2">استراحة</div>
        <h1 className="font-serif text-4xl sm:text-5xl mb-3">ضاعت العروس!</h1>
        <p className="text-muted-foreground mb-8">اقفزي فوق العقبات واهربي من العريس، وشاركي نتيجتك مع أصحابك.</p>
        <BrideGame />
      </main>
      <Footer />
    </div>
  );
}
