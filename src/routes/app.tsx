import { createFileRoute } from "@tanstack/react-router";
import { HealthDashboard } from "@/components/jeradin/health-dashboard";

export const Route = createFileRoute("/app")({
  head: () => ({
    meta: [
      { title: "Medical Research Workspace · Jeradin" },
      { name: "description", content: "Explore Jeradin’s virtual human anatomy preview, research sources and medical data workspace." },
      { property: "og:title", content: "Medical Research Workspace · Jeradin" },
      { property: "og:description", content: "Connect anatomy, public health research and your saved work in one workspace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HealthDashboard,
});

const nav = [
