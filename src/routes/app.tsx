import { createFileRoute } from "@tanstack/react-router";
import { HealthDashboard } from "@/components/jeradin/health-dashboard";

export const Route = createFileRoute("/app")({
  head: () => ({
    meta: [
      { title: "Search Explorer · Jeradin" },
      { name: "description", content: "Read biomedical research briefs and explore organ connections through Jeradin’s automatic educational anatomy walkthrough." },
      { property: "og:title", content: "Search Explorer · Jeradin" },
      { property: "og:description", content: "A research reading workspace with connected educational anatomy and incoming evidence updates." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HealthDashboard,
});
