import { createFileRoute, notFound } from "@tanstack/react-router";
import { CITIES, SITE_URL, getCity } from "@/content/seo";
import { SeoLanding, seoHead } from "@/components/site/SeoLanding";
import { t } from "@/i18n";

export const Route = createFileRoute("/wedding-photographer/$city")({
  loader: ({ params }) => {
    const city = getCity(params.city);
    if (!city) throw notFound();
    return city;
  },
  head: ({ loaderData }) => {
    const c = loaderData;
    if (!c) return {};
    const url = `${SITE_URL}/wedding-photographer/${c.slug}`;
    return seoHead({
      title: c.title,
      description: c.description,
      url,
      serviceName: t("تصوير أعراس في {0}", [c.name]),
      areaName: c.name,
      faqs: c.faqs,
      crumbs: [
        { name: "Memoria", url: SITE_URL },
        { name: t("مصورات الأعراس"), url: `${SITE_URL}/search` },
        { name: c.name, url },
      ],
    });
  },
  component: CityPage,
});

function CityPage() {
  const c = Route.useLoaderData();
  return (
    <SeoLanding
      h1={t("مصورة أعراس في {0}", [c.name])}
      intro={c.intro}
      paragraphs={c.paragraphs}
      faqs={c.faqs}
      city={c.name}
      cityLabel={c.name}
      linksTitle={t("مدن أخرى")}
      links={CITIES.filter((x) => x.slug !== c.slug).map((x) => ({ to: `/wedding-photographer/${x.slug}`, label: x.name }))}
    />
  );
}
