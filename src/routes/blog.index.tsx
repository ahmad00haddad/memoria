import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { BLOG_POSTS } from "@/content/blog";
import { SITE_URL } from "@/content/seo";
import { t, tx } from "@/i18n";

const URL = `${SITE_URL}/blog`;
const TITLE = "مدوّنة Memoria — نصائح لتصوير الأعراس والمناسبات";
const DESC = "مقالات عملية تساعدك على اختيار مصوّرة الأعراس وتجهيز يوم المناسبة وفهم تكلفة التصوير في الأردن.";

export const Route = createFileRoute("/blog/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:url", content: URL },
      { property: "og:locale", content: "ar_JO" },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Memoria", item: SITE_URL },
            { "@type": "ListItem", position: 2, name: t("المدوّنة"), item: URL },
          ],
        }),
      },
    ],
  }),
  component: BlogIndex,
});

function BlogIndex() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container-editorial max-w-3xl py-12 sm:py-20">
        <h1 className="font-serif text-3xl sm:text-5xl mb-3">{t("المدوّنة")}</h1>
        <p className="text-muted-foreground mb-10 leading-relaxed">{tx(DESC)}</p>
        <ul className="space-y-5">
          {BLOG_POSTS.map((p) => (
            <li key={p.slug}>
              <Link to="/blog/$slug" params={{ slug: p.slug }} className="block rounded-sm border border-border bg-card p-5 hover:border-gold/40 transition">
                <h2 className="font-serif text-xl mb-2">{tx(p.title)}</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">{tx(p.excerpt)}</p>
              </Link>
            </li>
          ))}
        </ul>
      </main>
      <Footer />
    </div>
  );
}
