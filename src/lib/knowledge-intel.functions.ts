import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createAnthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";

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

export type KnowledgeScoreBand = {
  marketScore: number;       // 0-10
  competitionScore: number;  // 0-10 (higher = more competition)
  difficulty: number;        // 0-10
  capitalNeeded: number;     // 0-10 (higher = more capital)
  aiPotential: number;       // 0-10
  speedToMvp: number;        // 0-10 (higher = faster to MVP)
  pmfChance: number;         // 0-10
};

export type KnowledgeRecommendation = {
  headline: string;            // "Build: X for Y"
  opinion: string;             // 2-3 sentence opinionated advisor pick
  whyNow: string[];            // 3-5 tight bullets
  timeToMvp: string;           // "4-6 weeks"
  revenuePotential: string;    // "$$$" style + note
  scores: KnowledgeScoreBand;
  alternatives: Array<{ name: string; reasonToPass: string }>; // ideas we did NOT pick and why
};

export type KnowledgeFounderKit = {
  businessModelCanvas?: {
    customerSegments: string[];
    valuePropositions: string[];
    channels: string[];
    customerRelationships: string[];
    revenueStreams: string[];
    keyResources: string[];
    keyActivities: string[];
    keyPartners: string[];
    costStructure: string[];
  };
  goToMarket?: { phase: string; playbook: string; targets: string[] }[];
  pricingStrategy?: { model: string; tiers: Array<{ name: string; price: string; includes: string[] }>; rationale: string };
  tamSamSom?: { tam: string; sam: string; som: string; assumptions: string[] };
  investorReadiness?: { score: number; checklist: Array<{ item: string; done: boolean }>; missing: string[] };
  risksAndAssumptions?: Array<{ risk: string; assumption: string; mitigation: string }>;
};

export type KnowledgeAiMoat = {
  rating: number; // 0-5 stars
  headline: string;
  reasons: string[]; // "Hard to copy because ..."
  dataFlywheel?: string;
};

export type KnowledgeMarketValidation = {
  signals: Array<{ label: string; detail?: string }>;
  evidenceScore: number; // 0-100
};

