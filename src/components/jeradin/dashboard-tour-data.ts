export type AnatomyStage = {
  organ: string;
  label: string;
  function: string;
  explanation: string;
  points: [number, number][];
  route: [number, number][];
};

// Coordinates reference the uncropped square educational atlas, not a clinical model.
export const researchTour: AnatomyStage[] = [
  { organ: "Lungs", label: "01 · Where the change begins", function: "Lungs exchange oxygen and carbon dioxide.", explanation: "In lung cancer, altered cells can multiply without the normal controls on growth. This illustration marks lung tissue, not a measured tumour.", points: [[43, 36], [57, 36]], route: [[50, 23], [47, 29], [43, 36]] },
  { organ: "Airways", label: "02 · The local effect", function: "Airways carry air into the lungs.", explanation: "A growing tumour may narrow an airway. Cough or breathlessness can have many other causes; this is not a diagnosis.", points: [[50, 25], [47, 31]], route: [[50, 21], [50, 26], [47, 31], [43, 36]] },
  { organ: "Lymphatic system", label: "03 · How spread can happen", function: "Lymph vessels drain fluid and support immune defence.", explanation: "Some cancer cells can travel through lymph vessels to nearby nodes. Whether spread has occurred requires clinical assessment.", points: [[39, 28], [61, 28]], route: [[43, 36], [40, 32], [39, 28], [50, 24]] },
  { organ: "Blood circulation", label: "04 · Connecting the evidence", function: "Blood carries oxygen and nutrients around the body.", explanation: "Cancer cells can sometimes enter the circulation. Research examines how treatments interrupt growth and spread; effects vary by cancer type.", points: [[51, 40], [46, 47]], route: [[57, 36], [51, 40], [46, 47]] },
];

export const pathogenTour: AnatomyStage[] = [
  { organ: "Entry through skin", label: "01 · Transmission", function: "Skin is a protective barrier.", explanation: "An infected Anopheles mosquito can introduce malaria parasites through a bite. The marker represents an entry site, not an organ injury.", points: [[71, 44]], route: [[71, 44], [65, 35], [53, 30]] },
  { organ: "Liver", label: "02 · Liver stage", function: "The liver processes nutrients and supports metabolism.", explanation: "Parasites travel to the liver and multiply in liver cells before entering the blood stage.", points: [[45, 48]], route: [[53, 30], [51, 40], [45, 48]] },
  { organ: "Red blood cells", label: "03 · Blood stage", function: "Red blood cells transport oxygen.", explanation: "Parasites infect red blood cells and multiply. Cycles of cell rupture contribute to fever and can cause anaemia.", points: [[50, 41], [67, 55]], route: [[45, 48], [50, 41], [61, 33], [67, 55]] },
  { organ: "Spleen", label: "04 · Immune response", function: "The spleen filters blood and supports immune defence.", explanation: "The spleen helps remove infected blood cells. Severe malaria can affect multiple organs; this tour does not predict an individual’s risk.", points: [[59, 48]], route: [[67, 55], [55, 54], [59, 48]] },
];