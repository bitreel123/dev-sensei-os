import { createFileRoute } from "@tanstack/react-router";
import { HealthDashboard } from "@/components/jeradin/health-dashboard";
import { DatasetsPage } from "@/components/jeradin/datasets-page";

export const Route = createFileRoute("/datasets")({
  head: () => ({ meta: [
    { title: "Biomedical Datasets · Jeradin" },
    { name: "description", content: "Explore Jeradin’s biomedical dataset catalogue preview, from gene expression and medical imaging to clinical trial records." },
    { property: "og:title", content: "Biomedical Datasets · Jeradin" },
    { property: "og:description", content: "Browse structured biomedical research collections and preview their fields." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: () => <HealthDashboard view="datasets"><DatasetsPage /></HealthDashboard>,
});