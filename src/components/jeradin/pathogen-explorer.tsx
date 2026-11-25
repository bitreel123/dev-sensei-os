import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { explorerQuery } from "@/lib/health-evidence.queries";
import { evidenceDate } from "./search-explorer";

const pathogens = ["Malaria", "Tuberculosis", "Influenza", "Cholera", "Dengue", "Mpox", "Antimicrobial resistance"];

export function PathogenExplorer() {
  const [input, setInput] = useState("");
  const [term, setTerm] = useState("Malaria");
  const { data, isFetching } = useQuery({ ...explorerQuery(term), refetchInterval: false });
  const items = data ? [...data.research.entries, ...data.news].slice(0, 12) : [];
  return <section aria-label="Pathogen research">
    <form className="jd-search" onSubmit={e => { e.preventDefault(); if (input.trim()) setTerm(input.trim()); }}><Search /><input value={input} onChange={e => setInput(e.target.value)} placeholder="Search a pathogen, e.g. cholera" aria-label="Search pathogens" /><Button type="submit" aria-label="Search"><span className="jd-search-word">Search</span><ArrowRight /></Button></form>
    <div className="jd-chips" style={{ marginTop: 10 }}>{pathogens.map(p => <button key={p} type="button" onClick={() => setTerm(p)} aria-pressed={term === p} style={term === p ? { background: "var(--foreground)", color: "var(--background)" } : undefined}>{p}</button>)}</div>
    <div className="jd-section-head" style={{ marginTop: 16 }}><h2>Latest on {term}</h2></div>
    {isFetching && !items.length ? <p role="status">Searching…</p> : items.length ? <div className="jd-path-results">{items.map(e => <Link key={e.id} to="/evidence/$id" params={{ id: e.id }}><small>{e.kind === "news" ? "News" : "Research"} · {evidenceDate(e.published_at)}</small><h3 style={{ fontWeight: 700 }}>{e.title}</h3><p>{e.summary.slice(0, 200)}{e.summary.length > 200 ? "…" : ""}</p></Link>)}</div> : <p role="status">No results found for {term}.</p>}
  </section>;
}
