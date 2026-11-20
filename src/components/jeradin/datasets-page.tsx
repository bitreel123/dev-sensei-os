import { useState } from "react";
import { ArrowRight, Bookmark, CalendarDays, Check, Database, Dna, Download, Grid2X2, Microscope, Pill, Search, Stethoscope, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import banner from "@/assets/dataset-banner.png.asset.json";
import cancer from "@/assets/dataset-cancer.png.asset.json";
import brain from "@/assets/dataset-brain.png.asset.json";
import virus from "@/assets/dataset-virus.png.asset.json";

const categories = [
  { name: "Genomics & Bioinformatics", icon: Dna },
  { name: "Clinical Trials", icon: Pill },
  { name: "Diseases & Conditions", icon: Stethoscope },
  { name: "Medical Imaging", icon: Microscope },
  { name: "Drug & Treatment", icon: Pill },
  { name: "Others", icon: Grid2X2 },
];
const datasets = [
  { id: "tcga", title: "TCGA Pan-Cancer Gene Expression Data", description: "Explore a sample catalogue entry for gene-expression research across cancer types from The Cancer Genome Atlas.", category: "Genomics & Bioinformatics", tags: ["Genomics", "Cancer", "Gene expression", "TCGA"], image: cancer.url, detail: "Gene expression", format: "Tabular records", fields: ["Study identifier", "Cancer type", "Gene identifier", "Expression value", "Source reference"] },
  { id: "mri", title: "Brain Tumor MRI Dataset", description: "A sample medical-imaging collection for brain tumour research and analysis.", category: "Medical Imaging", tags: ["Medical imaging", "Brain", "MRI", "Neuro"], image: brain.url, detail: "Medical imaging", format: "Image metadata", fields: ["Study identifier", "Imaging modality", "Anatomical region", "Annotation", "Source reference"] },
  { id: "trials", title: "COVID-19 Clinical Trials Dataset", description: "A sample structured collection of clinical trial registrations, study designs and outcome fields.", category: "Clinical Trials", tags: ["Clinical trials", "COVID-19", "Outcomes", "Global"], image: virus.url, detail: "Trial registrations", format: "Structured records", fields: ["Trial identifier", "Condition", "Intervention", "Study phase", "Study status", "Source reference"] },
];
type Dataset = typeof datasets[number];

export function DatasetsPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [saved, setSaved] = useState<string[]>([]);
  const [onlySaved, setOnlySaved] = useState(false);
  const [selected, setSelected] = useState<Dataset | null>(null);
  const visible = datasets.filter(d => (!category || d.category === category) && (!onlySaved || saved.includes(d.id)) && `${d.title} ${d.description} ${d.tags.join(" ")}`.toLowerCase().includes(query.toLowerCase()));
  const toggleSave = (id: string) => setSaved(values => values.includes(id) ? values.filter(v => v !== id) : [...values, id]);
  return <>
    <div className="jd-catalog-heading"><div><h1><Database />Datasets</h1><p>Biomedical data for research, analysis and discovery.</p></div><Button variant={onlySaved ? "default" : "outline"} onClick={() => setOnlySaved(v => !v)} aria-pressed={onlySaved}><Bookmark />My Datasets{saved.length > 0 && ` (${saved.length})`}</Button></div>
    <section className="jd-dataset-banner"><img src={banner.url} alt="Biomedical illustration of lungs, heart and a DNA helix" /><div className="jd-banner-copy"><span className="jd-banner-eyebrow">Biomedical catalogue · Sample preview</span><h2>Powering Better Research<br />with Biomedical Data</h2><p>Explore structured research collections, clinical studies and medical imaging.</p><form className="jd-dataset-search" onSubmit={e => e.preventDefault()}><Search /><input aria-label="Search datasets" placeholder="Search datasets…" value={query} onChange={e => setQuery(e.target.value)} /><Button size="icon" type="submit" aria-label="Search catalogue"><ArrowRight /></Button></form></div><div className="jd-banner-checks">{["Source references", "Structured fields", "Research access"].map(label => <span key={label}><Check />{label}</span>)}</div></section>
    <div className="jd-category-grid" aria-label="Dataset categories">{categories.map(c => <Button key={c.name} variant="outline" className={`jd-category ${category === c.name ? "is-selected" : ""}`} onClick={() => setCategory(current => current === c.name ? "" : c.name)} aria-pressed={category === c.name}><span className="jd-category-symbol"><c.icon /></span><span><strong>{c.name}</strong><small>{datasets.filter(d => d.category === c.name).length || "No"} sample collections</small></span><ArrowRight /></Button>)}</div>
    <div className="jd-catalog-meta"><span>{onlySaved ? "My Datasets" : category || "All datasets"} · {visible.length} {visible.length === 1 ? "collection" : "collections"}</span><span>Sample catalogue · No live downloads</span>{(category || query || onlySaved) && <Button variant="ghost" size="sm" onClick={() => { setCategory(""); setQuery(""); setOnlySaved(false); }}><X />Clear filters</Button>}</div>
    <div className="jd-dataset-list">{visible.map(d => <article className="jd-dataset-row" key={d.id}><img src={d.image} alt={`${d.detail} scientific illustration, not a dataset record`} /><div className="jd-dataset-description"><h2>{d.title}</h2><p>{d.description}</p><div className="jd-dataset-tags">{d.tags.map(t => <span key={t}>{t}</span>)}</div></div><dl className="jd-dataset-stats"><div><Database /><dd>{d.detail}</dd></div><div><CalendarDays /><dd>Sample preview</dd></div><div><Download /><dd>{d.format}</dd></div></dl><Button onClick={() => setSelected(d)}>View Dataset<ArrowRight /></Button></article>)}</div>
    {visible.length === 0 && <div className="jd-catalog-empty"><Database /><h2>No collections here yet</h2><p>{onlySaved ? "You haven’t saved a matching sample collection." : "No sample collections match these filters."}</p><Button variant="outline" onClick={() => { setCategory(""); setQuery(""); setOnlySaved(false); }}>Show all datasets</Button></div>}
    <Dialog open={selected !== null} onOpenChange={open => { if (!open) setSelected(null); }}><DialogContent className="jd-dataset-dialog"><DialogHeader><DialogTitle>{selected?.title}</DialogTitle><DialogDescription>{selected?.description}</DialogDescription></DialogHeader>{selected && <><span className="jd-tag">Sample preview</span><h3>Preview fields</h3><ul>{selected.fields.map(field => <li key={field}><Check />{field}</li>)}</ul><p>Records, licensing checks and downloads are not connected yet. Artwork is illustrative; no research files are included.</p><div className="jd-dialog-actions"><Button variant="outline" onClick={() => toggleSave(selected.id)}><Bookmark />{saved.includes(selected.id) ? "Remove from My Datasets" : "Save to My Datasets"}</Button><Button disabled><Download />Download</Button></div></>}</DialogContent></Dialog>
  </>;
}