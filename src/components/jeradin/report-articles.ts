import { pathogenTour, researchTour, type AnatomyStage } from "./dashboard-tour-data";

export type ReportKind = "research" | "pathogen";
export type ReportArticle = {
  kind: ReportKind;
  eyebrow: string;
  title: string;
  subtitle: string;
  tags: string[];
  facts: [string, string][];
  overview: string;
  keyFinding: string;
  journey: [string, string][];
  stages: AnatomyStage[];
  past: [string, string][];
  recent: [string, string][];
  effects: string[];
  effectsNote: string;
  research: string[];
  solutions: string[];
  data: string[];
  related: string[];
  sources: { title: string; publisher: string; url: string }[];
};

export const reportArticles: Record<ReportKind, ReportArticle> = {
  research: {
    kind: "research", eyebrow: "Research report · Oncology",
    title: "Lung cancer", subtitle: "From cell changes to treatment research",
    tags: ["Oncology", "Lungs", "Treatment research", "Educational brief"],
    facts: [["Primary organ", "Lungs"], ["Main types", "Non-small cell · Small cell"], ["Key risk", "Tobacco smoke"], ["Research focus", "Targeted therapy"]],
    overview: "Lung cancer begins when cells in the lung lose normal controls on growth. Researchers study which genetic changes drive that growth, how tumours spread and how treatments interrupt specific signals.",
    keyFinding: "Molecular testing helps separate tumour subtypes, which is why treatment research is increasingly organised around specific genetic changes.",
    journey: [["Change", "Cell signals"], ["Growth", "Lung tissue"], ["Spread", "Lymph & blood"], ["Research", "Targets"]],
    stages: researchTour,
    past: [["1950s", "Smoking linked to lung cancer in population studies"], ["2000s", "First targeted therapies for specific mutations"], ["2010s", "Immunotherapy studied in advanced disease"]],
    recent: [["Screening", "Low-dose CT screening in high-risk groups"], ["Biomarkers", "Expanded testing for treatment selection"], ["Resistance", "Studies on why tumours stop responding"]],
    effects: ["Persistent cough", "Breathlessness", "Chest pain", "Fatigue", "Weight loss", "Coughing blood"],
    effectsNote: "These symptoms have many other causes. Anyone concerned should speak with a clinician.",
    research: ["Targeted therapy trials by mutation", "Immunotherapy combinations", "Early detection and screening"],
    solutions: ["Surgery for early disease", "Radiotherapy and chemotherapy", "Targeted and immune therapies", "Smoking cessation and prevention"],
    data: ["Study design and comparison groups", "Biomarker and subtype fields", "Trial phase and endpoints"],
    related: ["Breast cancer", "Mesothelioma", "COPD", "Colorectal cancer"],
    sources: [
      { title: "Lung Cancer — Patient Version", publisher: "National Cancer Institute", url: "https://www.cancer.gov/types/lung" },
      { title: "Lung cancer fact sheet", publisher: "World Health Organization", url: "https://www.who.int/news-room/fact-sheets/detail/lung-cancer" },
      { title: "Lung cancer clinical studies", publisher: "ClinicalTrials.gov", url: "https://clinicaltrials.gov/search?cond=Lung%20Cancer" },
      { title: "Lung neoplasms literature", publisher: "PubMed", url: "https://pubmed.ncbi.nlm.nih.gov/?term=lung+neoplasms" },
    ],
  },
  pathogen: {
    kind: "pathogen", eyebrow: "Pathogen report · Parasite",
    title: "Malaria", subtitle: "Plasmodium falciparum: entry, spread and impact",
    tags: ["Parasite", "Vector-borne", "Blood", "Educational brief"],
    facts: [["Pathogen", "Plasmodium falciparum"], ["Vector", "Anopheles mosquito"], ["Early stage", "Liver cells"], ["Blood stage", "Red blood cells"]],
    overview: "Malaria is caused by Plasmodium parasites spread through the bites of infected female Anopheles mosquitoes. The parasite multiplies in the liver, then infects red blood cells, causing cycles of fever.",
    keyFinding: "P. falciparum causes the most severe malaria; prompt diagnosis and treatment are central to preventing complications.",
    journey: [["Entry", "Mosquito bite"], ["Liver stage", "Multiplication"], ["Blood stage", "Red cells"], ["Response", "Spleen & immunity"]],
    stages: pathogenTour,
    past: [["1880", "Parasite identified in human blood"], ["1897", "Mosquito transmission demonstrated"], ["2000s", "Artemisinin combination therapies adopted"]],
    recent: [["Vaccines", "WHO-recommended malaria vaccines for children"], ["Resistance", "Monitoring partial artemisinin resistance"], ["Vectors", "Insecticide resistance in mosquitoes"]],
    effects: ["Fever", "Chills", "Headache", "Fatigue", "Anaemia", "Organ complications"],
    effectsNote: "Severe malaria is a medical emergency. This page is educational and does not assess individual risk.",
    research: ["Next-generation vaccines", "Drug resistance surveillance", "Vector control methods"],
    solutions: ["Artemisinin-based combination therapy", "Insecticide-treated nets", "Indoor residual spraying", "Vaccination where recommended"],
    data: ["Parasite species and stage", "Region and transmission season", "Treatment and resistance markers"],
    related: ["Dengue", "Yellow fever", "Babesiosis", "Leishmaniasis"],
    sources: [
      { title: "Malaria fact sheet", publisher: "World Health Organization", url: "https://www.who.int/news-room/fact-sheets/detail/malaria" },
      { title: "About Malaria", publisher: "CDC", url: "https://www.cdc.gov/malaria/about/index.html" },
      { title: "Malaria clinical studies", publisher: "ClinicalTrials.gov", url: "https://clinicaltrials.gov/search?cond=Malaria" },
      { title: "Plasmodium falciparum literature", publisher: "PubMed", url: "https://pubmed.ncbi.nlm.nih.gov/?term=plasmodium+falciparum" },
    ],
  },
};
