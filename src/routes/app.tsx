import { createFileRoute } from "@tanstack/react-router";
import { HealthDashboard } from "@/components/jeradin/health-dashboard";
import { explorerQuery } from "@/lib/health-evidence.queries";

export const Route = createFileRoute("/app")({
  loader: ({ context }) => context.queryClient.ensureQueryData(explorerQuery()),
  head: () => ({
    meta: [
      { title: "Search Explorer · Jeradin" },
      { name: "description", content: "Explore health news and biomedical research, with complete permitted articles, publication figures, tables and educational human anatomy." },
      { property: "og:title", content: "Search Explorer · Jeradin" },
      { property: "og:description", content: "Discover health news and research with organised articles, figures, data tables and publication details." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HealthDashboard,
});
