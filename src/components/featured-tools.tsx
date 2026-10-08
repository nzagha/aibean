import Link from "next/link";
import { ArrowUpRight, Sparkles, Megaphone } from "lucide-react";
import { getFeaturedTools } from "@/lib/featured/repository";
import { demoMode } from "@/lib/catalog/repository";
import { demoTools } from "@/data/demo-tools";
import { categoryById } from "@/lib/catalog/taxonomy";
import { ToolLogo } from "./tool-logo";
import { PreviewCard, PreviewLink } from "./interactive-preview";
import { toolPreview } from "@/lib/catalog/tool-preview";

export async function FeaturedTools() {
  const paid = await getFeaturedTools();
  const preview = paid.length === 0 && demoMode();
  const entries = preview
    ? demoTools
        .slice(0, 3)
        .map((tool) => ({ id: tool.id, tool, sponsorName: "Example sponsor" }))
    : paid;
  return (
    <section
      className="section container featured-section"
      aria-labelledby="featured-title"
    >
      <div className="section-heading">
        <div>
          <span className="eyebrow flex items-center gap-2">
            <Sparkles size={16} /> In the spotlight
          </span>
          <h2 id="featured-title">Featured AI Tools</h2>
          <p className="mt-4 max-w-xl">
            A little more visibility. A whole lot of possibility.
            <br />
            Explore paid placements from the aiBean community.
          </p>
        </div>
        <Link href="/featured" className="button secondary">
          Feature your tool <ArrowUpRight size={17} />
        </Link>
      </div>
      {preview && (
        <p className="featured-disclosure">
          Placement preview · These fictional tools show how the section will
          look. No paid placements are live yet.
        </p>
      )}
      {entries.length > 0 ? (
        <div className="featured-grid">
          {entries.map(({ id, tool, sponsorName }, index) => (
            <PreviewCard
              className="featured-card"
              key={id}
              preview={toolPreview(tool, sponsorName)}
            >
              <div className={`featured-card-top featured-tone-${index % 3}`}>
                <ToolLogo tool={tool} variant="featured" />
                <span className="featured-badge">
                  {preview ? "Example placement" : "Sponsored"}
                </span>
              </div>
              <div className="featured-card-body">
                <span className="eyebrow">
                  {categoryById(tool.categoryId)?.name}
                </span>
                <h3>
                  <PreviewLink preview={toolPreview(tool, sponsorName)}>
                    {tool.name}
                  </PreviewLink>
                </h3>
                <p>{tool.description}</p>
                <div className="featured-card-footer">
                  <span className="text-xs text-muted">
                    {preview ? "Preview only" : `Paid for by ${sponsorName}`}
                  </span>
                  <PreviewLink
                    preview={toolPreview(tool, sponsorName)}
                    className="text-link"
                    label={`Discover ${tool.name}`}
                  >
                    Discover <ArrowUpRight size={16} />
                  </PreviewLink>
                </div>
              </div>
            </PreviewCard>
          ))}
        </div>
      ) : (
        <div className="featured-empty">
          <Megaphone size={32} />
          <h3>Your tool could be the next great find.</h3>
          <p>Paid placements will appear here once approved and activated.</p>
          <Link href="/featured" className="text-link">
            Explore featured placements <ArrowUpRight size={16} />
          </Link>
        </div>
      )}
      <div className="featured-bottom">
        <p>
          Sponsored placements support aiBean. They do not change organic
          rankings, reviews, or verification.
        </p>
        <span>For vendors, creators & users</span>
      </div>
    </section>
  );
}
