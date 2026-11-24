import { createFileRoute } from "@tanstack/react-router";
import { HealthDashboard } from "@/components/jeradin/health-dashboard";
import { explorerQuery } from "@/lib/health-evidence.queries";

export const Route = createFileRoute("/app")({
  loader: ({ context }) => context.queryClient.ensureQueryData(explorerQuery()),
  head: () => ({
    meta: [
      { title: "Search Explorer · Jeradin" },
      { name: "description", content: "Search health-news feeds and biomedical publications with attributed excerpts, research abstracts and original source links." },
      { property: "og:title", content: "Search Explorer · Jeradin" },
      { property: "og:description", content: "Explore health news and research from connected sources, with readable abstracts and publication details." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HealthDashboard,
});
