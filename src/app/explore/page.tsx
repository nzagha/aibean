import { redirect } from "next/navigation";
const legacy: Record<string, string> = {
  chatbots: "CAT-01",
  research: "CAT-23",
  "image-generation": "CAT-03",
  productivity: "CAT-18",
  coding: "CAT-07",
  video: "CAT-04",
  automation: "CAT-09",
  marketing: "CAT-15",
  agents: "CAT-09",
};
export default async function Explore({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const p = await searchParams;
  const next = new URLSearchParams();
  if (typeof p.q === "string") next.set("q", p.q.slice(0, 120));
  if (typeof p.category === "string") {
    if (p.category === "real-estate") next.set("industry", "VER-09");
    else next.set("category", legacy[p.category] || p.category);
  }
  redirect("/tools?" + next.toString());
}
