// Server-only helpers for streaming intelligence sections.
// Do NOT import from route files at module scope — load inside handlers.
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

// ---------- Auth (bearer token verification, mirrors requireSupabaseAuth) ----------
export async function verifyBearer(request: Request): Promise<{ userId: string; token: string }> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) throw new Error("Unauthorized");
  const token = authHeader.slice(7).trim();
  if (!token || token.split(".").length !== 3) throw new Error("Unauthorized");

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) throw new Error("Supabase env not configured");
  const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (SUPABASE_PUBLISHABLE_KEY.startsWith("sb_") && headers.get("Authorization") === `Bearer ${SUPABASE_PUBLISHABLE_KEY}`) {
          headers.delete("Authorization");
        }
        headers.set("apikey", SUPABASE_PUBLISHABLE_KEY);
        headers.set("Authorization", `Bearer ${token}`);
        return fetch(input, { ...init, headers });
      },
    },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims?.sub) throw new Error("Unauthorized");
  return { userId: String(data.claims.sub), token };
}

// ---------- NDJSON stream helper ----------
export function ndjsonStream(handler: (emit: (obj: unknown) => void) => Promise<void>) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (obj: unknown) => {
        try {
          controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
        } catch {
          /* ignore */
        }
      };
      try {
        await handler(emit);
      } catch (e) {
        emit({ type: "error", message: e instanceof Error ? e.message : String(e) });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      "x-accel-buffering": "no",
    },
  });
}

