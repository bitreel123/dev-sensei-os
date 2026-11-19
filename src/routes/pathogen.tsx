import { createFileRoute } from "@tanstack/react-router";
import { HealthDashboard } from "@/components/jeradin/health-dashboard";

export const Route = createFileRoute("/pathogen")({
  head: () => ({
    meta: [
      { title: "Pathogen Mapping · Jeradin" },
      { name: "description", content: "Read pathogen research updates and follow educational illustrations of transmission, organ connections and immune response." },
      { property: "og:title", content: "Pathogen Mapping · Jeradin" },
      { property: "og:description", content: "Connect pathogen research with an automatic educational anatomy walkthrough." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <HealthDashboard view="pathogen" />,
});