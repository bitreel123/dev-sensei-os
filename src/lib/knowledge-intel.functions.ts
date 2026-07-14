import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createAnthropic } from "@ai-sdk/anthropic";
import { generateText, tool, stepCountIs } from "ai";
import { z } from "zod";
import { callGeminiText } from "./intel-shared";

// ---------------- Types ----------------
export type KnowledgeResource = {
  kind: "repo" | "api" | "dataset" | "model" | "framework" | "package" | "article";
  title: string;
  url: string;
  why: string; // layman: why this helps
  stars?: number | null;
  tags?: string[];
};

export type KnowledgeReport = {
  question: string;
  laymanSummary: string; // Gemini-written plain-English overview
  recommendedStack: string[];
  resources: KnowledgeResource[];
  nextSteps: string[]; // 3-6 concrete steps in plain English
  glossary: Array<{ term: string; meaning: string }>; // define any abbreviations
};

// ---------------- GitHub helpers ----------------
const GITHUB_API = "https://api.github.com";
async function gh<T>(url: string, token?: string): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`GitHub ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json() as Promise<T>;
}

// ---------------- Server fn ----------------
export const runKnowledgeIntelligence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { question: string; projectContext?: string }) => {
      if (!input?.question || input.question.trim().length < 5)
        throw new Error("Question must be at least 5 characters.");
      return {
        question: input.question.slice(0, 1000),
        projectContext: (input.projectContext ?? "").slice(0, 3000),
      };
    },
  )
  .handler(async ({ data, context }) => {
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!anthropicKey) throw new Error("ANTHROPIC_API_KEY not configured");
    if (!geminiKey) throw new Error("GEMINI_API_KEY not configured");

    // Grab user's GitHub token if available (higher rate limit + private search)
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: conn } = await supabaseAdmin
      .from("github_connections")
      .select("access_token")
      .eq("user_id", context.userId)
      .maybeSingle();
    const ghToken = (conn as { access_token?: string } | null)?.access_token;

    // ---------- Tools (agentic) ----------
    const tools = {
      search_github_repos: tool({
        description:
          "Search public GitHub for repositories matching a query. Use for finding reference projects, libraries, and frameworks.",
        inputSchema: z.object({
          query: z.string().describe("Search query e.g. 'react realtime chat websocket'"),
          limit: z.number().min(1).max(10).default(5),
        }),
        execute: async ({ query, limit }) => {
          const j = await gh<{
            items: Array<{
              full_name: string;
              html_url: string;
              description: string | null;
              stargazers_count: number;
              language: string | null;
              topics?: string[];
            }>;
          }>(
            `${GITHUB_API}/search/repositories?q=${encodeURIComponent(query)}&per_page=${limit}&sort=stars`,
            ghToken,
          );
          return j.items.map((r) => ({
            name: r.full_name,
            url: r.html_url,
            stars: r.stargazers_count,
            language: r.language,
            description: r.description,
            topics: r.topics ?? [],
          }));
        },
      }),
      search_github_code: tool({
        description:
          "Search actual code snippets across public GitHub. Use for finding real-world usage of an API or pattern.",
        inputSchema: z.object({
          query: z.string(),
          limit: z.number().min(1).max(10).default(5),
        }),
        execute: async ({ query, limit }) => {
          const j = await gh<{
            items: Array<{
              path: string;
              html_url: string;
              repository: { full_name: string; html_url: string };
            }>;
          }>(
            `${GITHUB_API}/search/code?q=${encodeURIComponent(query)}&per_page=${limit}`,
            ghToken,
          );
          return j.items.map((r) => ({
            repo: r.repository.full_name,
            path: r.path,
            url: r.html_url,
          }));
        },
      }),
      search_npm: tool({
        description:
          "Search the npm registry for JavaScript/TypeScript packages, libraries, and SDKs.",
        inputSchema: z.object({
          query: z.string(),
          limit: z.number().min(1).max(10).default(5),
        }),
        execute: async ({ query, limit }) => {
          const res = await fetch(
            `https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(query)}&size=${limit}`,
          );
          if (!res.ok) throw new Error(`npm ${res.status}`);
          const j = (await res.json()) as {
            objects: Array<{
              package: { name: string; description?: string; links: { npm: string; homepage?: string }; keywords?: string[] };
              score: { final: number };
            }>;
          };
          return j.objects.map((o) => ({
            name: o.package.name,
            description: o.package.description,
            url: o.package.links.homepage ?? o.package.links.npm,
            npm: o.package.links.npm,
            keywords: o.package.keywords ?? [],
            score: Math.round(o.score.final * 100) / 100,
          }));
        },
      }),
      search_huggingface: tool({
        description:
          "Search Hugging Face for public AI models and datasets. Use when the user needs ML models, embeddings, or open datasets.",
        inputSchema: z.object({
          query: z.string(),
          type: z.enum(["models", "datasets"]).default("models"),
          limit: z.number().min(1).max(10).default(5),
        }),
        execute: async ({ query, type, limit }) => {
          const res = await fetch(
            `https://huggingface.co/api/${type}?search=${encodeURIComponent(query)}&limit=${limit}`,
          );
          if (!res.ok) throw new Error(`HF ${res.status}`);
          const j = (await res.json()) as Array<{ id: string; downloads?: number; likes?: number }>;
          return j.map((r) => ({
            id: r.id,
            url: `https://huggingface.co/${type === "datasets" ? "datasets/" : ""}${r.id}`,
            downloads: r.downloads ?? null,
            likes: r.likes ?? null,
          }));
        },
      }),
    };

    // ---------- Step 1: Claude Sonnet agent loop ----------
    const anthropic = createAnthropic({ apiKey: anthropicKey });
    const claude = anthropic("claude-sonnet-4-5");

    const systemPrompt = `You are a senior engineer helping a developer discover the best tools, libraries, APIs, datasets, and models for their project.

You have search tools for GitHub (repos + code), npm, and Hugging Face (models + datasets). Use them 2-6 times, mixing tools, before answering. Search broadly then narrow down.

When you finish researching, return STRICT JSON only (no markdown fences, no prose outside JSON) with this shape:
{
  "recommendedStack": string[],
  "resources": [
    { "kind": "repo"|"api"|"dataset"|"model"|"framework"|"package"|"article",
      "title": string, "url": string, "why": string, "stars": number|null, "tags": string[] }
  ],
  "nextSteps": string[],           // 3-6 concrete, plain-English steps
  "glossary": [ { "term": string, "meaning": string } ]  // define every abbreviation you use (e.g. "API", "SDK", "ORM")
}

Rules:
- Use PLAIN ENGLISH. Assume the reader may not be highly technical.
- Every "why" is one short sentence explaining the benefit for THIS project.
- Include 6-12 resources across different kinds.
- Prefer maintained, popular options (higher stars, recent activity).`;

    const userPrompt =
      `Question: ${data.question}` +
      (data.projectContext
        ? `\n\nProject context:\n${data.projectContext}`
        : "");

    const { text: claudeText } = await generateText({
      model: claude,
      system: systemPrompt,
      prompt: userPrompt,
      tools,
      stopWhen: stepCountIs(50),
    });

    const jsonMatch = claudeText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Claude returned no JSON payload.");
    const partial = JSON.parse(jsonMatch[0]) as Omit<KnowledgeReport, "question" | "laymanSummary">;

    // ---------- Step 2: Gemini plain-English summary ----------
    const gateway = createOpenAICompatible({
      name: "lovable",
      baseURL: "https://ai.gateway.lovable.dev/v1",
      headers: { "Lovable-API-Key": lovableKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    });
    const gemini = gateway("google/gemini-3.1-flash-lite");

    const { text: summary } = await generateText({
      model: gemini,
      system:
        "You write friendly, plain-English summaries for developers who may not be highly technical. 2-3 short paragraphs. Define any abbreviation the first time you use it, e.g. 'API (Application Programming Interface)'.",
      prompt:
        `Question: ${data.question}\n\nResearch findings (JSON):\n${JSON.stringify(partial).slice(0, 8000)}\n\nWrite a plain-English summary explaining what the developer should build with, why, and how the pieces fit together.`,
    });

    const report: KnowledgeReport = {
      question: data.question,
      laymanSummary: summary,
      recommendedStack: partial.recommendedStack ?? [],
      resources: partial.resources ?? [],
      nextSteps: partial.nextSteps ?? [],
      glossary: partial.glossary ?? [],
    };
    return { report };
  });
