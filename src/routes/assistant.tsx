import { createFileRoute } from "@tanstack/react-router";
import { HealthDashboard } from "@/components/jeradin/health-dashboard";
import { AssistantPreview } from "@/components/jeradin/assistant-preview";

export const Route = createFileRoute("/assistant")({
  head: () => ({
    meta: [
      { title: "AI Research Assistant · Jeradin" },
      {
        name: "description",
        content:
          "Preview Jeradin’s biomedical AI assistant with research prompts, educational explanations and anatomy connections.",
      },
      { property: "og:title", content: "AI Research Assistant · Jeradin" },
      {
        property: "og:description",
        content:
          "A preview of biomedical conversations, key findings and related research resources.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <HealthDashboard view="assistant">
      <AssistantPreview />
    </HealthDashboard>
  ),
});
