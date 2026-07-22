import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createAnthropic } from "@ai-sdk/anthropic";
import { generateText, tool, stepCountIs } from "ai";
import { z } from "zod";

// ---------------- Types ----------------
export type KnowledgeResource = {
  kind: "repo" | "api" | "dataset" | "model" | "framework" | "package" | "article";
  title: string;
  url: string;
  why: string; // layman: why this helps
  stars?: number | null;
  tags?: string[];
};

export type KnowledgeCompetitor = {
  name: string;
  url?: string;
  positioning?: string;
  strengths: string[];
  weaknesses: string[];
  pricing?: string;
  gap?: string; // opportunity vs. this competitor
};

export type KnowledgeTradeoff = {
  choice: string;             // e.g. "Next.js"
  why: string;                // one-sentence rationale
  alternatives?: string[];    // e.g. ["Remix", "SvelteKit"]
  tradeoffs?: string;         // when NOT to pick this
};

export type KnowledgeGraphNode = {
  id: string;
  label: string;
  category:
    | "domain" | "market" | "competitor" | "framework"
    | "architecture" | "security" | "database" | "backend"
    | "deployment" | "pricing" | "growth";
};

export type KnowledgeGraphEdge = { from: string; to: string; relation: string };

export type KnowledgeReport = {
  question: string;
  laymanSummary: string;

  // Product Discovery
  productDiscovery?: {
    clarifyingQuestions: string[];
    vision: string;
    targetUsers: string[];
    problem: string;
    solution: string;
    businessModel: string;
    mvpRoadmap: string[];
  };

  // Market Intelligence
  marketIntelligence?: {
    trends: string[];
    unsolvedProblems: string[];
    sources: Array<{ title: string; url: string; kind: string }>;
  };

  // Competitors
  competitors?: KnowledgeCompetitor[];

  // Architecture
  architecture?: {
    folderStructure?: string;   // ascii tree
    repoLayout?: string;
    databaseSchema?: string;    // brief description or dbml
    apiStyle?: string;          // REST / GraphQL / RPC
    monolithVsMicroservices?: string;
    auth?: string;
    queues?: string;
    caching?: string;
    deployment?: string;
    mermaid?: string;           // architecture diagram
  };

  // Technology choices with tradeoffs
  technologyChoices?: KnowledgeTradeoff[];

  // Security
  security?: {
    recommendations: Array<{ title: string; why: string }>;
    compliance?: string[];
  };

  // System Design diagrams (Mermaid)
  systemDesign?: {
    sequence?: string;   // mermaid sequenceDiagram
    er?: string;         // mermaid erDiagram
    dataflow?: string;   // mermaid flowchart
    services?: string;   // mermaid graph
  };

  // Development plan
  developmentPlan?: {
    weeks: Array<{ label: string; goals: string[] }>;
    milestones: string[];
    testing?: string;
    deployment?: string;
  };

  // Learning explainer (for "explain X" questions)
  learning?: {
    technical: string;
    layman: string;
    whenToUse: string[];
    whenNotToUse: string[];
    example?: string;
  };

  // Launch
  launch?: {
    analytics: string[];
    monitoring: string[];
    cicd: string[];
    featureFlags?: string;
    pricingIdeas?: string[];
    betaStrategy?: string;
    growthExperiments?: string[];
    checklist: string[];
  };

  // Knowledge graph nodes & edges — this is the moat
  graph?: {
    nodes: KnowledgeGraphNode[];
    edges: KnowledgeGraphEdge[];
  };

  // Legacy fields (kept for back-compat)
  recommendedStack: string[];
  resources: KnowledgeResource[];
  nextSteps: string[];
  glossary: Array<{ term: string; meaning: string }>;
};

// ---------------- GitHub helpers ----------------
const GITHUB_API = "https://api.github.com";
const SEARCH_TIMEOUT_MS = 3_500;

async function fetchKnowledgeSource(input: string, init?: RequestInit) {
  return fetch(input, {
    ...init,
    signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS),
  });
}

