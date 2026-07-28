import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

/**
 * Runs Jeradin's Knowledge Intelligence synchronously and returns a compact
 * report. Uses the same intent-routed section builders as the streaming
 * endpoint, but only runs the top 2 sections to stay well under the MCP
 * client timeout. Charges the caller 5 credits (same as the app).
 */
export default defineTool({
  name: "run_knowledge_intel",
  title: "Run Knowledge Intelligence",
  description:
    "Ask Jeradin a knowledge/research question (startup ideas, API/library comparisons, architecture, market research, how-to). Returns an opinionated report. Costs 5 credits per call.",
  inputSchema: {
    question: z.string().min(5).max(2000).describe("The question or research prompt."),
    projectContext: z
      .string()
      .max(8000)
      .optional()
      .describe("Optional extra context about the user's project."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  handler: async ({ question, projectContext }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return { content: [{ type: "text", text: "ANTHROPIC_API_KEY not configured" }], isError: true };
    }

    const {
      callClaudeJson,
      getKnowledgeSectionsForIntent,
      routeKnowledgeIntent,
    } = await import("@/lib/intel-sections.server");
    const {
      assertCreditsAvailable,
      INTEL_COST,
      chargeAndRemember,
      recallIntel,
      memoryPromptSuffix,
    } = await import("@/lib/intel-memory.server");

    const userId = ctx.getUserId()!;
    try {
      await assertCreditsAvailable(userId, INTEL_COST.knowledge);
    } catch (e) {
      return {
        content: [{ type: "text", text: e instanceof Error ? e.message : "Out of credits" }],
        isError: true,
      };
    }

    const routed = await routeKnowledgeIntent({ apiKey, question, projectContext });
    const sections = getKnowledgeSectionsForIntent(routed.intent).slice(0, 2);
    const memories = await recallIntel(userId, "knowledge", 3);
    const memory = memoryPromptSuffix(memories);
    const sharedCtx = { question, projectContext: projectContext ?? "", memory, evidence: "" };

    const results: Record<string, unknown> = { intent: routed.intent, entities: routed.entities };
    await Promise.all(
      sections.map(async (section) => {
        const spec = section.build(sharedCtx);
        try {
          const parsed = await callClaudeJson<Record<string, unknown>>({
            apiKey,
            system: spec.system,
            user: spec.user,
            maxTokens: spec.maxTokens,
            timeoutMs: 30_000,
          });
          if (section.id === "intro") {
            results.laymanSummary = parsed.laymanSummary ?? "";
            results.recommendedStack = parsed.recommendedStack ?? [];
            results.glossary = parsed.glossary ?? [];
            results.nextSteps = parsed.nextSteps ?? [];
          } else {
            results[section.key] = parsed[section.key];
          }
        } catch (e) {
          results[`${section.id}_error`] = e instanceof Error ? e.message : String(e);
        }
      }),
    );

    try {
      await chargeAndRemember(userId, "knowledge", INTEL_COST.knowledge, {
        title: `Knowledge · ${question.slice(0, 180)}`,
        summary:
          typeof results.laymanSummary === "string"
            ? (results.laymanSummary as string).slice(0, 800)
            : null,
        payload: {
          report: results as never,
          input: { question, projectContext, intent: routed.intent, entities: routed.entities },
        } as never,
        tags: [routed.intent, ...routed.entities.slice(0, 4)],
      });
    } catch (e) {
      console.error("[mcp run_knowledge_intel] charge failed:", e);
    }

    return {
      content: [{ type: "text", text: JSON.stringify(results, null, 2).slice(0, 20_000) }],
      structuredContent: { report: results },
    };
  },
});