export type KnowledgeReport = {
  question: string;
  laymanSummary: string;
  recommendation?: KnowledgeRecommendation;
  aiMoat?: KnowledgeAiMoat;
  marketValidation?: KnowledgeMarketValidation;
  founderKit?: KnowledgeFounderKit;


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
    const { assertCreditsAvailable, INTEL_COST } = await import("./intel-memory.server");
    await assertCreditsAvailable(context.userId, INTEL_COST.knowledge);

    const startedAt = Date.now();

    // These reads are independent, so do them together instead of adding two
    // sequential database round trips before generation starts.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { recallIntel, memoryPromptSuffix } = await import("./intel-memory.server");
    const [connectionResult, memories] = await Promise.all([
      supabaseAdmin
        .from("github_connections")
        .select("access_token")
        .eq("user_id", context.userId)
        .maybeSingle(),
      recallIntel(context.userId, "knowledge", 5),
    ]);
    const conn = connectionResult.data;
    const ghToken = (conn as { access_token?: string } | null)?.access_token;

    // Fetch one small evidence batch only for questions that explicitly need
    // current market/options context. Tool loops were the main source of empty
    // final responses because a tool step could consume the whole turn budget.
    const needsLiveEvidence = /\b(current|latest|market|trend|competitor|startup|idea|package|library|model|dataset)\b/i.test(data.question);
    let evidence = "";
    if (needsLiveEvidence) {
      const query = data.question.slice(0, 180);
      const [reposResult, npmResult] = await Promise.allSettled([
        gh<{ items: Array<{ full_name: string; html_url: string; description: string | null; stargazers_count: number }> }>(
          `${GITHUB_API}/search/repositories?q=${encodeURIComponent(query)}&per_page=3&sort=stars`,
          ghToken,
        ),
        fetchKnowledgeSource(`https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(query)}&size=3`).then(async (res) => {
          if (!res.ok) throw new Error(`npm ${res.status}`);
          return res.json() as Promise<{ objects: Array<{ package: { name: string; description?: string; links: { npm: string } } }> }>;
        }),
      ]);
      const sources: unknown[] = [];
      if (reposResult.status === "fulfilled") sources.push(...reposResult.value.items.map((item) => ({
        kind: "repo", title: item.full_name, url: item.html_url, description: item.description, stars: item.stargazers_count,
      })));
      if (npmResult.status === "fulfilled") sources.push(...npmResult.value.objects.map((item) => ({
        kind: "package", title: item.package.name, url: item.package.links.npm, description: item.package.description,
      })));
      if (sources.length) evidence = `\n\nLive evidence (use only when relevant):\n${JSON.stringify(sources).slice(0, 5000)}`;
    }

    const anthropic = createAnthropic({ apiKey: anthropicKey });
    const claude = anthropic("claude-sonnet-4-5");

    const systemPrompt = `You are Knowledge Intelligence — a senior product engineer + market analyst + software architect combined. You transform an idea or question into a production-ready plan grounded in a structured knowledge graph.

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
- Keep the complete report concise enough to finish reliably: no section may exceed 3 list items, except resources (maximum 5) and graph nodes (maximum 10).
- Include every section relevant to the question, but omit irrelevant sections rather than filling them with generic text.
- Keep each list item to one or two sentences. Keep Mermaid diagrams small.
- Use up to 6 resources across different kinds.
- Prefer maintained, popular options (higher stars, recent activity).
- For Mermaid, no code fences and keep node labels short.
- Build the knowledge graph so the answer feels connected (Domain → Market → Competitors → Frameworks → Architecture → Security → Database → Backend → Deployment → Pricing → Growth). 8-16 nodes is a good size.`;

    const memTail = memoryPromptSuffix(memories);
    const userPrompt =
      `Question: ${data.question}` +
      (data.projectContext ? `\n\nProject context:\n${data.projectContext}` : "") +
      memTail + evidence;

    const parseReport = async (text: string): Promise<Partial<Omit<KnowledgeReport, "question">> | null> => {
      const start = text.indexOf("{");
      const end = text.lastIndexOf("}");
      if (start < 0) return null;
      const candidate = text.slice(start, end > start ? end + 1 : undefined);
      try {
        return JSON.parse(candidate) as Partial<Omit<KnowledgeReport, "question">>;
      } catch {
        const { jsonrepair } = await import("jsonrepair");
        try {
          return JSON.parse(jsonrepair(candidate)) as Partial<Omit<KnowledgeReport, "question">>;
        } catch {
          return null;
        }
      }
    };

    const generateReport = () => generateText({
      model: claude,
      system: systemPrompt,
      prompt: userPrompt,
      maxOutputTokens: 4800,
    });

    let recovered = false;
    let generation = await generateReport();
    let partial = await parseReport(generation.text);
    // One bounded recovery attempt is used only when the provider returned no
    // usable object. Normal successful requests still make exactly one call.
    if (!partial) {
      recovered = true;
      generation = await generateText({
        model: claude,
        system: `${systemPrompt}\nThe previous response was cut off. Return a shorter complete JSON object. Prioritize laymanSummary, productDiscovery, marketIntelligence, competitors, recommendedStack, nextSteps, and graph.`,
        prompt: userPrompt,
        maxOutputTokens: 3200,
      });
      partial = await parseReport(generation.text);
    }
    if (!partial) throw new Error("Knowledge analysis could not produce a complete report. Please retry.");

    if (typeof partial !== "object" || Array.isArray(partial)) {
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

    const { chargeAndRemember } = await import("./intel-memory.server");
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

    console.info("[knowledge-intel] complete", {
      durationMs: Date.now() - startedAt,
      usedLiveEvidence: needsLiveEvidence,
      recovered,
    });

    return { report };
  });
