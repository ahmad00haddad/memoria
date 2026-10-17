import { createFileRoute, notFound } from "@tanstack/react-router";
import { OCCASIONS, SITE_URL, getOccasion } from "@/content/seo";
import { SeoLanding, seoHead } from "@/components/site/SeoLanding";

export const Route = createFileRoute("/occasion/$type")({
  loader: ({ params }) => {
    const o = getOccasion(params.type);
    if (!o) throw notFound();
    return o;
  },
  head: ({ loaderData }) => {
    const o = loaderData;
    if (!o) return {};
    const url = `${SITE_URL}/occasion/${o.slug}`;
    return seoHead({
      title: o.title,
      description: o.description,
      url,
      serviceName: o.h1,
      faqs: o.faqs,
      crumbs: [
        { name: "Memoria", url: SITE_URL },
        { name: "المناسبات", url: `${SITE_URL}/search` },
        { name: o.name, url },
      ],
    });
  },
  component: OccasionPage,
});

function OccasionPage() {
  const o = Route.useLoaderData();
  return (
    <SeoLanding
      h1={o.h1}
      intro={o.intro}
      paragraphs={o.paragraphs}
      faqs={o.faqs}
      linksTitle="مناسبات أخرى"
      links={OCCASIONS.filter((x) => x.slug !== o.slug).map((x) => ({ to: `/occasion/${x.slug}`, label: x.name }))}
    />
  );
}
