import Link from "next/link";
import {
  ArrowUpRight,
  MessageCircle,
  PenLine,
  Image,
  CodeXml,
  Building2,
} from "lucide-react";
import { taxonomy } from "@/lib/catalog/taxonomy";
import { PreviewLink } from "./interactive-preview";
const featured = [
  ["CAT-01", MessageCircle, "blue"],
  ["CAT-02", PenLine, "peach"],
  ["CAT-03", Image, "lavender"],
  ["CAT-07", CodeXml, "mint"],
] as const;
export function DiscoverySections() {
  return (
    <>
      <section className="section container" aria-labelledby="category-title">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Pick a direction</span>
            <h2 id="category-title">Big ideas. The right tools.</h2>
          </div>
          <Link href="/tools" className="text-link">
            Explore all 25 categories →
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map(([id, Icon, tone]) => {
            const c = taxonomy.categories.find((c) => c.id === id)!;
            return (
              <PreviewLink
                key={id}
                card
                preview={{
                  id: `category:${id}`,
                  title: c.name,
                  summary: c.description,
                  href: `/tools?category=${id}`,
                  linkLabel: "Explore this category",
                  details: [
                    {
                      title: "Start with a specific task",
                      text:
                        c.subcategories
                          .slice(0, 5)
                          .map((sub) => sub.name)
                          .join(" · ") ||
                        "Browse the category to find a tool for your task.",
                    },
                    {
                      title: "Make a confident shortlist",
                      text: "Use pricing, use case, and verification filters. Compare two to four tools before choosing what to try.",
                    },
                  ],
                }}
                className={`category-card ${tone}`}
              >
                <div className="flex items-center justify-between">
                  <Icon size={28} />
                  <ArrowUpRight size={19} />
                </div>
                <h3>{c.name}</h3>
                <p>{c.description}</p>
              </PreviewLink>
            );
          })}
        </div>
        <div className="category-pills">
          {["CAT-09", "CAT-18", "CAT-23", "CAT-15"].map((id) => {
            const c = taxonomy.categories.find((c) => c.id === id)!;
            return (
              <Link key={id} href={`/tools?category=${id}`}>
                {c.name}
              </Link>
            );
          })}
        </div>
      </section>
      <section
        className="container business-section"
        aria-labelledby="business-title"
      >
        <div className="section-heading">
          <div>
            <span className="eyebrow">Your industry. Your context.</span>
            <h2 id="business-title">AI for Your Business.</h2>
          </div>
          <Link href="/industries" className="text-link">
            Explore 18 industries →
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {["VER-03", "VER-04", "VER-09"].map((id) => {
            const i = taxonomy.industries.find((i) => i.id === id)!;
            return (
              <PreviewLink
                className="placeholder-card industry-card"
                key={id}
                card
                preview={{
                  id: `industry:${id}`,
                  title: i.name,
                  summary: i.description,
                  href: `/industries/${i.slug}`,
                  linkLabel: "Find tools for this industry",
                  details: [
                    {
                      title: "Why these tools appear",
                      text: "Industry results include native and strong-fit tools. General-purpose and suggested matches are left out to keep the list focused.",
                    },
                    {
                      title: "Before you choose",
                      text: "Check the use case, limitations, and last verified date. A relevant category is a starting point, not a guarantee of suitability.",
                    },
                  ],
                }}
              >
                <Building2 size={24} />
                <h3 className="mt-5">{i.name}</h3>
                <p className="mt-3 text-sm">{i.description}</p>
                <span className="text-link mt-6">Find your fit →</span>
              </PreviewLink>
            );
          })}
        </div>
      </section>
    </>
  );
}
