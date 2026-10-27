import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { BLOG_POSTS, getPost } from "@/content/blog";
import { SITE_URL } from "@/content/seo";
import { locale } from "@/i18n";
import { t as tr, tx } from "@/i18n";

export const Route = createFileRoute("/blog/$slug")({
  loader: ({ params }) => {
    const post = getPost(params.slug);
    if (!post) throw notFound();
    return post;
  },
  head: ({ loaderData }) => {
    const p = loaderData;
    if (!p) return {};
    const url = `${SITE_URL}/blog/${p.slug}`;
    return {
      meta: [
        { title: `${p.title} | Memoria` },
        { name: "description", content: p.description },
        { property: "og:title", content: p.title },
        { property: "og:description", content: p.description },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { property: "og:locale", content: "ar_JO" },
        { property: "article:published_time", content: p.datePublished },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: p.title,
            description: p.description,
            inLanguage: "ar",
            datePublished: p.datePublished,
            dateModified: p.datePublished,
            mainEntityOfPage: url,
            author: { "@type": "Organization", name: "Memoria" },
            publisher: { "@type": "Organization", name: "Memoria", url: SITE_URL },
          }),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Memoria", item: SITE_URL },
              { "@type": "ListItem", position: 2, name: tr("المدوّنة"), item: `${SITE_URL}/blog` },
              { "@type": "ListItem", position: 3, name: p.title, item: url },
            ],
          }),
        },
      ],
    };
  },
  component: BlogPostPage,
});

function BlogPostPage() {
  const post = Route.useLoaderData();
  const related = BLOG_POSTS.filter((x) => x.slug !== post.slug).slice(0, 3);
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <article className="container-editorial max-w-3xl py-12 sm:py-20">
          <nav className="text-xs text-muted-foreground mb-4">
            <a href="/blog" className="hover:text-gold">{tr("المدوّنة")}</a>
          </nav>
          <h1 className="font-serif text-3xl sm:text-4xl leading-tight mb-3">{tx(post.title)}</h1>
          <time dateTime={post.datePublished} className="text-xs text-muted-foreground">
            {new Date(post.datePublished).toLocaleDateString(locale("ar-JO"), { year: "numeric", month: "long", day: "numeric" })}
          </time>
          {post.sections.map((s) => (
            <section key={s.h}>
              <h2 className="font-serif text-2xl mt-10 mb-3">{tx(s.h)}</h2>
              {s.p.map((t, i) => (
                <p key={i} className="leading-loose mb-4">{tx(t)}</p>
              ))}
              {s.list && (
                <ul className="list-disc ps-6 space-y-1 mb-4 leading-loose">
                  {s.list.map((li) => (
                    <li key={li}>{tx(li)}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}

          <div className="mt-12 rounded-sm border border-gold/30 bg-gold/5 p-6 text-center">
            <p className="font-serif text-xl mb-3">{tr("جاهزة للبحث عن مصوّرتك؟")}</p>
            <Link to="/search" className="inline-block bg-charcoal text-ivory px-6 py-3 rounded-sm hover:opacity-90">{tr("تصفّحي المصوّرات")}</Link>
          </div>

          <h2 className="font-serif text-xl mt-12 mb-4">{tr("مقالات ذات صلة")}</h2>
          <ul className="space-y-3">
            {related.map((r) => (
              <li key={r.slug}>
                <Link to="/blog/$slug" params={{ slug: r.slug }} className="text-gold hover:underline">{tx(r.title)}</Link>
              </li>
            ))}
          </ul>
        </article>
      </main>
      <Footer />
    </div>
  );
}
