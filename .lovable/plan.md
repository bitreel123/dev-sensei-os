## Goal

Stop buffering full intelligence reports. Stream each section (Product Discovery, Market Research, Competitors, Architecture, Technology, Security, Development Plan, Learning, Launch, Knowledge Graph) independently, render as soon as ready, keep completed sections visible if one fails, and allow retrying only the failed section. Apply the same to System Intelligence (repo index → graph → deps → report) and GitHub/Repo Intelligence.

## Architecture

Replace single `createServerFn` "give me the whole report" with a streaming HTTP route per intelligence, emitting NDJSON events over a `ReadableStream`. Client consumes with `fetch` + `getReader()` and updates React state per event.

### New server routes (raw HTTP, streaming)

- `src/routes/api/intel/knowledge.stream.ts`
- `src/routes/api/intel/system.stream.ts`
- `src/routes/api/intel/github.stream.ts`

Each route:
1. Auth via Supabase bearer token (reuse `requireSupabaseAuth` pattern manually or via helper).
2. Assert credits up front.
3. Return `new Response(stream, { headers: { 'content-type': 'application/x-ndjson' } })`.
4. Emit events:
   - `{type:'status', stage, label}` — live progress line
   - `{type:'section', key, data}` — one completed section
   - `{type:'error', key?, message}` — section-scoped or fatal
   - `{type:'done'}` — final; charges credits + persists memory
5. Each section = its own small `generateText` call with a focused prompt + tight schema. Run independent sections in parallel (Promise.allSettled), emit as each resolves.

### Section pipeline (Knowledge)

Stages emit in parallel groups:
- Group A (fast, first): `productDiscovery`, `learning`, `laymanSummary`
- Group B (evidence-dependent): fetch GitHub+npm evidence in parallel → then `marketIntelligence`, `competitors`, `resources`
- Group C: `architecture`, `technologyChoices`, `security`, `systemDesign`
- Group D: `developmentPlan`, `launch`, `graph`, `glossary`, `nextSteps`, `recommendedStack`

Each `generateText` uses `maxOutputTokens ≤ 1500` and a mini system prompt scoped to that section — dramatically faster + never truncates.

### System / GitHub Intelligence stages

- System: `indexing` → `parsing` → `dependencies` → `architecture` → `risks` → `recommendations` → `summary`
- GitHub: `repoMeta` → `fileTree` → `hotspots` → `dependencies` → `security` → `quality` → `summary`

Each stage streams status then section payload.

## Frontend

### `src/lib/intel-stream.ts` (new)

Helper `streamIntel(url, body, { onStatus, onSection, onError, onDone, signal })` that POSTs, reads NDJSON lines, dispatches typed events. Attaches Supabase bearer token.

### `src/routes/chat.tsx`

Replace `useServerFn(runKnowledgeIntelligence/…)` calls for these three modes with `streamIntel`. Maintain:
- `progress: {stage, label, status}[]` — rendered as a live checklist ("✓ Product Discovery", "⏳ Gathering market data…")
- `sections: Partial<KnowledgeReport>` — accumulate as events arrive; pass to existing `intel-reports` renderer so partial reports render incrementally
- `failedSections: Set<string>` with a "Retry" button per failed section (POSTs `/api/intel/knowledge.stream` with `only:[key]`)

Keep composer, capability buttons, and prompt bubble visible throughout (already the case).

### `src/components/jeradin/intel-reports.tsx`

Update to gracefully render partial reports (skip missing sections, show inline "Retry this section" button when `failedSections` includes the key).

## Non-goals / constraints

- Keep Claude Sonnet 4.5 model (no swap).
- Do not add new routes/pages; results still appear in the existing dashboard.
- Screen Intelligence stays as-is (already fast, single-shot); only add a progress checklist UI.
- Preserve credit charging (once, at `done`) and memory persistence.

## Files touched

New:
- `src/routes/api/intel/knowledge.stream.ts`
- `src/routes/api/intel/system.stream.ts`
- `src/routes/api/intel/github.stream.ts`
- `src/lib/intel-stream.ts`
- `src/lib/intel-sections.server.ts` (shared per-section generators)

Modified:
- `src/routes/chat.tsx` (streaming client + progress UI + retry)
- `src/components/jeradin/intel-reports.tsx` (partial-report friendly + per-section retry)
- `src/lib/intel-memory.server.ts` (expose `chargeOnly` / `rememberOnly` helpers)

Legacy `runKnowledgeIntelligence/runSystemIntelligence/runRepoIntelligence` server fns stay as fallback until streaming is verified, then can be removed.

## Verification

- `tsgo` clean.
- Live test with the fintech prompt: first section visible < 5s, remaining sections trickle in, no "incomplete response" error.
- Kill one section mid-stream (throw) → other sections still render, Retry button re-runs only that section.
