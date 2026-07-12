
## Scope

Three tightly related changes to `/chat`. All work stays in that route + the three server functions + the sidebar. No new tables, no new routes.

---

## 1. Agentic backend-debugging upgrade

New shared capability across `screen-intel`, `system-intel`, and `github-intel` (renamed from repo intel in UI). All three become **two-role agent pipelines** so results are consistent.

**Role split (same for all three):**

- **Gemini 3 Pro** = *Analyst.* Reads raw evidence (screenshot / repo files / commits) and produces a structured "diagnosis" JSON: what's broken, in which category (runtime, API, DB, auth, env, deps, perf, deployment, log root-cause), suspect files, evidence snippets, severity. Cheap, huge context, strong multimodal.
- **Claude Sonnet 4.5** = *Fixer.* Takes Gemini's diagnosis as input and, with tool access (`search_github_repos`, `search_github_code`, `read_repo_file`), produces a step-by-step fix plan: file-by-file suggestions, and — for each step — an optional `codeAfter` block only when the user won't be able to write it themselves. Uses Vercel AI SDK `generateText` + `tool()` + `stopWhen: stepCountIs(50)`.

**Backend-debugging taxonomy** (added to Gemini prompt + Claude prompt so both know the 9 categories):
runtime · API · database · auth · env/config · dependencies · performance · logs · deployment.

Each server fn returns:
```
{ diagnosis: { category, summary, evidence[], suspectFiles[], severity },
  fix: { plainExplanation, whyItHappened, steps[{file, change, codeAfter?}], references[] } }
```

**Files touched:**
- `src/lib/screen-intel.functions.ts` — swap Gemini model to `google/gemini-3-pro-image`… actually keep chat model `google/gemini-3.1-pro-preview` (already used), extend prompt with the 9-category taxonomy; hand off to Claude via AI SDK agent loop with GitHub tools.
- `src/lib/system-intel.functions.ts` — add Gemini pre-pass (analyst) before Claude (fixer). Currently Claude does both; split them.
- `src/lib/github-intel.functions.ts` — same split.

Shared helper `src/lib/intel-shared.ts` — the 9-category taxonomy string, Zod schemas, GitHub tool definitions, so all three fns stay in sync.

---

## 2. Sidebar cleanup

`src/components/jeradin/chat-sidebar.tsx`: delete the three `SideItem` entries for System / Knowledge / GitHub Intelligence (lines 64-66) and drop unused `Brain`, `Library`, `Github` imports. The routes stay reachable via the new mobile picker + direct URL.

---

## 3. Mobile chat UI — Claude-style bottom sheet

Rebuild `/chat` mobile layout to match the uploaded screenshots.

**Mobile navbar (top):**
- Left: hamburger icon → opens sidebar as a slide-in drawer.
- Center: empty.
- Right: ghost-face avatar icon → account menu.
- Below navbar: "Get more with Jeradin Pro / Upgrade" thin banner (link to `/pricing`).

**Empty state (center):**
- Small orange spark/asterisk icon (reuse `Sparkles` from lucide, orange).
- Greeting: `"{firstName} returns!"` in serif (`Instrument Serif`), matching Claude's typography.

**Composer (bottom, pill-shape):**
- Rounded 2xl container, dark surface.
- Placeholder: "Chat with Jeradin…"
- Row below input: `[+]` attach button · **capability pill** (shows current mode name, e.g. "Screen Intelligence") · mic button · send button.
- Tapping the **capability pill** opens a **bottom sheet** (`Sheet` from `@/components/ui/sheet` side="bottom") titled **"Select capability"** listing:
  - Screen Intelligence — "See your screen, diagnose bugs" ✓
  - System Intelligence — "Map your whole codebase"
  - Knowledge Intelligence — "Find repos, APIs, models"
  - GitHub Intelligence — "Analyze commits & PRs"
  Each row: title + one-line description, checkmark on current selection, tap = select + close sheet.

**Desktop unchanged** — keep the existing 4-tile grid + sidebar. All new mobile UI lives inside `md:hidden` / new `<div className="md:hidden">` blocks; the current desktop block gets `hidden md:flex`.

---

## Technical notes

- Vercel AI SDK stays. Agent loop pattern: `generateText({ model: claude, tools, stopWhen: stepCountIs(50) })` where tools' `execute` calls GitHub REST.
- No schema bounds in tool inputSchemas (per AI SDK rules) — only types + descriptions.
- Gemini call stays raw `fetch` to gateway (already works). Claude call moves to AI SDK with `createAnthropic`.
- Selected capability is stored in `useState<CapabilityKey>("screen")`; drives both the pill label and which server fn `send()` triggers.
- No changes to auth, DB, or routes.

---

## Out of scope (call out if you want them next)

- Actually wiring System/Knowledge/GitHub runs from the mobile composer (currently only Screen runs end-to-end from `/chat`). I'll leave those pill selections wired to open their dedicated routes on tap of Send, unless you want inline execution.
- Sidebar drawer animation polish.
- Renaming the `/github-intelligence` route to `/repo-intelligence`.
