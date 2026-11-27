import { createFileRoute } from "@tanstack/react-router";
import { HealthDashboard } from "@/components/jeradin/health-dashboard";
import { datasetRecordsQuery } from "@/lib/health-evidence.queries";
import { DatasetsPage } from "@/components/jeradin/datasets-page";

export const Route = createFileRoute("/datasets")({
  loader: ({ context }) => context.queryClient.ensureQueryData(datasetRecordsQuery()),
  head: () => ({ meta: [
    { title: "Biomedical Datasets · Jeradin" },
    { name: "description", content: "Export structured records from complete health reports and biomedical research with supporting passages and reuse terms." },
    { property: "og:title", content: "Biomedical Datasets · Jeradin" },
    { property: "og:description", content: "Browse and export evidence-linked health research records with publication provenance." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: () => <HealthDashboard view="datasets"><DatasetsPage /></HealthDashboard>,
});