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

export function KnowledgeReportBody({ report }: { report: KnowledgeReport }) {
  return (
    <div className="space-y-6 text-[13px] text-white/85 leading-relaxed">
      <div>
        <SectionLabel>Question</SectionLabel>
        <p className="text-white/70 italic">"{report.question}"</p>
      </div>

      {report.laymanSummary && (
        <div>
          <SectionLabel>Summary</SectionLabel>
          <p className="whitespace-pre-wrap">{report.laymanSummary}</p>
        </div>
      )}

      {report.recommendedStack?.length > 0 && (
        <div>
          <SectionLabel>Recommended stack</SectionLabel>
          <div className="flex flex-wrap gap-1.5">
            {report.recommendedStack.map((s, i) => (
              <span key={i} className="font-mono text-[11px] border border-white/15 px-2 py-0.5 rounded">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

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
