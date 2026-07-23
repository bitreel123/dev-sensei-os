import { AlertTriangle, Github, BookOpen, ExternalLink, Network } from "lucide-react";
import type { SystemAnalysis } from "@/lib/system-intel.functions";
import type { KnowledgeReport } from "@/lib/knowledge-intel.functions";
import type { GithubIntelReport } from "@/lib/github-intel.functions";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/40 mb-2">
      {children}
    </div>
  );
}

function priorityColor(p: string) {
  return p === "high"
    ? "text-red-300 border-red-400/30 bg-red-500/10"
    : p === "medium"
      ? "text-amber-300 border-amber-400/30 bg-amber-500/10"
      : "text-white/60 border-white/15 bg-white/[0.02]";
}

export function SystemReportBody({ analysis }: { analysis: SystemAnalysis }) {
  return (
    <div className="space-y-6 text-[13px] text-white/85 leading-relaxed">
      <div>
        <SectionLabel>Project summary</SectionLabel>
        <p>{analysis.projectSummary}</p>
        {analysis.stack?.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {analysis.stack.map((s, i) => (
              <span key={i} className="font-mono text-[11px] border border-white/15 px-2 py-0.5 rounded">
                {s}
              </span>
            ))}
          </div>
        )}
      </div>

      {analysis.laymanOverview && (
        <div>
          <SectionLabel>What it does</SectionLabel>
          <p className="text-white/75 whitespace-pre-wrap">{analysis.laymanOverview}</p>
        </div>
      )}

      {analysis.modules?.length > 0 && (
        <div>
          <SectionLabel>Modules ({analysis.modules.length})</SectionLabel>
          <ul className="space-y-2">
            {analysis.modules.map((m, i) => (
              <li key={i} className="border border-white/10 bg-white/[0.02] rounded p-3">
                <div className="flex items-center gap-2">
                  <Network className="h-3.5 w-3.5 text-orange-400 shrink-0" />
                  <span className="font-mono text-[12px] text-white">{m.name}</span>
                  <span className="font-mono text-[10.5px] text-white/45">{m.path}</span>
                </div>
                <p className="mt-1 text-[12.5px] text-white/75">{m.role}</p>
                {m.dependsOn?.length > 0 && (
                  <div className="mt-1.5 font-mono text-[10.5px] text-white/45">
                    depends on: {m.dependsOn.join(", ")}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {analysis.suggestions?.length > 0 && (
        <div>
          <SectionLabel>Suggestions ({analysis.suggestions.length})</SectionLabel>
          <ul className="space-y-2">
            {analysis.suggestions.map((s, i) => (
              <li key={i} className={`border rounded p-3 ${priorityColor(s.priority)}`}>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-mono text-[11px]">{s.title}</span>
                  <span className="font-mono text-[9.5px] uppercase tracking-[0.22em] opacity-70">
                    {s.priority}
                  </span>
                </div>
                <div className="font-mono text-[10.5px] text-white/50 mb-1.5">
                  {s.file}{s.line ? `:${s.line}` : ""}
                </div>
                <p className="text-[12.5px]"><span className="text-white/60">Problem: </span>{s.problem}</p>
                <p className="text-[12.5px] mt-1"><span className="text-white/60">Suggestion: </span>{s.suggestion}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {analysis.references?.length > 0 && (
        <div>
          <SectionLabel>References</SectionLabel>
          <ul className="space-y-1.5">
            {analysis.references.map((r, i) => (
              <li key={i} className="text-[12.5px]">
                <a href={r.url} target="_blank" rel="noreferrer" className="text-sky-300 hover:underline inline-flex items-center gap-1">
                  {r.title} <ExternalLink className="h-3 w-3" />
                </a>
                <span className="text-white/55"> — {r.why}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {analysis.mermaid && (
        <details className="border border-white/10 rounded p-3">
          <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-[0.22em] text-white/50">
            Architecture diagram (mermaid source)
          </summary>
          <pre className="mt-2 text-[11px] font-mono bg-black/60 border border-white/10 p-2 rounded overflow-x-auto text-white/75 whitespace-pre">
            {analysis.mermaid}
          </pre>
        </details>
      )}
    </div>
  );
}

function MermaidBlock({ chart, label }: { chart: string; label?: string }) {
  return (
    <div>
      {label && <SectionLabel>{label}</SectionLabel>}
      <pre className="text-[11px] font-mono text-white/70 bg-black/40 border border-white/10 rounded p-3 overflow-x-auto whitespace-pre">
        {chart}
      </pre>
    </div>
  );
}

function graphCategoryColor(cat: string) {
  switch (cat) {
    case "domain":       return "border-white/30 bg-white/[0.06] text-white";
    case "market":       return "border-emerald-400/30 bg-emerald-500/10 text-emerald-200";
    case "competitor":   return "border-red-400/30 bg-red-500/10 text-red-200";
    case "framework":    return "border-sky-400/30 bg-sky-500/10 text-sky-200";
    case "architecture": return "border-orange-400/30 bg-orange-500/10 text-orange-200";
    case "security":     return "border-amber-400/30 bg-amber-500/10 text-amber-200";
    case "database":     return "border-violet-400/30 bg-violet-500/10 text-violet-200";
    case "backend":      return "border-cyan-400/30 bg-cyan-500/10 text-cyan-200";
    case "deployment":   return "border-indigo-400/30 bg-indigo-500/10 text-indigo-200";
    case "pricing":      return "border-lime-400/30 bg-lime-500/10 text-lime-200";
    case "growth":       return "border-pink-400/30 bg-pink-500/10 text-pink-200";
    default:             return "border-white/15 bg-white/[0.02] text-white/70";
  }
}

function ScoreBar({ label, value, invert }: { label: string; value: number; invert?: boolean }) {
  const clamped = Math.max(0, Math.min(10, value ?? 0));
  const pct = clamped * 10;
  // For invert=true (competition, capital, difficulty), high values are BAD → red.
  const good = invert ? clamped <= 4 : clamped >= 7;
  const bad = invert ? clamped >= 7 : clamped <= 3;
  const color = good ? "bg-emerald-400" : bad ? "bg-red-400" : "bg-amber-400";
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] text-white/60 mb-1">
        <span>{label}</span>
        <span className="font-mono text-white/85">{clamped.toFixed(1)}/10</span>
      </div>
      <div className="h-1.5 bg-white/10 rounded overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Reveal({ label, defaultOpen, children }: { label: string; defaultOpen?: boolean; children: React.ReactNode }) {
  return (
    <details open={defaultOpen} className="group border border-white/10 rounded-lg bg-white/[0.02]">
      <summary className="cursor-pointer list-none px-4 py-3 flex items-center justify-between select-none hover:bg-white/[0.04] rounded-lg">
        <span className="text-[12.5px] font-medium text-white/90">{label}</span>
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/40 group-open:hidden">Show</span>
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/40 hidden group-open:inline">Hide</span>
      </summary>
      <div className="px-4 pb-4 pt-1">{children}</div>
    </details>
  );
}

export function KnowledgeReportBody({ report }: { report: KnowledgeReport }) {
  const arch = report.architecture;
  const sd = report.systemDesign;
  const rec = report.recommendation;
  const fk = report.founderKit;
  return (
    <div className="space-y-4 text-[13px] text-white/85 leading-relaxed">
      <div>
        <SectionLabel>Question</SectionLabel>
        <p className="text-white/70 italic">"{report.question}"</p>
      </div>

      {/* TOP RECOMMENDATION — advisor pick, always visible */}
      {rec && (
        <div className="border border-orange-400/30 bg-gradient-to-br from-orange-500/[0.08] to-transparent rounded-xl p-5 space-y-4">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-orange-300 mb-1">🚀 Top Recommendation</div>
            <div className="text-[18px] font-semibold text-white leading-snug">{rec.headline}</div>
          </div>
          {rec.opinion && (
            <p className="text-[13px] text-white/85 border-l-2 border-orange-400/50 pl-3">{rec.opinion}</p>
          )}
          {rec.whyNow?.length > 0 && (
            <div>
              <div className="text-[10.5px] uppercase tracking-[0.2em] text-white/45 mb-1.5">Why now</div>
              <ul className="space-y-1">
                {rec.whyNow.map((w, i) => (
                  <li key={i} className="text-[12.5px] pl-3 relative before:content-['→'] before:absolute before:left-0 before:text-orange-300/70">{w}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 text-[12px]">
            {rec.timeToMvp && (
              <div className="border border-white/10 rounded p-2">
                <div className="text-white/45 text-[10px] uppercase tracking-[0.2em] mb-0.5">Time to MVP</div>
                <div className="font-mono">{rec.timeToMvp}</div>
              </div>
            )}
            {rec.revenuePotential && (
              <div className="border border-white/10 rounded p-2">
                <div className="text-white/45 text-[10px] uppercase tracking-[0.2em] mb-0.5">Revenue potential</div>
                <div className="font-mono text-emerald-300">{rec.revenuePotential}</div>
              </div>
            )}
          </div>
          {rec.scores && (
            <div className="border border-white/10 rounded-lg p-3 grid sm:grid-cols-2 gap-x-4 gap-y-2">
              <ScoreBar label="Market opportunity" value={rec.scores.marketScore} />
              <ScoreBar label="Competition" value={rec.scores.competitionScore} invert />
              <ScoreBar label="Difficulty" value={rec.scores.difficulty} invert />
              <ScoreBar label="Capital needed" value={rec.scores.capitalNeeded} invert />
              <ScoreBar label="AI potential" value={rec.scores.aiPotential} />
              <ScoreBar label="Speed to MVP" value={rec.scores.speedToMvp} />
              <ScoreBar label="Product-market fit chance" value={rec.scores.pmfChance} />
            </div>
          )}
          {rec.alternatives?.length > 0 && (
            <details className="border-t border-white/10 pt-3">
              <summary className="cursor-pointer text-[11.5px] text-white/60 hover:text-white/80">Show alternatives we passed on ({rec.alternatives.length})</summary>
              <ul className="mt-2 space-y-1.5">
                {rec.alternatives.map((a, i) => (
                  <li key={i} className="text-[12px]">
                    <span className="font-mono text-white/80">{a.name}</span>
                    <span className="text-white/50"> — {a.reasonToPass}</span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      {report.aiMoat && (
        <div className="border border-purple-400/25 bg-purple-500/[0.05] rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-purple-300">🛡️ AI Moat</div>
            <div className="text-amber-300 text-[13px]" aria-label={`${report.aiMoat.rating} of 5`}>
              {"★".repeat(Math.max(0, Math.min(5, report.aiMoat.rating)))}
              <span className="text-white/20">{"★".repeat(5 - Math.max(0, Math.min(5, report.aiMoat.rating)))}</span>
            </div>
          </div>
          {report.aiMoat.headline && <div className="text-[13px] text-white">{report.aiMoat.headline}</div>}
          {report.aiMoat.reasons?.length > 0 && (
            <ul className="space-y-0.5 text-[12.5px] text-white/80">
              {report.aiMoat.reasons.map((r, i) => (
                <li key={i} className="pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-purple-300/70">{r}</li>
              ))}
            </ul>
          )}
          {report.aiMoat.dataFlywheel && (
            <div className="text-[11.5px] text-white/55 border-t border-white/10 pt-2">
              <span className="text-white/40">Data flywheel:</span> {report.aiMoat.dataFlywheel}
            </div>
          )}
        </div>
      )}

      {report.marketValidation && report.marketValidation.signals?.length > 0 && (
        <div className="border border-emerald-400/25 bg-emerald-500/[0.05] rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-emerald-300">📊 Market Signals</div>
            <div className="text-[11px] font-mono text-emerald-200">Evidence {report.marketValidation.evidenceScore}/100</div>
          </div>
          <ul className="space-y-1 text-[12.5px] text-white/85">
            {report.marketValidation.signals.map((s, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-emerald-300 shrink-0">✓</span>
                <span><span className="text-white">{s.label}</span>{s.detail ? <span className="text-white/55"> — {s.detail}</span> : null}</span>
              </li>
            ))}
          </ul>
        </div>
      )}


      {report.laymanSummary && (
        <div>
          <SectionLabel>Overview</SectionLabel>
          <p className="whitespace-pre-wrap">{report.laymanSummary}</p>
        </div>
      )}

      {/* Everything below is progressive disclosure — user opens what they want */}

      {report.marketIntelligence && (
        <Reveal label="📈 Show Market Analysis">
          <div className="space-y-3">
            {report.marketIntelligence.trends?.length > 0 && (
              <div>
                <div className="text-[10.5px] uppercase tracking-[0.2em] text-white/45 mb-1">Trends</div>
                <ul className="list-disc pl-5 space-y-1">{report.marketIntelligence.trends.map((t, i) => <li key={i} className="text-[12.5px]">{t}</li>)}</ul>
              </div>
            )}
            {report.marketIntelligence.unsolvedProblems?.length > 0 && (
              <div>
                <div className="text-[10.5px] uppercase tracking-[0.2em] text-white/45 mb-1">Unsolved problems</div>
                <ul className="list-disc pl-5 space-y-1">{report.marketIntelligence.unsolvedProblems.map((t, i) => <li key={i} className="text-[12.5px]">{t}</li>)}</ul>
              </div>
            )}
            {report.marketIntelligence.sources?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {report.marketIntelligence.sources.map((s, i) => (
                  <a key={i} href={s.url} target="_blank" rel="noreferrer" className="text-sky-300 hover:underline inline-flex items-center gap-1 text-[12px] font-mono border border-white/10 rounded px-2 py-0.5">
                    {s.title} <ExternalLink className="h-3 w-3" />
                  </a>
                ))}
              </div>
            )}
          </div>
        </Reveal>
      )}

      {report.competitors && report.competitors.length > 0 && (
        <Reveal label={`🏆 Show Competitors (${report.competitors.length})`}>
          <div className="grid sm:grid-cols-2 gap-3">
            {report.competitors.map((c, i) => (
              <div key={i} className="border border-white/10 bg-white/[0.02] rounded p-3">
                <div className="flex items-center justify-between gap-2">
                  {c.url ? (
                    <a href={c.url} target="_blank" rel="noreferrer" className="text-sky-300 hover:underline inline-flex items-center gap-1 text-[12.5px] font-mono">{c.name} <ExternalLink className="h-3 w-3" /></a>
                  ) : (
                    <span className="font-mono text-[12.5px] text-white">{c.name}</span>
                  )}
                  {c.pricing && <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/40">{c.pricing}</span>}
                </div>
                {c.positioning && <p className="mt-1 text-[12px] text-white/70">{c.positioning}</p>}
                {c.strengths?.length > 0 && <div className="mt-2 text-[11.5px]"><span className="text-emerald-300">+ </span>{c.strengths.join("; ")}</div>}
                {c.weaknesses?.length > 0 && <div className="mt-0.5 text-[11.5px]"><span className="text-red-300">− </span>{c.weaknesses.join("; ")}</div>}
                {c.gap && <div className="mt-2 text-[11.5px] text-amber-200">Opportunity: {c.gap}</div>}
              </div>
            ))}
          </div>
        </Reveal>
      )}

      {fk && (
        <Reveal label="💼 Show Founder Kit (BMC · GTM · Pricing · TAM · Investor readiness)">
          <div className="space-y-4">
            {fk.businessModelCanvas && (
              <div>
                <div className="text-[10.5px] uppercase tracking-[0.2em] text-white/45 mb-1.5">Business Model Canvas</div>
                <div className="grid sm:grid-cols-3 gap-2 text-[11.5px]">
                  {Object.entries(fk.businessModelCanvas).map(([k, v]) => (
                    <div key={k} className="border border-white/10 rounded p-2">
                      <div className="text-white/45 text-[9.5px] uppercase tracking-[0.2em] mb-1">{k.replace(/([A-Z])/g, " $1").trim()}</div>
                      <ul className="list-disc pl-4 space-y-0.5">{(v as string[])?.map((s, i) => <li key={i}>{s}</li>)}</ul>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {fk.goToMarket?.length ? (
              <div>
                <div className="text-[10.5px] uppercase tracking-[0.2em] text-white/45 mb-1.5">Go-to-Market</div>
                <div className="space-y-2">
                  {fk.goToMarket.map((p, i) => (
                    <div key={i} className="border border-white/10 rounded p-2.5">
                      <div className="font-mono text-[11.5px] text-white">{p.phase}</div>
                      <p className="text-[12px] text-white/75 mt-1">{p.playbook}</p>
                      {p.targets?.length > 0 && <div className="mt-1 text-[11.5px] text-white/55">Targets: {p.targets.join(", ")}</div>}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            {fk.pricingStrategy && (
              <div>
                <div className="text-[10.5px] uppercase tracking-[0.2em] text-white/45 mb-1.5">Pricing strategy — {fk.pricingStrategy.model}</div>
                <div className="grid sm:grid-cols-3 gap-2">
                  {fk.pricingStrategy.tiers?.map((t, i) => (
                    <div key={i} className="border border-white/10 rounded p-2.5">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-mono text-[12px] text-white">{t.name}</span>
                        <span className="font-mono text-[12px] text-emerald-300">{t.price}</span>
                      </div>
                      <ul className="mt-1.5 list-disc pl-4 space-y-0.5 text-[11.5px]">{t.includes.map((i2, j) => <li key={j}>{i2}</li>)}</ul>
                    </div>
                  ))}
                </div>
                {fk.pricingStrategy.rationale && <p className="mt-1.5 text-[11.5px] text-white/60">{fk.pricingStrategy.rationale}</p>}
              </div>
            )}
            {fk.tamSamSom && (
              <div>
                <div className="text-[10.5px] uppercase tracking-[0.2em] text-white/45 mb-1.5">Market size — TAM / SAM / SOM</div>
                <div className="grid grid-cols-3 gap-2 text-[12px]">
                  <div className="border border-white/10 rounded p-2"><div className="text-white/45 text-[10px] uppercase tracking-[0.2em] mb-0.5">TAM</div><div className="font-mono text-emerald-300">{fk.tamSamSom.tam}</div></div>
                  <div className="border border-white/10 rounded p-2"><div className="text-white/45 text-[10px] uppercase tracking-[0.2em] mb-0.5">SAM</div><div className="font-mono text-emerald-300">{fk.tamSamSom.sam}</div></div>
                  <div className="border border-white/10 rounded p-2"><div className="text-white/45 text-[10px] uppercase tracking-[0.2em] mb-0.5">SOM</div><div className="font-mono text-emerald-300">{fk.tamSamSom.som}</div></div>
                </div>
                {fk.tamSamSom.assumptions?.length > 0 && (
                  <ul className="mt-1.5 list-disc pl-5 text-[11.5px] text-white/60">{fk.tamSamSom.assumptions.map((a, i) => <li key={i}>{a}</li>)}</ul>
                )}
              </div>
            )}
            {fk.investorReadiness && (
              <div>
                <div className="text-[10.5px] uppercase tracking-[0.2em] text-white/45 mb-1.5">Investor readiness — {fk.investorReadiness.score}/100</div>
                <div className="h-1.5 bg-white/10 rounded overflow-hidden mb-2"><div className="h-full bg-emerald-400" style={{ width: `${fk.investorReadiness.score}%` }} /></div>
                <ul className="space-y-1 text-[12px]">
                  {fk.investorReadiness.checklist?.map((c, i) => (
                    <li key={i} className={c.done ? "text-emerald-300" : "text-white/60"}>{c.done ? "✓" : "○"} {c.item}</li>
                  ))}
                </ul>
                {fk.investorReadiness.missing?.length > 0 && (
                  <div className="mt-1.5 text-[11.5px] text-amber-200">Missing: {fk.investorReadiness.missing.join(", ")}</div>
                )}
              </div>
            )}
            {fk.risksAndAssumptions?.length ? (
              <div>
                <div className="text-[10.5px] uppercase tracking-[0.2em] text-white/45 mb-1.5">Risks & assumptions</div>
                <ul className="space-y-1.5">
                  {fk.risksAndAssumptions.map((r, i) => (
                    <li key={i} className="border border-red-400/20 bg-red-500/[0.04] rounded p-2 text-[11.5px]">
                      <div><span className="text-red-300">Risk: </span>{r.risk}</div>
                      <div className="text-white/60 mt-0.5"><span className="text-white/45">Assumption: </span>{r.assumption}</div>
                      <div className="text-white/70 mt-0.5"><span className="text-white/45">Mitigation: </span>{r.mitigation}</div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </Reveal>
      )}

      {report.productDiscovery && (
        <Reveal label="💡 Show Product Discovery">
          <div className="space-y-3">
            {report.productDiscovery.clarifyingQuestions?.length > 0 && (
              <div>
                <div className="text-[10.5px] uppercase tracking-[0.2em] text-white/45 mb-1">Questions to sharpen scope</div>
                <ul className="list-disc pl-5 space-y-1">{report.productDiscovery.clarifyingQuestions.map((q, i) => <li key={i} className="text-[12.5px]">{q}</li>)}</ul>
              </div>
            )}
            <div className="grid sm:grid-cols-2 gap-3">
              {report.productDiscovery.vision && <div className="border border-white/10 rounded p-3"><div className="text-[10px] uppercase tracking-[0.22em] text-white/40 mb-1">Vision</div><p className="text-[12.5px]">{report.productDiscovery.vision}</p></div>}
              {report.productDiscovery.problem && <div className="border border-white/10 rounded p-3"><div className="text-[10px] uppercase tracking-[0.22em] text-white/40 mb-1">Problem</div><p className="text-[12.5px]">{report.productDiscovery.problem}</p></div>}
              {report.productDiscovery.solution && <div className="border border-white/10 rounded p-3"><div className="text-[10px] uppercase tracking-[0.22em] text-white/40 mb-1">Solution</div><p className="text-[12.5px]">{report.productDiscovery.solution}</p></div>}
              {report.productDiscovery.businessModel && <div className="border border-white/10 rounded p-3"><div className="text-[10px] uppercase tracking-[0.22em] text-white/40 mb-1">Business model</div><p className="text-[12.5px]">{report.productDiscovery.businessModel}</p></div>}
            </div>
            {report.productDiscovery.mvpRoadmap?.length > 0 && (
              <div>
                <div className="text-[10.5px] uppercase tracking-[0.2em] text-white/45 mb-1">MVP roadmap</div>
                <ol className="list-decimal pl-5 space-y-1">{report.productDiscovery.mvpRoadmap.map((s, i) => <li key={i} className="text-[12.5px]">{s}</li>)}</ol>
              </div>
            )}
          </div>
        </Reveal>
      )}

      {(arch || (sd && (sd.sequence || sd.er || sd.dataflow || sd.services))) && (
        <Reveal label="🏗 Show System Design">
          <div className="space-y-3">
            {arch && (
              <div className="space-y-2">
                <div className="grid sm:grid-cols-2 gap-2 text-[12.5px]">
                  {arch.apiStyle && <div className="border border-white/10 rounded p-2"><span className="text-white/45">API: </span>{arch.apiStyle}</div>}
                  {arch.monolithVsMicroservices && <div className="border border-white/10 rounded p-2"><span className="text-white/45">Shape: </span>{arch.monolithVsMicroservices}</div>}
                  {arch.auth && <div className="border border-white/10 rounded p-2"><span className="text-white/45">Auth: </span>{arch.auth}</div>}
                  {arch.queues && <div className="border border-white/10 rounded p-2"><span className="text-white/45">Queues: </span>{arch.queues}</div>}
                  {arch.caching && <div className="border border-white/10 rounded p-2"><span className="text-white/45">Caching: </span>{arch.caching}</div>}
                  {arch.deployment && <div className="border border-white/10 rounded p-2"><span className="text-white/45">Deploy: </span>{arch.deployment}</div>}
                </div>
                {arch.folderStructure && <MermaidBlock label="Folder structure" chart={arch.folderStructure} />}
                {arch.databaseSchema && <div className="text-[12.5px]"><span className="text-white/45">DB: </span>{arch.databaseSchema}</div>}
                {arch.mermaid && <MermaidBlock label="Architecture diagram (Mermaid)" chart={arch.mermaid} />}
              </div>
            )}
            {sd?.sequence && <MermaidBlock label="Sequence" chart={sd.sequence} />}
            {sd?.er && <MermaidBlock label="Entities" chart={sd.er} />}
            {sd?.dataflow && <MermaidBlock label="Data flow" chart={sd.dataflow} />}
            {sd?.services && <MermaidBlock label="Services" chart={sd.services} />}
          </div>
        </Reveal>
      )}

      {report.technologyChoices && report.technologyChoices.length > 0 && (
        <Reveal label="⚙ Show Technology Choices">
          <ul className="space-y-2">
            {report.technologyChoices.map((t, i) => (
              <li key={i} className="border border-white/10 rounded p-3">
                <div className="font-mono text-[12px] text-white">{t.choice}</div>
                <p className="mt-1 text-[12.5px] text-white/75"><span className="text-white/45">Why: </span>{t.why}</p>
                {t.tradeoffs && <p className="text-[12px] text-white/60"><span className="text-white/45">Tradeoffs: </span>{t.tradeoffs}</p>}
                {t.alternatives?.length ? <p className="text-[11.5px] text-white/50">Alternatives: {t.alternatives.join(", ")}</p> : null}
              </li>
            ))}
          </ul>
        </Reveal>
      )}

      {report.security && (
        <Reveal label="🔐 Show Security">
          <div>
            {report.security.recommendations?.length > 0 && (
              <ul className="space-y-1.5">
                {report.security.recommendations.map((r, i) => (
                  <li key={i} className="border border-white/10 rounded p-2.5">
                    <div className="font-mono text-[12px] text-white">{r.title}</div>
                    <p className="text-[12px] text-white/70 mt-0.5">{r.why}</p>
                  </li>
                ))}
              </ul>
            )}
            {report.security.compliance?.length ? (
              <div className="mt-2 flex flex-wrap gap-1.5">{report.security.compliance.map((c, i) => <span key={i} className="font-mono text-[10.5px] border border-amber-400/30 bg-amber-500/10 text-amber-200 px-2 py-0.5 rounded">{c}</span>)}</div>
            ) : null}
          </div>
        </Reveal>
      )}

      {report.developmentPlan && (
        <Reveal label="🛠 Show Development Plan">
          <div>
            {report.developmentPlan.weeks?.length > 0 && (
              <ol className="space-y-2 list-decimal pl-5">
                {report.developmentPlan.weeks.map((w, i) => (
                  <li key={i}>
                    <div className="font-mono text-[12px] text-white">{w.label}</div>
                    <ul className="list-disc pl-5 space-y-0.5 mt-1">{w.goals.map((g, j) => <li key={j} className="text-[12px] text-white/75">{g}</li>)}</ul>
                  </li>
                ))}
              </ol>
            )}
            {report.developmentPlan.milestones?.length ? (
              <div className="mt-2 text-[12px] text-white/70">Milestones: {report.developmentPlan.milestones.join(" · ")}</div>
            ) : null}
          </div>
        </Reveal>
      )}

      {report.launch && (
        <Reveal label="🚀 Show Launch Plan">
          <div className="space-y-2">
            <div className="grid sm:grid-cols-3 gap-2 text-[12px]">
              {["analytics", "monitoring", "cicd"].map((k) => {
                const arr = (report.launch as unknown as Record<string, string[]>)[k];
                if (!arr?.length) return null;
                return (
                  <div key={k} className="border border-white/10 rounded p-2">
                    <div className="text-white/45 text-[10.5px] uppercase tracking-[0.2em] mb-1">{k}</div>
                    <ul className="list-disc pl-4 space-y-0.5">{arr.map((s, i) => <li key={i}>{s}</li>)}</ul>
                  </div>
                );
              })}
            </div>
            {report.launch.pricingIdeas?.length ? <div className="text-[12px]"><span className="text-white/45">Pricing ideas: </span>{report.launch.pricingIdeas.join(" · ")}</div> : null}
            {report.launch.growthExperiments?.length ? <div className="text-[12px]"><span className="text-white/45">Growth: </span>{report.launch.growthExperiments.join(" · ")}</div> : null}
            {report.launch.checklist?.length ? <ul className="list-disc pl-5 space-y-0.5">{report.launch.checklist.map((c, i) => <li key={i} className="text-[12.5px]">{c}</li>)}</ul> : null}
          </div>
        </Reveal>
      )}

      {report.recommendedStack?.length > 0 && (
        <div>
          <SectionLabel>Recommended stack</SectionLabel>
          <div className="flex flex-wrap gap-1.5">{report.recommendedStack.map((s, i) => <span key={i} className="font-mono text-[11px] border border-white/15 px-2 py-0.5 rounded">{s}</span>)}</div>
        </div>
      )}

      {report.resources?.length > 0 && (
        <Reveal label={`📚 Show Resources (${report.resources.length})`}>
          <ul className="space-y-1.5">
            {report.resources.map((r, i) => (
              <li key={i} className="border border-white/10 bg-white/[0.02] rounded p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <a href={r.url} target="_blank" rel="noreferrer" className="text-sky-300 hover:underline inline-flex items-center gap-1 text-[12.5px] font-mono">{r.title} <ExternalLink className="h-3 w-3" /></a>
                  <span className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-white/40">{r.kind}{typeof r.stars === "number" ? ` · ${r.stars}★` : ""}</span>
                </div>
                <p className="mt-1 text-[12px] text-white/70">{r.why}</p>
              </li>
            ))}
          </ul>
        </Reveal>
      )}

      {report.graph && (report.graph.nodes?.length || report.graph.edges?.length) ? (
        <Reveal label="🕸 Show Knowledge Graph">
          <div className="space-y-2">
            {report.graph.nodes?.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {report.graph.nodes.map((n) => (
                  <span key={n.id} className={`font-mono text-[11px] border px-2 py-0.5 rounded ${graphCategoryColor(n.category)}`}>{n.label}</span>
                ))}
              </div>
            )}
            {report.graph.edges?.length > 0 && (
              <ul className="text-[11.5px] font-mono text-white/55 space-y-0.5">
                {report.graph.edges.slice(0, 40).map((e, i) => <li key={i}>{e.from} → <span className="text-white/40">{e.relation}</span> → {e.to}</li>)}
              </ul>
            )}
          </div>
        </Reveal>
      ) : null}

      {report.nextSteps?.length > 0 && (
        <div>
          <SectionLabel>Next steps</SectionLabel>
          <ol className="space-y-1.5 list-decimal pl-5">{report.nextSteps.map((s, i) => <li key={i} className="text-[12.5px]">{s}</li>)}</ol>
        </div>
      )}

      {report.glossary?.length > 0 && (
        <div>
          <SectionLabel>Glossary</SectionLabel>
          <ul className="space-y-1">{report.glossary.map((g, i) => <li key={i} className="text-[12px]"><span className="font-mono text-white">{g.term}</span><span className="text-white/60"> — {g.meaning}</span></li>)}</ul>
        </div>
      )}
    </div>
  );
}

export function RepoReportBody({ report }: { report: GithubIntelReport }) {
  return (
    <div className="space-y-6 text-[13px] text-white/85 leading-relaxed">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Github className="h-3.5 w-3.5 text-white/70" />
          <span className="font-mono text-[11.5px] text-white">{report.repo}</span>
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/40">
            · activity {report.activityScore}/100
          </span>
        </div>
        <p className="text-white/80">{report.summary}</p>
      </div>

      {report.risks?.length > 0 && (
        <div>
          <SectionLabel>Risks</SectionLabel>
          <ul className="space-y-2">
            {report.risks.map((r, i) => (
              <li key={i} className={`border rounded p-3 ${priorityColor(r.severity)}`}>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="inline-flex items-center gap-1.5 font-mono text-[11px]">
                    <AlertTriangle className="h-3 w-3" />
                    {r.title}
                  </span>
                  <span className="font-mono text-[9.5px] uppercase tracking-[0.22em] opacity-70">
                    {r.severity}
                  </span>
                </div>
                <p className="text-[12.5px]">{r.detail}</p>
                {r.where && (
                  <div className="mt-1 font-mono text-[10.5px] text-white/45">where: {r.where}</div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {report.opportunities?.length > 0 && (
        <div>
          <SectionLabel>Opportunities</SectionLabel>
          <ul className="space-y-2">
            {report.opportunities.map((o, i) => (
              <li key={i} className="border border-white/10 bg-white/[0.02] rounded p-3">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-mono text-[11px] text-white">{o.title}</span>
                  <span className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-white/40">
                    {o.effort} effort
                  </span>
                </div>
                <p className="text-[12.5px] text-white/75">{o.detail}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {report.patterns?.length > 0 && (
        <div>
          <SectionLabel>Patterns spotted</SectionLabel>
          <ul className="space-y-2">
            {report.patterns.map((p, i) => (
              <li key={i} className="border border-white/10 bg-white/[0.02] rounded p-3">
                <div className="font-mono text-[11px] text-white mb-1">{p.name}</div>
                <p className="text-[12.5px] text-white/75">{p.description}</p>
                {p.examples?.length > 0 && (
                  <div className="mt-1.5 font-mono text-[10.5px] text-white/45">
                    e.g. {p.examples.join(", ")}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {report.dependencyNotes?.length > 0 && (
        <div>
          <SectionLabel>Dependency notes</SectionLabel>
          <ul className="space-y-1">
            {report.dependencyNotes.map((d, i) => (
              <li key={i} className="text-[12.5px]">
                <span className="font-mono text-white">{d.name}</span>
                <span className="text-white/50"> {d.version}</span>
                <span className="text-white/70"> — {d.note}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {report.commitIntel && report.commitIntel.length > 0 && (
        <div>
          <SectionLabel>Commit intelligence</SectionLabel>
          <ul className="space-y-2">
            {report.commitIntel.map((c, i) => (
              <li key={i} className={`border rounded p-3 ${priorityColor(c.risk)}`}>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-mono text-[11px] text-white">{c.sha} · {c.title}</span>
                  <span className="font-mono text-[9.5px] uppercase tracking-[0.22em] opacity-70">
                    {c.risk}{c.breaking ? " · breaking" : ""}
                  </span>
                </div>
                <p className="text-[12.5px]"><span className="text-white/60">What: </span>{c.what}</p>
                <p className="text-[12.5px]"><span className="text-white/60">Why: </span>{c.why}</p>
                {c.files?.length > 0 && (
                  <div className="mt-1 font-mono text-[10.5px] text-white/45">files: {c.files.join(", ")}</div>
                )}
                {(c.author || c.date) && (
                  <div className="mt-0.5 font-mono text-[10px] text-white/35">{c.author}{c.author && c.date ? " · " : ""}{c.date?.slice(0,10)}</div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {report.prIntel && report.prIntel.length > 0 && (
        <div>
          <SectionLabel>Pull request intelligence</SectionLabel>
          <ul className="space-y-2">
            {report.prIntel.map((p, i) => (
              <li key={i} className="border border-white/10 bg-white/[0.02] rounded p-3">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-mono text-[11px] text-white">#{p.number} · {p.title}</span>
                  {p.missingTests && (
                    <span className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-amber-300/80">missing tests</span>
                  )}
                </div>
                <p className="text-[12.5px] text-white/75"><span className="text-white/50">Purpose: </span>{p.purpose}</p>
                <p className="text-[12.5px] text-white/75"><span className="text-white/50">Architecture: </span>{p.architectureImpact}</p>
                {p.risks?.length > 0 && (
                  <div className="text-[12px] text-white/70 mt-1">Risks: {p.risks.join("; ")}</div>
                )}
                {p.reviewSuggestions?.length > 0 && (
                  <div className="text-[12px] text-white/70">Review: {p.reviewSuggestions.join("; ")}</div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {report.evolution && report.evolution.length > 0 && (
        <div>
          <SectionLabel>Evolution intelligence</SectionLabel>
          <div className="space-y-3">
            {report.evolution.map((thread, i) => (
              <div key={i} className="border border-white/10 bg-white/[0.02] rounded p-3">
                <div className="font-mono text-[11px] text-white mb-2">{thread.topic}</div>
                <div className="flex flex-wrap items-center gap-1.5 text-[12px] text-white/80">
                  {thread.timeline.map((step, j) => (
                    <span key={j} className="inline-flex items-center gap-1.5">
                      <span className="border border-white/15 rounded px-1.5 py-0.5 font-mono text-[10.5px]">
                        {step.version}
                      </span>
                      <span className="text-white/60">{step.change}</span>
                      {j < thread.timeline.length - 1 && <span className="text-white/30">→</span>}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {report.regression && (
        <div>
          <SectionLabel>Regression intelligence</SectionLabel>
          <div className={`border rounded p-3 ${priorityColor("high")}`}>
            <div className="flex items-center justify-between mb-1">
              <span className="font-mono text-[11px] text-white">Regression detected</span>
              <span className="font-mono text-[10px] text-white/70">confidence {report.regression.confidence}%</span>
            </div>
            <p className="text-[12.5px]">{report.regression.description}</p>
            {report.regression.likelyCommit && (
              <div className="mt-1 font-mono text-[11px]">likely commit: {report.regression.likelyCommit}</div>
            )}
            {report.regression.files?.length > 0 && (
              <div className="mt-0.5 font-mono text-[10.5px] text-white/60">files: {report.regression.files.join(", ")}</div>
            )}
            <p className="mt-1 text-[12px] text-white/70">{report.regression.reasoning}</p>
          </div>
        </div>
      )}

      {report.contributors && report.contributors.length > 0 && (
        <div>
          <SectionLabel>Contributor intelligence</SectionLabel>
          <ul className="space-y-1">
            {report.contributors.map((c, i) => (
              <li key={i} className="text-[12.5px]">
                <span className="text-white/60">{c.area}</span>
                <span className="text-white/40"> · mostly maintained by </span>
                <span className="font-mono text-white">{c.owner}</span>
                <span className="text-white/40"> ({c.share})</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {report.branches && report.branches.length > 0 && (
        <div>
          <SectionLabel>Branch intelligence</SectionLabel>
          <ul className="space-y-2">
            {report.branches.map((b, i) => (
              <li key={i} className="border border-white/10 bg-white/[0.02] rounded p-3">
                <div className="font-mono text-[11px] text-white mb-1">{b.branch} vs {b.vs}</div>
                <p className="text-[12.5px] text-white/75">{b.summary}</p>
                {b.differences?.length > 0 && (
                  <ul className="mt-1 list-disc pl-4 text-[12px] text-white/70">
                    {b.differences.map((d, j) => <li key={j}>{d}</li>)}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {report.releases && report.releases.length > 0 && (
        <div>
          <SectionLabel>Release intelligence</SectionLabel>
          <ul className="space-y-2">
            {report.releases.map((r, i) => (
              <li key={i} className={`border rounded p-3 ${priorityColor(r.risk)}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-[11px] text-white">{r.version}</span>
                  <span className="font-mono text-[9.5px] uppercase tracking-[0.22em] opacity-70">risk {r.risk}</span>
                </div>
                <div className="grid grid-cols-2 gap-1 text-[12px] text-white/75">
                  <div>New APIs: <span className="text-white">{r.newApis}</span></div>
                  <div>Breaking: <span className="text-white">{r.breakingChanges}</span></div>
                  <div>DB changes: <span className="text-white">{r.databaseChanges}</span></div>
                  <div>Migration: <span className="text-white">{r.migrationRequired ? "yes" : "no"}</span></div>
                </div>
                {r.notes && <p className="mt-1 text-[12px] text-white/70">{r.notes}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {report.health && (
        <div>
          <SectionLabel>Repository health</SectionLabel>
          <div className="border border-white/10 bg-white/[0.02] rounded p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12.5px] text-white/80">Overall</span>
              <span className="font-mono text-[13px] text-white">{report.health.overall}%</span>
            </div>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-[12px]">
              {(["commits","reviews","testing","security","documentation"] as const).map((k) => {
                const v = report.health![k];
                const color = v === "healthy" ? "text-emerald-300" : v === "needs attention" ? "text-amber-300" : "text-red-300";
                return (
                  <li key={k} className="flex justify-between">
                    <span className="text-white/60 capitalize">{k}</span>
                    <span className={`font-mono ${color}`}>{v}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      {report.historical && report.historical.length > 0 && (
        <div>
          <SectionLabel>Historical search</SectionLabel>
          <ul className="space-y-2">
            {report.historical.map((h, i) => (
              <li key={i} className="border border-white/10 bg-white/[0.02] rounded p-3">
                <div className="text-[12.5px] text-white/85">Q: {h.question}</div>
                <div className="text-[12.5px] text-white/70 mt-0.5">A: {h.answer}</div>
                <div className="mt-1 font-mono text-[10.5px] text-white/45">
                  {[h.commit && `commit ${h.commit}`, h.pr && `PR ${h.pr}`, h.date?.slice(0,10)].filter(Boolean).join(" · ")}
                </div>
                {h.reason && <div className="text-[12px] text-white/60 mt-0.5">{h.reason}</div>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {report.memory && report.memory.length > 0 && (
        <div>
          <SectionLabel>Repository memory</SectionLabel>
          <ul className="list-disc pl-4 space-y-1 text-[12.5px] text-white/75">
            {report.memory.map((m, i) => <li key={i}>{m}</li>)}
          </ul>
        </div>
      )}

      {report.glossary?.length > 0 && (
        <div>
          <SectionLabel>Glossary</SectionLabel>
          <ul className="space-y-1">
            {report.glossary.map((g, i) => (
              <li key={i} className="text-[12px]">
                <span className="font-mono text-white">{g.term}</span>
                <span className="text-white/60"> — {g.meaning}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export { BookOpen };