async function gh<T>(url: string, token?: string): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
          "User-Agent": "jeradin-app",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetchKnowledgeSource(url, { headers });
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
    if (!anthropicKey) throw new Error("ANTHROPIC_API_KEY not configured");

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
          limit: z.number().default(5),
        }),
        execute: async ({ query, limit }) => {
          const safeLimit = Math.max(1, Math.min(5, Math.round(limit)));
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
            `${GITHUB_API}/search/repositories?q=${encodeURIComponent(query)}&per_page=${safeLimit}&sort=stars`,
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
          limit: z.number().default(5),
        }),
        execute: async ({ query, limit }) => {
          const safeLimit = Math.max(1, Math.min(5, Math.round(limit)));
          const j = await gh<{
            items: Array<{
              path: string;
              html_url: string;
              repository: { full_name: string; html_url: string };
            }>;
          }>(
            `${GITHUB_API}/search/code?q=${encodeURIComponent(query)}&per_page=${safeLimit}`,
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
          limit: z.number().default(5),
        }),
        execute: async ({ query, limit }) => {
          const safeLimit = Math.max(1, Math.min(5, Math.round(limit)));
          const res = await fetchKnowledgeSource(
            `https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(query)}&size=${safeLimit}`,
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
          limit: z.number().default(5),
        }),
        execute: async ({ query, type, limit }) => {
          const safeLimit = Math.max(1, Math.min(5, Math.round(limit)));
          const res = await fetchKnowledgeSource(
            `https://huggingface.co/api/${type}?search=${encodeURIComponent(query)}&limit=${safeLimit}`,
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

    // ---------- Claude Sonnet agent loop ----------
    const anthropic = createAnthropic({ apiKey: anthropicKey });
    const claude = anthropic("claude-sonnet-4-5");

    const systemPrompt = `You are Knowledge Intelligence — a senior product engineer + market analyst + software architect combined. You transform an idea or question into a production-ready plan grounded in a structured knowledge graph.

You have search tools for GitHub (repos + code), npm, and Hugging Face. Use at most one parallel search batch only when live external evidence materially improves the answer, then immediately produce the report. For direct explanations and ordinary questions, answer without tools. Never perform searches in repeated rounds.

Return STRICT JSON only (no markdown fences, no prose outside JSON). Any field may be omitted when clearly not relevant to the user's question, but prefer to include as many as possible. Shape:

{
  "recommendedStack": string[],
  "resources": [{ "kind":"repo"|"api"|"dataset"|"model"|"framework"|"package"|"article",
                  "title": string, "url": string, "why": string, "stars": number|null, "tags": string[] }],
  "nextSteps": string[],
  "glossary": [{ "term": string, "meaning": string }],

  "productDiscovery": {
    "clarifyingQuestions": string[],   // 4-8 questions to sharpen scope
    "vision": string,
    "targetUsers": string[],
    "problem": string,
    "solution": string,
    "businessModel": string,
    "mvpRoadmap": string[]             // 4-8 bullets
  },

  "marketIntelligence": {
    "trends": string[],
    "unsolvedProblems": string[],
    "sources": [{ "title": string, "url": string, "kind": string }]  // reports, reddit, HN, YC, papers
  },

  "competitors": [{
    "name": string, "url": string|null, "positioning": string,
    "strengths": string[], "weaknesses": string[], "pricing": string|null, "gap": string
  }],

  "architecture": {
    "folderStructure": string,       // ascii tree
    "repoLayout": string,
    "databaseSchema": string,        // brief description or dbml
    "apiStyle": string,
    "monolithVsMicroservices": string,
    "auth": string, "queues": string, "caching": string, "deployment": string,
    "mermaid": string                // Mermaid architecture diagram (graph TD ...), no code fences
  },

  "technologyChoices": [{
    "choice": string, "why": string,
    "alternatives": string[], "tradeoffs": string
  }],

  "security": {
    "recommendations": [{ "title": string, "why": string }],
    "compliance": string[]
  },

  "systemDesign": {
    "sequence": string,   // mermaid sequenceDiagram
    "er": string,         // mermaid erDiagram
    "dataflow": string,   // mermaid flowchart LR
    "services": string    // mermaid graph LR of services
  },

  "developmentPlan": {
    "weeks": [{ "label": string, "goals": string[] }],
    "milestones": string[],
    "testing": string,
    "deployment": string
  },

  "learning": {  // only for "explain X" style questions
    "technical": string, "layman": string,
    "whenToUse": string[], "whenNotToUse": string[], "example": string
  },

  "launch": {
    "analytics": string[], "monitoring": string[], "cicd": string[],
    "featureFlags": string, "pricingIdeas": string[],
    "betaStrategy": string, "growthExperiments": string[], "checklist": string[]
  },

  "laymanSummary": string, "graph": {
    "nodes": [{ "id": string, "label": string,
                "category":"domain"|"market"|"competitor"|"framework"|"architecture"|"security"|"database"|"backend"|"deployment"|"pricing"|"growth" }],
    "edges": [{ "from": string, "to": string, "relation": string }]
  }
}

Rules:
- laymanSummary: 2-3 short paragraphs in friendly plain English for developers who may not be highly technical. Define any abbreviation the first time you use it.
- PLAIN ENGLISH. Assume the reader may not be highly technical. Define abbreviations in "glossary".
- Every "why" is ONE short sentence explaining benefit for THIS project.
- Keep the complete report concise enough to finish reliably: no section may exceed 4 list items, except resources (maximum 6) and graph nodes (maximum 12).
- Include every section relevant to the question, but omit irrelevant sections rather than filling them with generic text.
- Keep each list item to one or two sentences. Keep Mermaid diagrams small.
- Use up to 6 resources across different kinds.
- Prefer maintained, popular options (higher stars, recent activity).
- For Mermaid, no code fences and keep node labels short.
- Build the knowledge graph so the answer feels connected (Domain → Market → Competitors → Frameworks → Architecture → Security → Database → Backend → Deployment → Pricing → Growth). 8-16 nodes is a good size.`;

    const { recallIntel, memoryPromptSuffix } = await import("./intel-memory.server");
    const memTail = memoryPromptSuffix(await recallIntel(context.userId, "knowledge", 5));
    const userPrompt =
      `Question: ${data.question}` +
      (data.projectContext ? `\n\nProject context:\n${data.projectContext}` : "") +
      memTail;

    const { text: claudeText } = await generateText({
      model: claude,
      system: systemPrompt,
      prompt: userPrompt,
      tools,
      maxOutputTokens: 5200,
      stopWhen: stepCountIs(2),
    });

    const jsonStart = claudeText.indexOf("{");
    const jsonEnd = claudeText.lastIndexOf("}");
    const jsonPayload = jsonStart >= 0
      ? claudeText.slice(jsonStart, jsonEnd > jsonStart ? jsonEnd + 1 : undefined)
      : "";
    if (!jsonPayload) throw new Error("Knowledge analysis returned an incomplete response. Please retry.");
    let partial: Omit<KnowledgeReport, "question">;
    try {
      partial = JSON.parse(jsonPayload) as Omit<KnowledgeReport, "question">;
    } catch {
      const { jsonrepair } = await import("jsonrepair");
      try {
        partial = JSON.parse(jsonrepair(jsonPayload)) as Omit<KnowledgeReport, "question">;
      } catch {
        throw new Error("Knowledge analysis returned an incomplete response. Please retry.");
      }
    }

    if (!partial || typeof partial !== "object" || Array.isArray(partial)) {
      throw new Error("Knowledge analysis returned an invalid response. Please retry.");
    }

    

    const report: KnowledgeReport = {
      question: data.question,
      laymanSummary: partial.laymanSummary ?? "",
      recommendedStack: partial.recommendedStack ?? [],
      resources: partial.resources ?? [],
      nextSteps: partial.nextSteps ?? [],
      glossary: partial.glossary ?? [],
      productDiscovery: partial.productDiscovery,
      marketIntelligence: partial.marketIntelligence,
      competitors: partial.competitors,
      architecture: partial.architecture,
      technologyChoices: partial.technologyChoices,
      security: partial.security,
      systemDesign: partial.systemDesign,
      developmentPlan: partial.developmentPlan,
      learning: partial.learning,
      launch: partial.launch,
      graph: partial.graph,
    };

    const { chargeAndRemember, INTEL_COST } = await import("./intel-memory.server");
    await chargeAndRemember(context.userId, "knowledge", INTEL_COST.knowledge, {
      title: data.question.slice(0, 200),
      summary: partial.laymanSummary?.slice(0, 800) ?? null,
      payload: {
        vision: partial.productDiscovery?.vision ?? null,
        competitors: (partial.competitors ?? []).map((c) => c.name).slice(0, 6),
        stack: (partial.recommendedStack ?? []).slice(0, 8),
      },
      tags: (partial.recommendedStack ?? []).slice(0, 5),
    });

    return { report };
  });