// ---------- Claude call with tight per-section JSON parsing ----------
export async function callClaudeJson<T = unknown>(opts: {
  apiKey: string;
  system: string;
  user: string;
  maxTokens?: number;
  timeoutMs?: number;
}): Promise<T> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    signal: AbortSignal.timeout(opts.timeoutMs ?? 30_000),
    headers: {
      "content-type": "application/json",
      "x-api-key": opts.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
      max_tokens: opts.maxTokens ?? 1200,
      system: opts.system,
      messages: [{ role: "user", content: opts.user }],
    }),
  });
  if (!res.ok) throw new Error(`AI ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = (await res.json()) as { content: Array<{ type: string; text?: string }> };
  const text = (json.content.find((b) => b.type === "text")?.text ?? "").trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0) throw new Error("Empty section response");
  const candidate = text.slice(start, end > start ? end + 1 : undefined);
  try {
    return JSON.parse(candidate) as T;
  } catch {
    const { jsonrepair } = await import("jsonrepair");
    return JSON.parse(jsonrepair(candidate)) as T;
  }
}

// ---------- Knowledge Intelligence section prompts ----------
// Every section is a small focused Claude call. They run in parallel and stream
// to the client one-by-one. Each returns a JSON object with a known key so we
// can assemble the report incrementally on the client.
export type KnowledgeSectionSpec = {
  id: string;
  label: string;
  key: string; // key in the final KnowledgeReport
  build: (ctx: { question: string; projectContext: string; memory: string; evidence: string }) => { system: string; user: string; maxTokens?: number };
};

const BASE_RULES = `Return STRICT JSON only. No markdown fences. No prose outside the JSON. Plain English. Keep every list to at most 4 items unless the section explicitly allows more. Keep every sentence short. Do NOT include fields you were not asked for.`;

export const KNOWLEDGE_SECTIONS: KnowledgeSectionSpec[] = [
  {
    id: "intro",
    label: "Understanding your idea",
    key: "intro",
    build: ({ question, projectContext, memory }) => ({
      system: `You are Knowledge Intelligence. ${BASE_RULES}\nReturn: { "laymanSummary": string (2 short paragraphs, plain English), "recommendedStack": string[] (max 8), "glossary": [{"term":string,"meaning":string}] (max 5), "nextSteps": string[] (max 5) }`,
      user: `Question: ${question}${projectContext ? `\n\nProject context: ${projectContext}` : ""}${memory}`,
      maxTokens: 900,
    }),
  },
  {
    id: "productDiscovery",
    label: "Product Discovery",
    key: "productDiscovery",
    build: ({ question, projectContext, memory }) => ({
      system: `You are a senior product manager. ${BASE_RULES}\nReturn: { "productDiscovery": { "clarifyingQuestions": string[] (4-6), "vision": string, "targetUsers": string[] (max 4), "problem": string, "solution": string, "businessModel": string, "mvpRoadmap": string[] (4-6) } }`,
      user: `Question: ${question}${projectContext ? `\n\nContext: ${projectContext}` : ""}${memory}`,
      maxTokens: 900,
    }),
  },
  {
    id: "marketIntelligence",
    label: "Market Research",
    key: "marketIntelligence",
    build: ({ question, evidence, memory }) => ({
      system: `You are a market analyst. ${BASE_RULES}\nReturn: { "marketIntelligence": { "trends": string[] (3-5), "unsolvedProblems": string[] (3-5), "sources": [{"title":string,"url":string,"kind":string}] (max 5) } }`,
      user: `Question: ${question}${evidence}${memory}\nGround "sources" only in the provided evidence when possible.`,
      maxTokens: 800,
    }),
  },
  {
    id: "competitors",
    label: "Competitors",
    key: "competitors",
    build: ({ question, evidence, memory }) => ({
      system: `You are a competitive analyst. ${BASE_RULES}\nReturn: { "competitors": [{"name":string,"url":string|null,"positioning":string,"strengths":string[] (max 3),"weaknesses":string[] (max 3),"pricing":string|null,"gap":string}] (3-5 entries) }`,
      user: `Question: ${question}${evidence}${memory}`,
      maxTokens: 900,
    }),
  },
  {
    id: "architecture",
    label: "Architecture",
    key: "architecture",
    build: ({ question, projectContext }) => ({
      system: `You are a software architect. ${BASE_RULES}\nReturn: { "architecture": { "folderStructure": string (ascii tree, short), "repoLayout": string, "databaseSchema": string, "apiStyle": string, "monolithVsMicroservices": string, "auth": string, "queues": string, "caching": string, "deployment": string, "mermaid": string (small mermaid graph TD, no code fences) } }`,
      user: `Question: ${question}${projectContext ? `\n\nContext: ${projectContext}` : ""}`,
      maxTokens: 1000,
    }),
  },
  {
    id: "technologyChoices",
    label: "Technology choices",
    key: "technologyChoices",
    build: ({ question, projectContext }) => ({
      system: `You are a staff engineer. ${BASE_RULES}\nReturn: { "technologyChoices": [{"choice":string,"why":string (1 short sentence),"alternatives":string[] (max 3),"tradeoffs":string}] (4-6 entries) }`,
      user: `Question: ${question}${projectContext ? `\n\nContext: ${projectContext}` : ""}`,
      maxTokens: 800,
    }),
  },
  {
    id: "security",
    label: "Security",
    key: "security",
    build: ({ question }) => ({
      system: `You are a security engineer. ${BASE_RULES}\nReturn: { "security": { "recommendations": [{"title":string,"why":string}] (3-5), "compliance": string[] (max 4) } }`,
      user: `Question: ${question}`,
      maxTokens: 600,
    }),
  },
  {
    id: "systemDesign",
    label: "System Design diagrams",
    key: "systemDesign",
    build: ({ question }) => ({
      system: `You are a distributed-systems engineer. ${BASE_RULES}\nEvery diagram field must be VALID mermaid, no code fences, small labels.\nReturn: { "systemDesign": { "sequence": string (sequenceDiagram), "er": string (erDiagram), "dataflow": string (flowchart LR), "services": string (graph LR) } }`,
      user: `Question: ${question}`,
      maxTokens: 900,
    }),
  },
  {
    id: "developmentPlan",
    label: "Development plan",
    key: "developmentPlan",
    build: ({ question }) => ({
      system: `You are a senior tech lead. ${BASE_RULES}\nReturn: { "developmentPlan": { "weeks": [{"label":string,"goals":string[] (2-4)}] (4-6 weeks), "milestones": string[] (3-5), "testing": string, "deployment": string } }`,
      user: `Question: ${question}`,
      maxTokens: 800,
    }),
  },
  {
    id: "learning",
    label: "Explainer",
    key: "learning",
    build: ({ question }) => ({
      system: `You are a patient teacher. ${BASE_RULES}\nOnly emit meaningful values when the question is an "explain X" style question; otherwise return short placeholders.\nReturn: { "learning": { "technical": string, "layman": string, "whenToUse": string[] (max 3), "whenNotToUse": string[] (max 3), "example": string } }`,
      user: `Question: ${question}`,
      maxTokens: 600,
    }),
  },
  {
    id: "launch",
    label: "Launch",
    key: "launch",
    build: ({ question }) => ({
      system: `You are a launch and growth expert. ${BASE_RULES}\nReturn: { "launch": { "analytics": string[] (max 4), "monitoring": string[] (max 4), "cicd": string[] (max 4), "featureFlags": string, "pricingIdeas": string[] (max 4), "betaStrategy": string, "growthExperiments": string[] (max 4), "checklist": string[] (4-6) } }`,
      user: `Question: ${question}`,
      maxTokens: 900,
    }),
  },
  {
    id: "resources",
    label: "Resources",
    key: "resources",
    build: ({ question, evidence }) => ({
      system: `You curate developer resources. ${BASE_RULES}\nReturn: { "resources": [{"kind":"repo"|"api"|"dataset"|"model"|"framework"|"package"|"article","title":string,"url":string,"why":string (1 sentence),"stars":number|null,"tags":string[] (max 3)}] (4-6 entries) }`,
      user: `Question: ${question}${evidence}\nPrefer real, popular projects. Use evidence URLs when provided.`,
      maxTokens: 800,
    }),
  },
  {
    id: "graph",
    label: "Knowledge graph",
    key: "graph",
    build: ({ question }) => ({
      system: `You build a knowledge graph. ${BASE_RULES}\nReturn: { "graph": { "nodes": [{"id":string,"label":string,"category":"domain"|"market"|"competitor"|"framework"|"architecture"|"security"|"database"|"backend"|"deployment"|"pricing"|"growth"}] (8-12 nodes), "edges": [{"from":string,"to":string,"relation":string}] (8-16 edges) }\nNode ids must be short lowercase-hyphenated slugs; edges reference existing ids.`,
      user: `Question: ${question}`,
      maxTokens: 800,
    }),
  },
];
