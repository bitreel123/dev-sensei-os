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
    id: "recommendation",
    label: "Top Recommendation",
    key: "recommendation",
    build: ({ question, projectContext, memory, evidence }) => ({
      system: `You are a senior YC-partner-style advisor. Do NOT list many ideas. PICK ONE.
${BASE_RULES}
Even when the user asks for a list (e.g. "give me 10 fintech startup ideas"), CHOOSE the single best one to build right now based on market demand, competition, capital needs, and speed to MVP. Runners-up go in "alternatives" with a one-sentence reason we did not pick each. Be opinionated. Sound like a founder-coach, not an encyclopedia.
Return: { "recommendation": {
  "headline": string (format "Build: <product> for <who>"),
  "opinion": string (2-3 sentences, opinionated advisor tone — starts with "I recommend..." or "Build this because..."),
  "confidence": number (0-10, one decimal allowed — your honest confidence),
  "confidenceReasons": [{"factor": string (e.g. "Market demand", "Competition", "Technical difficulty", "Founder fit", "Revenue potential"), "verdict": string ("High"|"Medium"|"Low"|"Unknown")}] (5-6 factors),
  "whyPicked": string[] (5-6 short bullets — the exact reasons Jeradin chose this over alternatives, e.g. "Growing 42% yearly", "Low startup capital", "First revenue in 2 weeks"),
  "whyNow": string[] (3-5 short bullets — trends, funding, demand, gaps),
  "whyNot": [{"idea": string, "reasons": string[] (2-4 short bullets)}] (2-3 ideas we explicitly REJECTED with concrete reasons — e.g. "Don't build another food delivery app: CAC extremely high, Dominated by incumbents"),
  "timeToMvp": string (e.g. "4-6 weeks"),
  "revenuePotential": string (e.g. "$$$ — $10-50k MRR in 6 months if X"),
  "scores": { "marketScore": number(0-10), "competitionScore": number(0-10, higher=more crowded), "difficulty": number(0-10), "capitalNeeded": number(0-10), "aiPotential": number(0-10), "speedToMvp": number(0-10, higher=faster), "pmfChance": number(0-10), "fundingChance": number(0-10), "globalScale": number(0-10) },
  "alternatives": [{"name": string, "reasonToPass": string}] (2-4 other ideas we considered and passed on)
} }`,
      user: `Question: ${question}${projectContext ? `\n\nContext: ${projectContext}` : ""}${evidence}${memory}`,
      maxTokens: 1400,
    }),
  },
  {
    id: "aiMoat",
    label: "AI Moat",
    key: "aiMoat",
    build: ({ question, memory }) => ({
      system: `You explain WHY AI makes the recommended idea defensible. ${BASE_RULES}
Return: { "aiMoat": {
  "rating": number (0-5, integer, how strong the moat is),
  "headline": string (one short sentence),
  "reasons": string[] (3-5 short "Hard to copy because ..." bullets — data flywheel, domain-tuned model, feedback loops, proprietary integrations, etc.),
  "dataFlywheel": string (1 short sentence describing the data → model → product loop)
} }`,
      user: `Question: ${question}${memory}`,
      maxTokens: 500,
    }),
  },
  {
    id: "marketValidation",
    label: "Market Validation",
    key: "marketValidation",
    build: ({ question, evidence, memory }) => ({
      system: `You collect market-validation signals. ${BASE_RULES}
Prefer concrete, quantitative signals over vague claims. Only cite figures you can support from the evidence or well-known public knowledge.
Return: { "marketValidation": {
  "signals": [{"label": string (e.g. "YC funded 8 startups here", "$500M invested last year", "Google search trend rising", "Reddit complaints increasing", "Enterprise demand growing"), "detail": string (optional, one short line)}] (5-8 signals),
  "evidenceScore": number (0-100, how strong the aggregate evidence is)
} }`,
      user: `Question: ${question}${evidence}${memory}`,
      maxTokens: 600,
    }),
  },

  {
    id: "intro",
    label: "Understanding your idea",
    key: "intro",
    build: ({ question, projectContext, memory }) => ({
      system: `You are Knowledge Intelligence. ${BASE_RULES}\nReturn: { "laymanSummary": string (2 short paragraphs, plain English, references the top recommendation naturally), "recommendedStack": string[] (max 8), "glossary": [{"term":string,"meaning":string}] (max 5), "nextSteps": string[] (max 5) }`,
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
    id: "founderKit",
    label: "Founder Kit",
    key: "founderKit",
    build: ({ question, projectContext, memory }) => ({
      system: `You are McKinsey + YC Partner + Product Manager combined. ${BASE_RULES}
Produce a founder-ready operating kit for the recommended idea. Numbers are estimates but must be plausible — cite the assumption in the "assumptions" field.
Return: { "founderKit": {
  "businessModelCanvas": { "customerSegments": string[] (max 4), "valuePropositions": string[] (max 4), "channels": string[] (max 4), "customerRelationships": string[] (max 3), "revenueStreams": string[] (max 4), "keyResources": string[] (max 4), "keyActivities": string[] (max 4), "keyPartners": string[] (max 3), "costStructure": string[] (max 4) },
  "goToMarket": [{"phase":string,"playbook":string,"targets":string[] (max 3)}] (3 phases: launch / growth / scale),
  "pricingStrategy": { "model": string, "tiers": [{"name":string,"price":string,"includes":string[] (max 4)}] (2-3 tiers), "rationale": string },
  "tamSamSom": { "tam": string, "sam": string, "som": string, "assumptions": string[] (max 4) },
  "investorReadiness": { "score": number (0-100), "checklist": [{"item":string,"done":boolean}] (5-7), "missing": string[] (max 5) },
  "risksAndAssumptions": [{"risk":string,"assumption":string,"mitigation":string}] (3-5)
} }`,
      user: `Question: ${question}${projectContext ? `\n\nContext: ${projectContext}` : ""}${memory}`,
      maxTokens: 1400,
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
  {
    id: "marketTiming",
    label: "Market Timing",
    key: "marketTiming",
    build: ({ question, evidence, memory }) => ({
      system: `You judge market timing. ${BASE_RULES}
Return: { "marketTiming": { "rating": number (0-5), "verdict": string (one of "Hot" | "Warming" | "Neutral" | "Cooling"), "reasons": string[] (3-6 short reasons — AI adoption, regulation, funding, customer demand, etc.) } }`,
      user: `Question: ${question}${evidence}${memory}`,
      maxTokens: 400,
    }),
  },
  {
    id: "buildDifficulty",
    label: "Build Difficulty",
    key: "buildDifficulty",
    build: ({ question }) => ({
      system: `You judge whether a solo founder can build this. ${BASE_RULES}
Return: { "buildDifficulty": { "soloFounder": boolean, "requires": string[] (3-6 e.g. "Backend","AI","Mobile","Security","DevOps"), "estimatedMonths": string (e.g. "8 months"), "estimatedEngineers": string (e.g. "2 engineers"), "summary": string (1 short sentence) } }`,
      user: `Question: ${question}`,
      maxTokens: 400,
    }),
  },
  {
    id: "moatSuggestions",
    label: "Possible Moats",
    key: "moatSuggestions",
    build: ({ question }) => ({
      system: `You suggest defensibility moats. ${BASE_RULES}
Return: { "moatSuggestions": { "moats": [{"name": string (e.g. "Proprietary dataset","AI memory","Workflow automation","Community","Marketplace","Network effects","Brand","Integrations","Compliance"), "note": string (one short sentence)}] (4-7 items) } }`,
      user: `Question: ${question}`,
      maxTokens: 500,
    }),
  },
  {
    id: "customerAcquisition",
    label: "Customer Acquisition",
    key: "customerAcquisition",
    build: ({ question }) => ({
      system: `You are a growth marketer. ${BASE_RULES}
Return: { "customerAcquisition": { "first100Channels": string[] (5-7 concrete channels — Reddit, LinkedIn, Cold email, Product Hunt, HN, communities, SEO), "expectedCac": string (e.g. "$8-25"), "expectedConversion": string (e.g. "3-6%"), "playbook": string (1-2 sentences, the first-90-days move) } }`,
      user: `Question: ${question}`,
      maxTokens: 400,
    }),
  },
  {
    id: "investorFit",
    label: "Investor Fit",
    key: "investorFit",
    build: ({ question }) => ({
      system: `You rate investor readiness. ${BASE_RULES}
Return: { "investorFit": { "vc": number (0-5), "bootstrap": number (0-5), "yc": number (0-5), "seriesA": number (0-5), "notes": string (1 short sentence) } }`,
      user: `Question: ${question}`,
      maxTokens: 300,
    }),
  },
  {
    id: "biggestRisks",
    label: "Biggest Risks",
    key: "biggestRisks",
    build: ({ question }) => ({
      system: `You honestly list the biggest risks. ${BASE_RULES}
Return: { "biggestRisks": { "risks": [{"label": string (short — e.g. "Regulation","Customer acquisition","Low margins","Existing competitors","Technical complexity"), "detail": string (one short sentence), "severity": "high"|"medium"|"low"}] (4-6 items) } }`,
      user: `Question: ${question}`,
      maxTokens: 500,
    }),
  },
  {
    id: "validationPlan",
    label: "Validate in 7 Days",
    key: "validationPlan",
    build: ({ question }) => ({
      system: `You design a 7-day validation plan. ${BASE_RULES}
Return: { "validationPlan": { "days": [{"day": number (1-7), "task": string (one imperative sentence — Day 1 Landing page, Day 2 Interview 20 users, etc.)}] (exactly 7 entries), "decisionCriteria": string (1 short sentence — what "go/no-go" means on Day 7) } }`,
      user: `Question: ${question}`,
      maxTokens: 500,
    }),
  },
  {
    id: "successProbability",
    label: "Success Probability",
    key: "successProbability",
    build: ({ question }) => ({
      system: `You estimate probability of success. Be honest and calibrated. ${BASE_RULES}
Return: { "successProbability": { "first1kMrr": number (0-100), "tenKMrr": number (0-100), "vcFunding": number (0-100), "bootstrapSuccess": number (0-100), "basis": string[] (3-5 — competition, capital, complexity, founder profile, market demand), "disclaimer": string (one short sentence: "These are estimates, not predictions.") } }`,
      user: `Question: ${question}`,
      maxTokens: 350,
    }),
  },
  {
    id: "founderVerdict",
    label: "What Jeradin Would Build",
    key: "founderVerdict",
    build: ({ question, memory }) => ({
      system: `You are the closing voice — a seasoned founder giving a personal verdict. ${BASE_RULES}
Return: { "founderVerdict": { "ifIWereYou": string (starts with "If I were starting today with one engineer and less than $10,000, I would..." — 1-2 sentences), "buildThis": string (1 short sentence — the exact product), "because": string[] (3-5 short bullets — fastest path to revenue, strong AI moat, low competition, etc.) } }`,
      user: `Question: ${question}${memory}`,
      maxTokens: 500,
    }),
  },
];

// ---------------- System Intelligence section prompts ----------------
export type SystemSectionSpec = {
  id: string;
  label: string;
  build: (ctx: { filesBlock: string; hint: string }) => { system: string; user: string; maxTokens?: number };
  extract: (parsed: Record<string, unknown>) => Record<string, unknown>;
};

const SYSTEM_BASE = `Return STRICT JSON only. No markdown fences. No prose outside the JSON. Plain English throughout. Assume a smart but non-deeply-technical reader. Never rewrite code — describe changes in prose.`;

export const SYSTEM_SECTIONS: SystemSectionSpec[] = [
  {
    id: "overview",
    label: "Understanding the project",
    build: ({ filesBlock, hint }) => ({
      system: `You are a senior staff engineer. ${SYSTEM_BASE}\nReturn: { "projectSummary": string (1-2 sentences, layman), "stack": string[] (max 10), "laymanOverview": string (1-2 short paragraphs) }`,
      user: `${hint ? `Developer note: ${hint}\n\n` : ""}Files:\n\n${filesBlock}`,
      maxTokens: 700,
    }),
    extract: (p) => ({
      projectSummary: p.projectSummary ?? "",
      stack: p.stack ?? [],
      laymanOverview: p.laymanOverview ?? "",
    }),
  },
  {
    id: "modules",
    label: "Modules & dependencies",
    build: ({ filesBlock, hint }) => ({
      system: `You are a senior staff engineer. ${SYSTEM_BASE}\nReturn: { "modules": [{"name": string, "path": string, "role": string (1 line, plain English), "keyExports": string[] (max 4), "dependsOn": string[] (max 5)}] (5-10 entries max), "mermaid": string (small \`graph TD\` diagram, no code fences, max ~12 nodes) }`,
      user: `${hint ? `Developer note: ${hint}\n\n` : ""}Files:\n\n${filesBlock}`,
      maxTokens: 1200,
    }),
    extract: (p) => ({ modules: p.modules ?? [], mermaid: p.mermaid ?? "" }),
  },
  {
    id: "suggestions",
    label: "Suggestions",
    build: ({ filesBlock, hint }) => ({
      system: `You are a senior code reviewer. ${SYSTEM_BASE}\nDo NOT rewrite code. Only describe changes in prose.\nReturn: { "suggestions": [{"file": string, "line": number|null, "title": string, "problem": string, "suggestion": string, "priority": "high"|"medium"|"low"}] (6-10 entries) }`,
      user: `${hint ? `Developer note: ${hint}\n\n` : ""}Files:\n\n${filesBlock}`,
      maxTokens: 1400,
    }),
    extract: (p) => ({ suggestions: p.suggestions ?? [] }),
  },
  {
    id: "references",
    label: "Reference projects",
    build: ({ filesBlock, hint }) => ({
      system: `You curate reference resources. ${SYSTEM_BASE}\nReturn: { "references": [{"kind":"repo"|"code"|"api","title":string,"url":string,"why":string (1 sentence)}] (3-5 entries) }`,
      user: `${hint ? `Developer note: ${hint}\n\n` : ""}Given this project, list 3-5 well-known real reference repos or APIs that would help this developer learn from similar work. Files:\n\n${filesBlock.slice(0, 30_000)}`,
      maxTokens: 500,
    }),
    extract: (p) => ({ references: p.references ?? [] }),
  },
  {
    id: "codeHealth",
    label: "Code Health Score",
    build: ({ filesBlock, hint }) => ({
      system: `You are a staff engineer scoring project health. ${SYSTEM_BASE}
Return: { "codeHealth": { "architecture": number(0-10), "security": number(0-10), "performance": number(0-10), "scalability": number(0-10), "maintainability": number(0-10), "technicalDebt": number(0-10, lower=worse debt), "developerDx": number(0-10), "documentation": number(0-10), "overall": number(0-10, one decimal ok) } }`,
      user: `${hint ? `Note: ${hint}\n\n` : ""}Files:\n\n${filesBlock}`,
      maxTokens: 400,
    }),
    extract: (p) => ({ codeHealth: p.codeHealth ?? null }),
  },
  {
    id: "technicalDebt",
    label: "Technical Debt",
    build: ({ filesBlock, hint }) => ({
      system: `You audit technical debt. ${SYSTEM_BASE}
Return: { "technicalDebt": { "level": "high"|"medium"|"low", "items": string[] (5-8 concrete debts — e.g. "duplicated auth logic","17 unused components","dead APIs","circular dependency","large component"), "estimatedCleanup": string (e.g. "3 days") } }`,
      user: `${hint ? `Note: ${hint}\n\n` : ""}Files:\n\n${filesBlock}`,
      maxTokens: 700,
    }),
    extract: (p) => ({ technicalDebt: p.technicalDebt ?? null }),
  },
  {
    id: "complexity",
    label: "Complexity Heatmap",
    build: ({ filesBlock, hint }) => ({
      system: `You map complexity per area and per file. ${SYSTEM_BASE}
Return: { "complexity": { "files": [{"path": string, "lines": number, "complexity": number (0-100), "needsRefactor": boolean, "note": string}] (5-8 most complex files), "heatmap": [{"area": string (short — Auth, API, Dashboard, Utils, etc.), "score": number (0-10)}] (5-8 areas) } }`,
      user: `${hint ? `Note: ${hint}\n\n` : ""}Files:\n\n${filesBlock}`,
      maxTokens: 900,
    }),
    extract: (p) => ({ complexity: p.complexity ?? null }),
  },
  {
    id: "onboarding",
    label: "New Developer Guide",
    build: ({ filesBlock, hint }) => ({
      system: `You write onboarding docs. "If I join this company today, what do I read first?" ${SYSTEM_BASE}
Return: { "onboarding": { "filesToRead": [{"path": string, "why": string (one short sentence)}] (4-6 entries — ordered), "estimatedMinutes": number, "tips": string[] (2-4) } }`,
      user: `${hint ? `Note: ${hint}\n\n` : ""}Files:\n\n${filesBlock}`,
      maxTokens: 600,
    }),
    extract: (p) => ({ onboarding: p.onboarding ?? null }),
  },
  {
    id: "businessLogic",
    label: "Business Logic Graph",
    build: ({ filesBlock, hint }) => ({
      system: `You describe what the application actually DOES as a user-flow chain. ${SYSTEM_BASE}
Return: { "businessLogic": { "steps": string[] (6-12 ordered short steps — e.g. "User", "Connect Wallet", "Verify Ownership", "Register Agent", "Save on Sui") } }`,
      user: `${hint ? `Note: ${hint}\n\n` : ""}Files:\n\n${filesBlock}`,
      maxTokens: 500,
    }),
    extract: (p) => ({ businessLogic: p.businessLogic ?? null }),
  },
  {
    id: "refactorPlan",
    label: "Refactor Plan",
    build: ({ filesBlock, hint }) => ({
      system: `You are an engineering lead. Give an actionable refactor plan. ${SYSTEM_BASE}
Return: { "refactorPlan": { "steps": [{"title": string (short — e.g. "Lazy load ThreeScene"), "impact": "very high"|"high"|"medium"|"low", "time": string (e.g. "10 mins")}] (4-7 steps) } }`,
      user: `${hint ? `Note: ${hint}\n\n` : ""}Files:\n\n${filesBlock}`,
      maxTokens: 600,
    }),
    extract: (p) => ({ refactorPlan: p.refactorPlan ?? null }),
  },
  {
    id: "followUps",
    label: "Ask Follow-up",
    build: ({ hint }) => ({
      system: `Suggest 6-10 one-click follow-up questions a developer would ask about this project. ${SYSTEM_BASE}
Return: { "followUps": { "suggestions": string[] (6-10 short prompts — e.g. "Explain Dashboard","Find security issues","Show data flow","Generate tests","Explain like I'm 12") } }`,
      user: `${hint ? `Note: ${hint}` : "General project"}`,
      maxTokens: 400,
    }),
    extract: (p) => ({ followUps: p.followUps ?? null }),
  },
  {
    id: "riskAnalysis",
    label: "Risk Analysis",
    build: ({ filesBlock, hint }) => ({
      system: `You are a senior staff engineer thinking like a production reviewer. ${SYSTEM_BASE}
Return: { "riskAnalysis": { "deploymentRisks": [{"area": string, "level":"high"|"medium"|"low", "note": string}] (3-5), "productionReadiness": number (0-100), "whatBreaksFirst": string (1 sentence), "wontScale": string (1 sentence), "bottlenecks": string[] (2-4), "overengineered": string[] (0-3), "missingBeforeProd": string[] (2-5) } }`,
      user: `${hint ? `Note: ${hint}\n\n` : ""}Files:\n\n${filesBlock}`,
      maxTokens: 900,
    }),
    extract: (p) => ({ riskAnalysis: p.riskAnalysis ?? null }),
  },
];

// ---------------- GitHub / Repo Intelligence section prompts ----------------
export type GithubEvidence = {
  repo: string;
  focus: string;
  meta: unknown;
  commits: unknown;
  pulls: unknown;
  issues: unknown;
  branches: unknown;
  releases: unknown;
  contributors: unknown;
  dependencies: unknown;
};

export type GithubSectionSpec = {
  id: string;
  label: string;
  build: (evidence: GithubEvidence, memory: string) => { system: string; user: string; maxTokens?: number };
  extract: (parsed: Record<string, unknown>) => Record<string, unknown>;
};

const GH_BASE = `Return STRICT JSON only. No markdown fences. No prose outside the JSON. Plain English throughout. Every finding must be traceable to real evidence — never invent SHAs, PR numbers or dep versions you did not see.`;

function evidencePayload(e: GithubEvidence): string {
  return JSON.stringify(
    {
      repo: e.repo,
      focus: e.focus,
      meta: e.meta,
      commits: e.commits,
      pulls: e.pulls,
      issues: e.issues,
      branches: e.branches,
      releases: e.releases,
      contributors: e.contributors,
      dependencies: e.dependencies,
    },
    null,
    0,
  ).slice(0, 45_000);
}

export const GITHUB_SECTIONS: GithubSectionSpec[] = [
  {
    id: "overview",
    label: "Repository overview & health",
    build: (e, memory) => ({
      system: `You are a senior engineer auditing a repo. ${GH_BASE}\nReturn: { "summary": string (2 short paragraphs, layman), "activityScore": number (0-100), "dependencyNotes": [{"name":string,"version":string,"note":string}] (3-6 items), "glossary": [{"term":string,"meaning":string}] (max 5), "health": {"overall":number,"commits":"healthy"|"needs attention"|"poor","reviews":"healthy"|"needs attention"|"poor","testing":"healthy"|"needs attention"|"poor","security":"healthy"|"needs attention"|"poor","documentation":"healthy"|"needs attention"|"poor"} }`,
      user: `Repository evidence:\n${evidencePayload(e)}${memory}`,
      maxTokens: 1100,
    }),
    extract: (p) => ({
      summary: p.summary ?? "",
      activityScore: p.activityScore ?? 0,
      dependencyNotes: p.dependencyNotes ?? [],
      glossary: p.glossary ?? [],
      health: p.health ?? null,
    }),
  },
  {
    id: "risks",
    label: "Risks, opportunities & patterns",
    build: (e, memory) => ({
      system: `You are a senior code reviewer. ${GH_BASE}\nReturn: { "risks": [{"severity":"high"|"medium"|"low","title":string,"detail":string,"where":string|null}] (3-6), "opportunities": [{"title":string,"detail":string,"effort":"small"|"medium"|"large"}] (3-6), "patterns": [{"name":string,"description":string,"examples":string[] (max 3)}] (2-4) }`,
      user: `Repository evidence:\n${evidencePayload(e)}${memory}`,
      maxTokens: 1200,
    }),
    extract: (p) => ({
      risks: p.risks ?? [],
      opportunities: p.opportunities ?? [],
      patterns: p.patterns ?? [],
    }),
  },
  {
    id: "commits",
    label: "Commit intelligence",
    build: (e, memory) => ({
      system: `You interpret git history. ${GH_BASE}\nReturn: { "commitIntel": [{"sha":string,"title":string,"what":string,"why":string,"risk":"high"|"medium"|"low","files":string[],"breaking":boolean,"date":string|null,"author":string|null}] (4-8 most meaningful — pick the ones that matter, not just newest) }\nOnly use commit SHAs you see in the evidence.`,
      user: `Repository evidence:\n${evidencePayload(e)}${memory}`,
      maxTokens: 1200,
    }),
    extract: (p) => ({ commitIntel: p.commitIntel ?? [] }),
  },
  {
    id: "prs",
    label: "Pull request intelligence",
    build: (e, memory) => ({
      system: `You review pull requests. ${GH_BASE}\nReturn: { "prIntel": [{"number":number,"title":string,"purpose":string,"architectureImpact":string,"risks":string[] (max 3),"reviewSuggestions":string[] (max 3),"missingTests":boolean,"author":string|null,"url":string|null}] (3-6 notable PRs) }\nOnly use PR numbers you see in the evidence.`,
      user: `Repository evidence:\n${evidencePayload(e)}${memory}`,
      maxTokens: 1100,
    }),
    extract: (p) => ({ prIntel: p.prIntel ?? [] }),
  },
  {
    id: "evolution",
    label: "Evolution & regression",
    build: (e, memory) => ({
      system: `You trace how a repo evolved. ${GH_BASE}\nReturn: { "evolution": [{"topic":string,"timeline":[{"version":string,"change":string,"when":string|null}] (2-5 steps)}] (1-3 topics), "regression": {"description":string,"likelyCommit":string|null,"files":string[],"confidence":number (0-100),"reasoning":string}|null }\nOnly return "regression" when the evidence supports one.`,
      user: `Repository evidence:\n${evidencePayload(e)}${memory}`,
      maxTokens: 900,
    }),
    extract: (p) => ({ evolution: p.evolution ?? [], regression: p.regression ?? null }),
  },
  {
    id: "team",
    label: "Contributors, branches & releases",
    build: (e, memory) => ({
      system: `You map team ownership. ${GH_BASE}\nReturn: { "contributors": [{"area":string,"owner":string,"share":string}] (3-6), "branches": [{"branch":string,"vs":string,"summary":string,"differences":string[] (max 3)}] (0-3 — only if compare data supports), "releases": [{"version":string,"newApis":number,"breakingChanges":number,"databaseChanges":number,"migrationRequired":boolean,"risk":"high"|"medium"|"low","notes":string}] (0-5) }`,
      user: `Repository evidence:\n${evidencePayload(e)}${memory}`,
      maxTokens: 900,
    }),
    extract: (p) => ({
      contributors: p.contributors ?? [],
      branches: p.branches ?? [],
      releases: p.releases ?? [],
    }),
  },
  {
    id: "history",
    label: "Historical Q&A + memory",
    build: (e, memory) => ({
      system: `You produce durable knowledge about a repo. ${GH_BASE}\nReturn: { "historical": [{"question":string,"answer":string,"commit":string|null,"pr":string|null,"date":string|null,"reason":string|null}] (0-3), "memory": string[] (3-6 durable notes about WHY the repo looks like this) }`,
      user: `Repository evidence:\n${evidencePayload(e)}${memory}`,
      maxTokens: 700,
    }),
    extract: (p) => ({ historical: p.historical ?? [], memory: p.memory ?? [] }),
  },
];

// ---------------- GitHub evidence gatherer ----------------
const GH_API = "https://api.github.com";
async function ghGet<T>(path: string, token: string, timeoutMs = 5000): Promise<T | null> {
  try {
    const res = await fetch(`${GH_API}${path}`, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "jeradin-app",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}
async function ghRawFile(owner: string, repo: string, branch: string, path: string, token: string, timeoutMs = 5000): Promise<string | null> {
  try {
    const res = await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

export async function gatherGithubEvidence(
  owner: string,
  repoName: string,
  ghToken: string,
  focus: string,
): Promise<GithubEvidence> {
  const meta = await ghGet<{
    default_branch: string;
    stargazers_count: number;
    forks_count: number;
    open_issues_count: number;
    pushed_at: string;
    language: string | null;
    description: string | null;
  }>(`/repos/${owner}/${repoName}`, ghToken);
  const branch = meta?.default_branch ?? "main";

  const [commits, pulls, issues, branches, releases, contributors, pkg, req, cargo, gomod, pyproject] = await Promise.all([
    ghGet<Array<{ sha: string; commit: { message: string; author: { name: string; date: string } }; html_url: string }>>(
      `/repos/${owner}/${repoName}/commits?per_page=20`,
      ghToken,
    ),
    ghGet<Array<{ number: number; title: string; state: string; user: { login: string }; merged_at: string | null; created_at: string; html_url: string }>>(
      `/repos/${owner}/${repoName}/pulls?state=all&per_page=15&sort=updated&direction=desc`,
      ghToken,
    ),
    ghGet<Array<{ number: number; title: string; user: { login: string }; created_at: string; html_url: string; pull_request?: unknown; labels: Array<{ name: string }> }>>(
      `/repos/${owner}/${repoName}/issues?state=open&per_page=15`,
      ghToken,
    ),
    ghGet<Array<{ name: string; commit: { sha: string } }>>(`/repos/${owner}/${repoName}/branches?per_page=20`, ghToken),
    ghGet<Array<{ tag_name: string; name: string; published_at: string; body: string; html_url: string }>>(
      `/repos/${owner}/${repoName}/releases?per_page=10`,
      ghToken,
    ),
    ghGet<Array<{ login: string; contributions: number }>>(`/repos/${owner}/${repoName}/contributors?per_page=15`, ghToken),
    ghRawFile(owner, repoName, branch, "package.json", ghToken),
    ghRawFile(owner, repoName, branch, "requirements.txt", ghToken),
    ghRawFile(owner, repoName, branch, "Cargo.toml", ghToken),
    ghRawFile(owner, repoName, branch, "go.mod", ghToken),
    ghRawFile(owner, repoName, branch, "pyproject.toml", ghToken),
  ]);

  const dependencies: Record<string, string> = {};
  if (pkg) dependencies["package.json"] = pkg.slice(0, 4000);
  if (req) dependencies["requirements.txt"] = req.slice(0, 2000);
  if (cargo) dependencies["Cargo.toml"] = cargo.slice(0, 2000);
  if (gomod) dependencies["go.mod"] = gomod.slice(0, 2000);
  if (pyproject) dependencies["pyproject.toml"] = pyproject.slice(0, 2000);

  return {
    repo: `${owner}/${repoName}`,
    focus,
    meta,
    commits: (commits ?? []).map((c) => ({
      sha: c.sha.slice(0, 7),
      message: c.commit.message.split("\n")[0].slice(0, 160),
      author: c.commit.author?.name,
      date: c.commit.author?.date,
      url: c.html_url,
    })),
    pulls: (pulls ?? []).map((p) => ({
      number: p.number,
      title: p.title,
      state: p.state,
      merged: !!p.merged_at,
      author: p.user?.login,
      url: p.html_url,
      created: p.created_at,
    })),
    issues: (issues ?? [])
      .filter((i) => !i.pull_request)
      .map((i) => ({ number: i.number, title: i.title, author: i.user?.login, labels: i.labels.map((l) => l.name), url: i.html_url })),
    branches: (branches ?? []).map((b) => ({ name: b.name, sha: b.commit.sha.slice(0, 7) })),
    releases: (releases ?? []).map((r) => ({ tag: r.tag_name, name: r.name, published: r.published_at, notes: (r.body ?? "").slice(0, 1200), url: r.html_url })),
    contributors: (contributors ?? []).map((c) => ({ login: c.login, commits: c.contributions })),
    dependencies,
  };
}
