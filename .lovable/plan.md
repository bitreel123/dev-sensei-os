# Plan

## Part 1 — Dynamic Knowledge Intelligence (main work)

Today `/api/intel/knowledge/stream` runs the same ~25 fixed sections from `KNOWLEDGE_SECTIONS` (recommendation, aiMoat, glossary, marketTiming, investorFit, founderVerdict, …) for every question. A question like "find me fintech APIs for cross-border payments" gets the same startup-founder template as "should I build X?".

Fix: replace the fixed section list with a two-phase pipeline that picks sections based on the question's intent.

### Phase A — Intent router (one small Claude Haiku call, ~1s)
Classify the question into one of these intents and extract entities:
- `api_discovery` → APIs comparison, docs, SDKs, auth, countries, pricing, sample requests, integration flow, alternatives
- `library_discovery` → package comparison table, install, code samples, tradeoffs, community/health
- `startup_idea` → current template (recommendation, market, competitors, moat, validation, verdict)
- `architecture_design` → system diagram, component breakdown, data flow, tech choices, scaling, security
- `how_to_build` → step-by-step build plan, stack, milestones, code scaffolds, gotchas
- `market_research` → market size, players, trends, segments, pricing benchmarks
- `concept_explainer` → layman explanation, glossary, analogies, examples, further reading
- `comparison` → side-by-side matrix of the named options + verdict
- `general` → conservative fallback (intro + 2-3 broadly useful sections)

Router returns `{ intent, entities, suggestedSections[] }`. Emit as first `stage` event so UI shows "Routing…".

### Phase B — Dynamic section catalog
Refactor `KNOWLEDGE_SECTIONS` in `src/lib/intel-sections.server.ts`:
- Keep each section as a spec (id, label, key, build(ctx), maxTokens) — unchanged shape.
- Add many new specs tailored to intents above. Notably:
  - `apiComparison` — returns `{ apis: [{ name, provider, countries, supports, pricing, auth, docs_url, best_for, pros, cons }] }`
  - `apiRecommendation` — "which API for which use case" grouped buckets
  - `integrationFlow` — ordered steps with purpose + sample request per step
  - `sampleCode` — auth + create-customer + create-quote + send-transfer snippets
  - `architectureDiagram` — mermaid + node explanations
  - `comparisonMatrix` — generic comparison table for any N options
  - `stepByStepBuild`, `stackChoices`, `gotchas`, `marketSizing`, `playerLandscape`, `pricingBenchmarks`, `analogies`, `furtherReading`
- Group specs by intent in an `INTENT_TO_SECTIONS` map. Order in the map = render order.

### Phase C — Route change
In `src/routes/api/intel/knowledge.stream.ts`:
1. Call intent router first (using Haiku or the same Claude, short prompt) with `question + projectContext + memory`.
2. Resolve `sectionsToRun = INTENT_TO_SECTIONS[intent]` (respect `body.only` for follow-ups on a single section).
3. Emit `{ type: "meta", intent, entities }` so UI can show the detected mode.
4. Run existing parallel Claude fanout across the chosen sections.
5. Memory payload: store `intent` alongside the report so history renders correctly.

### Phase D — UI rendering (`src/routes/chat.tsx` knowledge renderer)
- Read `intent` from meta and render sections in the order returned.
- Render new section types with proper components:
  - `apiComparison` → real table (name, countries, supports, pricing, auth, best_for, docs link)
  - `apiRecommendation` → grouped bullet buckets
  - `integrationFlow` → numbered vertical flow (arrow style)
  - `sampleCode` → syntax-highlighted code cards
  - `architectureDiagram` → mermaid render (already used in system intel) + node list
  - `comparisonMatrix` → generic table renderer
- Hide founder-only cards (moat, investorFit, founderVerdict, validationPlan) when intent isn't `startup_idea`.
- Legacy sections still render when router picks them, so nothing breaks for existing intents.

## Part 2 — Verify Screen Intelligence & billing

Quick verification, no code changes unless a bug surfaces:
1. Read `src/routes/api/intel/screen.stream.ts` + `stopRecording` flow to confirm: on `mediaRecorder.onstop` the stream POST fires immediately and NDJSON `section` events render as they arrive.
2. Confirm billing path: `chargeAndRemember` is called once in `onFinish`/after success with `sessionId`, `deduct_credit` RPC runs, balance decrements. Sanity-check on a live test after deploy for `adewaleayomide619@gmail.com`.
3. Confirm extension overlay v1.6.1 still shows "Ask Jeradin" pill on the captured tab after `stopRecording` when the extension is installed. In-Jeradin-tab overlay path (no extension) shows results inline via the existing `screen-intel-overlay` component.

If any of those three fail during verification, patch in the same pass; otherwise report "verified" with what was checked.

## Technical details

Files touched:
- `src/lib/intel-sections.server.ts` — add intent router helper `routeKnowledgeIntent()`, add new section specs, add `INTENT_TO_SECTIONS`.
- `src/routes/api/intel/knowledge.stream.ts` — call router, use dynamic section list, emit `meta` event with intent.
- `src/routes/chat.tsx` — knowledge result renderer: handle new section types, order by server, hide founder-only cards outside `startup_idea` intent.
- `src/lib/intel-shared.ts` (types) — add `KnowledgeIntent` type + new section payload types.
- `src/lib/intel-stream.ts` — extend `IntelStreamEvent` with `{ type: "meta"; intent; entities }`.

Non-goals: no changes to system/github intelligence, no changes to pricing (still 5 credits per knowledge run), no model swap.
