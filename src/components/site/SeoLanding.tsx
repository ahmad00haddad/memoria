import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { searchPhotographers } from "@/lib/search.functions";
import { HOW_BOOKING, type Faq } from "@/content/seo";
import { t, tx } from "@/i18n";

type Crumb = { name: string; url: string };

export function seoHead(opts: { title: string; description: string; url: string; crumbs: Crumb[]; faqs: Faq[]; serviceName: string; areaName?: string }) {
  const { title, description, url, crumbs, faqs, serviceName, areaName } = opts;
  const ld = (o: unknown) => ({ type: "application/ld+json", children: JSON.stringify(o) });
  return {
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { property: "og:url", content: url },
      { property: "og:locale", content: "ar_JO" },
    ],
    links: [{ rel: "canonical", href: url }],
    scripts: [
      ld({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: c.url })),
      }),
      ld({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
      }),
      ld({
        "@context": "https://schema.org",
        "@type": "Service",
        name: serviceName,
        serviceType: t("تصوير مناسبات"),
        description,
        url,
        areaServed: areaName ? { "@type": "City", name: areaName } : { "@type": "Country", name: t("الأردن") },
        provider: { "@type": "Organization", name: "Memoria", url: crumbs[0]?.url },
      }),
    ],
  };
}

export function SeoLanding(props: {
  h1: string;
  intro: string;
  paragraphs: string[];
  faqs: Faq[];
  city?: string;
  cityLabel?: string;
  links: { to: string; label: string }[];
  linksTitle: string;
}) {
  const run = useServerFn(searchPhotographers);
  const q = useQuery({
    queryKey: ["seo-landing", props.city ?? "all"],
    queryFn: () => run({ data: { city: props.city, sort: "featured" } }),
    staleTime: 5 * 60_000,
  });
  const list = (q.data ?? []).slice(0, 6);
  const searchHref = props.city ? `/search?city=${encodeURIComponent(props.city)}` : "/search";

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <article className="container-editorial max-w-3xl py-12 sm:py-20">
          <h1 className="font-serif text-3xl sm:text-5xl leading-tight mb-5">{tx(props.h1)}</h1>
          <p className="text-lg text-muted-foreground leading-relaxed mb-6">{tx(props.intro)}</p>
          {props.paragraphs.map((p, i) => (
            <p key={i} className="leading-loose mb-5">{tx(p)}</p>
          ))}
          <h2 className="font-serif text-2xl mt-10 mb-3">{t("كيف يتم الحجز على Memoria")}</h2>
          <p className="leading-loose mb-5">{t("{0} للتفاصيل الكاملة اقرئي", [HOW_BOOKING])}{" "}<Link to="/guide" className="text-gold underline">{t("دليل الحجز")}</Link>.</p>

          <h2 className="font-serif text-2xl mt-10 mb-4">{props.cityLabel ? t("مصوّرات في {0}", [props.cityLabel]) : t("مصوّرات منشورة")}</h2>
          {q.isLoading ? (
            <p className="text-sm text-muted-foreground">{t("جارٍ التحميل…")}</p>
          ) : list.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("لا توجد ملفات منشورة هنا حالياً. يمكنك تصفّح كل المصوّرات من صفحة البحث.")}</p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {list.map((p) => (
                <li key={p.username}>
                  <Link to="/photographers/$username" params={{ username: p.username }} className="block rounded-sm border border-border bg-card p-4 hover:border-gold/40 transition">
                    <div className="font-serif text-lg">{tx(p.display_name)}</div>
                    <div className="text-xs text-muted-foreground mt-1">{[p.city, p.tagline].filter(Boolean).join(" · ")}</div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <a href={searchHref} className="inline-block mt-5 bg-charcoal text-ivory px-6 py-3 rounded-sm hover:opacity-90">
            {props.cityLabel ? t("كل المصوّرات في {0}", [props.cityLabel]) : t("ابحثي عن مصوّرة")}
          </a>

          <h2 className="font-serif text-2xl mt-12 mb-4">{t("أسئلة شائعة")}</h2>
          <div className="space-y-3">
            {props.faqs.map((f) => (
              <details key={f.q} className="rounded-sm border border-border bg-card p-4">
                <summary className="cursor-pointer font-medium">{tx(f.q)}</summary>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{tx(f.a)}</p>
              </details>
            ))}
          </div>

          <h2 className="font-serif text-xl mt-12 mb-3">{tx(props.linksTitle)}</h2>
          <ul className="flex flex-wrap gap-2">
            {props.links.map((l) => (
              <li key={l.to}>
                <a href={l.to} className="inline-block rounded-full border border-border px-4 py-2 text-sm hover:bg-secondary">{tx(l.label)}</a>
              </li>
            ))}
            <li><Link to="/guide" className="inline-block rounded-full border border-border px-4 py-2 text-sm hover:bg-secondary">{t("دليل الحجز")}</Link></li>
            <li><a href="/blog" className="inline-block rounded-full border border-border px-4 py-2 text-sm hover:bg-secondary">{t("المدوّنة")}</a></li>
          </ul>
        </article>
      </main>
      <Footer />
    </div>
  );
}
