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

export function KnowledgeReportBody({ report }: { report: KnowledgeReport }) {
  const arch = report.architecture;
  const sd = report.systemDesign;
  return (
    <div className="space-y-6 text-[13px] text-white/85 leading-relaxed">
      <div>
        <SectionLabel>Question</SectionLabel>
        <p className="text-white/70 italic">"{report.question}"</p>
      </div>

      {report.laymanSummary && (
        <div>
          <SectionLabel>Overview</SectionLabel>
          <p className="whitespace-pre-wrap">{report.laymanSummary}</p>
        </div>
      )}

      {/* Product Discovery */}
      {report.productDiscovery && (
        <div className="space-y-3">
          <SectionLabel>💡 Product discovery</SectionLabel>
          {report.productDiscovery.clarifyingQuestions?.length > 0 && (
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/40 mb-1">Questions to sharpen scope</div>
              <ul className="list-disc pl-5 space-y-1">
                {report.productDiscovery.clarifyingQuestions.map((q, i) => (
                  <li key={i} className="text-[12.5px]">{q}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="grid sm:grid-cols-2 gap-3">
            {report.productDiscovery.vision && (
              <div className="border border-white/10 rounded p-3">
                <div className="text-[10px] uppercase tracking-[0.22em] text-white/40 mb-1">Vision</div>
                <p className="text-[12.5px]">{report.productDiscovery.vision}</p>
              </div>
            )}
            {report.productDiscovery.problem && (
              <div className="border border-white/10 rounded p-3">
                <div className="text-[10px] uppercase tracking-[0.22em] text-white/40 mb-1">Problem</div>
                <p className="text-[12.5px]">{report.productDiscovery.problem}</p>
              </div>
            )}
            {report.productDiscovery.solution && (
              <div className="border border-white/10 rounded p-3">
                <div className="text-[10px] uppercase tracking-[0.22em] text-white/40 mb-1">Solution</div>
                <p className="text-[12.5px]">{report.productDiscovery.solution}</p>
              </div>
            )}
            {report.productDiscovery.businessModel && (
              <div className="border border-white/10 rounded p-3">
                <div className="text-[10px] uppercase tracking-[0.22em] text-white/40 mb-1">Business model</div>
                <p className="text-[12.5px]">{report.productDiscovery.businessModel}</p>
              </div>
            )}
          </div>
          {report.productDiscovery.targetUsers?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {report.productDiscovery.targetUsers.map((u, i) => (
                <span key={i} className="font-mono text-[11px] border border-white/15 px-2 py-0.5 rounded">{u}</span>
              ))}
            </div>
          )}
          {report.productDiscovery.mvpRoadmap?.length > 0 && (
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/40 mb-1">MVP roadmap</div>
              <ol className="list-decimal pl-5 space-y-1">
                {report.productDiscovery.mvpRoadmap.map((s, i) => <li key={i} className="text-[12.5px]">{s}</li>)}
              </ol>
            </div>
          )}
        </div>
      )}

      {/* Market Intelligence */}
      {report.marketIntelligence && (
        <div className="space-y-2">
          <SectionLabel>📈 Market intelligence</SectionLabel>
          {report.marketIntelligence.trends?.length > 0 && (
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/40 mb-1">Trends</div>
              <ul className="list-disc pl-5 space-y-1">
                {report.marketIntelligence.trends.map((t, i) => <li key={i} className="text-[12.5px]">{t}</li>)}
              </ul>
            </div>
          )}
          {report.marketIntelligence.unsolvedProblems?.length > 0 && (
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/40 mb-1">Unsolved problems</div>
              <ul className="list-disc pl-5 space-y-1">
                {report.marketIntelligence.unsolvedProblems.map((t, i) => <li key={i} className="text-[12.5px]">{t}</li>)}
              </ul>
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
      )}

      {/* Competitors */}
      {report.competitors && report.competitors.length > 0 && (
        <div className="space-y-2">
          <SectionLabel>🏆 Competitors ({report.competitors.length})</SectionLabel>
          <div className="grid sm:grid-cols-2 gap-3">
            {report.competitors.map((c, i) => (
              <div key={i} className="border border-white/10 bg-white/[0.02] rounded p-3">
                <div className="flex items-center justify-between gap-2">
                  {c.url ? (
                    <a href={c.url} target="_blank" rel="noreferrer" className="text-sky-300 hover:underline inline-flex items-center gap-1 text-[12.5px] font-mono">
                      {c.name} <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <span className="font-mono text-[12.5px] text-white">{c.name}</span>
                  )}
                  {c.pricing && <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/40">{c.pricing}</span>}
                </div>
                {c.positioning && <p className="mt-1 text-[12px] text-white/70">{c.positioning}</p>}
                {c.strengths?.length > 0 && (
                  <div className="mt-2 text-[11.5px]"><span className="text-emerald-300">+ </span>{c.strengths.join("; ")}</div>
                )}
                {c.weaknesses?.length > 0 && (
                  <div className="mt-0.5 text-[11.5px]"><span className="text-red-300">− </span>{c.weaknesses.join("; ")}</div>
                )}
                {c.gap && <div className="mt-2 text-[11.5px] text-amber-200">Opportunity: {c.gap}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Architecture */}
      {arch && (
        <div className="space-y-2">
          <SectionLabel>🏗 Architecture</SectionLabel>
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

      {/* Technology choices */}
      {report.technologyChoices && report.technologyChoices.length > 0 && (
        <div>
          <SectionLabel>⚙ Technology choices</SectionLabel>
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
        </div>
      )}

      {/* Security */}
      {report.security && (
        <div>
          <SectionLabel>🔐 Security</SectionLabel>
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
            <div className="mt-2 flex flex-wrap gap-1.5">
              {report.security.compliance.map((c, i) => (
                <span key={i} className="font-mono text-[10.5px] border border-amber-400/30 bg-amber-500/10 text-amber-200 px-2 py-0.5 rounded">{c}</span>
              ))}
            </div>
          ) : null}
        </div>
      )}

      {/* System Design */}
      {sd && (sd.sequence || sd.er || sd.dataflow || sd.services) && (
        <div className="space-y-2">
          <SectionLabel>🧩 System design</SectionLabel>
          {sd.sequence && <MermaidBlock label="Sequence" chart={sd.sequence} />}
          {sd.er && <MermaidBlock label="Entities" chart={sd.er} />}
          {sd.dataflow && <MermaidBlock label="Data flow" chart={sd.dataflow} />}
          {sd.services && <MermaidBlock label="Services" chart={sd.services} />}
        </div>
      )}

      {/* Development plan */}
      {report.developmentPlan && (
        <div>
          <SectionLabel>🛠 Development plan</SectionLabel>
          {report.developmentPlan.weeks?.length > 0 && (
            <ol className="space-y-2 list-decimal pl-5">
              {report.developmentPlan.weeks.map((w, i) => (
                <li key={i}>
                  <div className="font-mono text-[12px] text-white">{w.label}</div>
                  <ul className="list-disc pl-5 space-y-0.5 mt-1">
                    {w.goals.map((g, j) => <li key={j} className="text-[12px] text-white/75">{g}</li>)}
                  </ul>
                </li>
              ))}
            </ol>
          )}
          {report.developmentPlan.milestones?.length ? (
            <div className="mt-2 text-[12px] text-white/70">Milestones: {report.developmentPlan.milestones.join(" · ")}</div>
          ) : null}
        </div>
      )}

      {/* Learning */}
      {report.learning && (
        <div className="space-y-1.5">
          <SectionLabel>📚 Explainer</SectionLabel>
          {report.learning.technical && <p className="text-[12.5px]"><span className="text-white/45">Technical: </span>{report.learning.technical}</p>}
          {report.learning.layman && <p className="text-[12.5px]"><span className="text-white/45">Plain English: </span>{report.learning.layman}</p>}
          {report.learning.example && <p className="text-[12.5px]"><span className="text-white/45">Example: </span>{report.learning.example}</p>}
          <div className="grid sm:grid-cols-2 gap-2 mt-1">
            {report.learning.whenToUse?.length > 0 && (
              <div className="border border-emerald-400/20 bg-emerald-500/5 rounded p-2 text-[12px]">
                <div className="text-emerald-300 text-[10.5px] uppercase tracking-[0.2em] mb-1">When to use</div>
                <ul className="list-disc pl-4 space-y-0.5">{report.learning.whenToUse.map((s, i) => <li key={i}>{s}</li>)}</ul>
              </div>
            )}
            {report.learning.whenNotToUse?.length > 0 && (
              <div className="border border-red-400/20 bg-red-500/5 rounded p-2 text-[12px]">
                <div className="text-red-300 text-[10.5px] uppercase tracking-[0.2em] mb-1">When NOT to use</div>
                <ul className="list-disc pl-4 space-y-0.5">{report.learning.whenNotToUse.map((s, i) => <li key={i}>{s}</li>)}</ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Launch */}
      {report.launch && (
        <div className="space-y-2">
          <SectionLabel>🚀 Launch</SectionLabel>
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
          {report.launch.pricingIdeas?.length ? (
            <div className="text-[12px]"><span className="text-white/45">Pricing ideas: </span>{report.launch.pricingIdeas.join(" · ")}</div>
          ) : null}
          {report.launch.growthExperiments?.length ? (
            <div className="text-[12px]"><span className="text-white/45">Growth: </span>{report.launch.growthExperiments.join(" · ")}</div>
          ) : null}
          {report.launch.checklist?.length ? (
            <ul className="list-disc pl-5 space-y-0.5">{report.launch.checklist.map((c, i) => <li key={i} className="text-[12.5px]">{c}</li>)}</ul>
          ) : null}
        </div>
      )}

      {/* Recommended stack (legacy) */}
      {report.recommendedStack?.length > 0 && (
        <div>
          <SectionLabel>Recommended stack</SectionLabel>
          <div className="flex flex-wrap gap-1.5">
            {report.recommendedStack.map((s, i) => (
              <span key={i} className="font-mono text-[11px] border border-white/15 px-2 py-0.5 rounded">{s}</span>
            ))}
          </div>
        </div>
      )}

      {/* Resources */}
      {report.resources?.length > 0 && (
        <div>
          <SectionLabel>Resources ({report.resources.length})</SectionLabel>
          <ul className="space-y-1.5">
            {report.resources.map((r, i) => (
              <li key={i} className="border border-white/10 bg-white/[0.02] rounded p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <a href={r.url} target="_blank" rel="noreferrer" className="text-sky-300 hover:underline inline-flex items-center gap-1 text-[12.5px] font-mono">
                    {r.title} <ExternalLink className="h-3 w-3" />
                  </a>
                  <span className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-white/40">
                    {r.kind}{typeof r.stars === "number" ? ` · ${r.stars}★` : ""}
                  </span>
                </div>
                <p className="mt-1 text-[12px] text-white/70">{r.why}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Knowledge Graph */}
      {report.graph && (report.graph.nodes?.length || report.graph.edges?.length) ? (
        <div className="space-y-2">
          <SectionLabel>🕸 Knowledge graph</SectionLabel>
          {report.graph.nodes?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {report.graph.nodes.map((n) => (
                <span key={n.id} className={`font-mono text-[11px] border px-2 py-0.5 rounded ${graphCategoryColor(n.category)}`}>
                  {n.label}
                </span>
              ))}
            </div>
          )}
          {report.graph.edges?.length > 0 && (
            <ul className="text-[11.5px] font-mono text-white/55 space-y-0.5">
              {report.graph.edges.slice(0, 40).map((e, i) => (
                <li key={i}>{e.from} → <span className="text-white/40">{e.relation}</span> → {e.to}</li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {report.nextSteps?.length > 0 && (
        <div>
          <SectionLabel>Next steps</SectionLabel>
          <ol className="space-y-1.5 list-decimal pl-5">
            {report.nextSteps.map((s, i) => (
              <li key={i} className="text-[12.5px]">{s}</li>
            ))}
          </ol>
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
