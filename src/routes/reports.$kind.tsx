import { createFileRoute, notFound } from "@tanstack/react-router";
import { HealthDashboard } from "@/components/jeradin/health-dashboard";
import { ReportArticlePage } from "@/components/jeradin/report-article-page";
import { reportArticles, type ReportKind } from "@/components/jeradin/report-articles";

export const Route = createFileRoute("/reports/$kind")({
  loader: ({ params }) => {
    const article = reportArticles[params.kind as ReportKind];
    if (!article) throw notFound();
    return { kind: article.kind };
  },
  head: ({ loaderData }) => {
    const a = loaderData ? reportArticles[loaderData.kind] : undefined;
    const title = a ? `${a.title} — Full report | Jeradin` : "Report unavailable | Jeradin";
    const description = a ? `${a.subtitle}. Anatomy, effects, research and sources in one educational report.` : "This report is unavailable.";
    return { meta: [{ title }, { name: "description", content: description }, { property: "og:title", content: title }, { property: "og:description", content: description }, { property: "og:type", content: "article" }, { name: "twitter:card", content: "summary" }, ...(a ? [] : [{ name: "robots", content: "noindex" }])] };
  },
  component: ReportPage,
});

function ReportPage() {
  const { kind } = Route.useLoaderData();
  return <HealthDashboard view={kind === "pathogen" ? "pathogen" : "search"}><ReportArticlePage article={reportArticles[kind]} /></HealthDashboard>;
}
