## What is happening now

- **Knowledge Intelligence is using Claude Sonnet 4.5.** System Intelligence and GitHub Intelligence also use Claude Sonnet 4.5. Screen Intelligence uses Gemini Flash for its normal fast pass and only uses the deeper screen model when explicitly requested.
- The Knowledge request asks Claude to generate one very large, deeply nested JSON report containing product discovery, market research, competitors, architecture, security, system diagrams, development plan, launch strategy, resources, and the knowledge graph.
- The reported error is caused by that large JSON response ending incomplete or containing no complete JSON object. `jsonrepair` can correct small syntax mistakes, but it cannot reliably recreate a response that was cut off.
- Knowledge may also perform external GitHub, npm, or Hugging Face searches before producing the answer. Combined with two database reads, a large prompt, and a long buffered response, this makes the screen appear idle for too long.
- System and GitHub Intelligence first download and inspect repository data before asking the model to produce a large report. That is fundamentally slower than ordinary chat.
- The current server functions buffer the whole result. Users see nothing until every search, model generation, JSON parse, credit operation, and memory operation has completed.
- The mobile Send handler is wired, but the shared request can still end in the same backend error. The UI also prioritizes previous result state over the current error, which can make a new failed request look as though nothing happened.
- The existing Knowledge report renderer still supports the full feature set: startup/product discovery, current market intelligence, competitors, architecture, technology choices, security, system design, roadmap, learning, launch, resources, glossary, and knowledge graph.

## Fix plan

### 1. Make every Send action produce an immediate visible conversation entry
- Insert the user's prompt into the result conversation as soon as Send is pressed.
- Clear stale results and stale errors before the new run.
- Keep the composer, intelligence buttons, repository selector, and Send control visible on desktop and mobile throughout analysis.
- Show a capability-specific live status such as researching, reading repository, analyzing, and preparing result.
- Ensure the newest error or result cannot be hidden behind an older intelligence result.

### 2. Remove Knowledge Intelligence’s incomplete-JSON failure mode
- Replace the fragile “find the first `{` and last `}`” contract with schema-backed structured generation and a guarded fallback.
- Validate and normalize every returned section before rendering so a malformed optional section cannot crash the complete report.
- If the model returns only a partial report, display all valid completed sections instead of discarding the entire answer.
- Add one bounded retry that requests only missing sections, rather than regenerating the full report.
- Preserve all existing Knowledge Intelligence sections and the current Claude Sonnet model.

### 3. Make Knowledge Intelligence fast enough to feel like chat
- Run the independent GitHub-connection lookup and memory lookup in parallel.
- Do not invoke repository/package/model searches for ordinary explanatory questions unless live evidence is needed.
- For research questions such as fintech startup ideas, perform one bounded parallel evidence pass, then generate the report once.
- Return a concise useful overview first, then populate the deeper report sections without blocking the first readable answer.
- Add hard time budgets to external searches and degrade gracefully when a source is slow.

### 4. Repair System and GitHub Intelligence delivery
- Confirm a selected connected repository before starting and provide a plain-language prompt when none is selected.
- Bound repository downloads by file relevance, size, count, and timeout.
- Analyze the most relevant files first instead of waiting for every selected file.
- Return a first project/repository summary quickly, followed by deeper findings.
- Preserve the selected repository and keep users on the main dashboard on mobile and desktop.

### 5. Harden Screen Intelligence
- Verify recording capture from the live media stream on supported desktop browsers.
- On mobile browsers where screen capture is unavailable, show an immediate supported alternative: attach a screenshot or image.
- Add request timeouts and a clear retry state so recording failures never remain stuck on “Analyzing.”
- Keep the current fast/deep screen model routing unchanged.

### 6. Make credit and memory operations unable to discard a completed answer
- Check available credits before expensive analysis begins.
- Once a valid result exists, return it to the user even if non-critical memory persistence fails.
- Deduct credits exactly once for a successful intelligence result, including retries and partial-result recovery.
- Log request timing by phase: authentication, repository/source loading, model generation, parsing, credit deduction, and memory persistence.

### 7. Verify the complete experience
- Test Knowledge with the exact prompt: “I need fintech startup ideas. What should I build and what are the current things I need to know?”
- Test System and GitHub Intelligence with a connected repository and a normal-language prompt.
- Test Screen Intelligence with recording, screenshot attachment, and an unsupported mobile capture path.
- Verify Send by button and Enter on desktop and mobile.
- Confirm first visible feedback appears immediately, a readable answer appears as quickly as possible, the full result completes without an incomplete-response error, and credits are charged once.

## Performance target

- **Immediate UI acknowledgment:** under 0.5 seconds.
- **First readable answer/status:** approximately 2–7 seconds when the model and external sources respond normally.
- **Full Knowledge/System/GitHub deep report:** may take longer than 7 seconds because it includes live research or repository inspection, but users will no longer face a blank waiting screen.
- No model changes are included in this plan.