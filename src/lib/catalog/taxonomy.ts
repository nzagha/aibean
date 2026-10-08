import data from "@/data/taxonomy.json";
export const taxonomy = data;
export const activeUseCases = data.useCases.filter((c) => c.id !== "UC-035");
export const categoryById = (id: string) =>
  data.categories.find((c) => c.id === id);
export const industryById = (id: string) =>
  data.industries.find((c) => c.id === id);
// Older workbook entities are preserved for provenance, never activated as MVP modules.
export const toolListingTypes = data.listingTypes.filter((t) =>
  ["LST-01", "LST-08", "LST-09", "LST-10", "LST-11", "LST-12"].includes(t.id),
);
export const scopes = [
  ["tools", "AI Tools"],
  ["skills", "AI Skills"],
  ["playbooks", "Playbooks"],
  ["creators", "Creators"],
  ["events", "Events"],
] as const;
