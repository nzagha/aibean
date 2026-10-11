import { ArrowUpRight, Bookmark } from "lucide-react";
import type { Tool } from "@/lib/catalog/types";
import { categoryById } from "@/lib/catalog/taxonomy";
import { CompareButton } from "./compare-provider";
import { saveTool } from "@/app/actions";
import { ToolLogo } from "./tool-logo";
import { PreviewCard, PreviewLink } from "./interactive-preview";
import { toolPreview } from "@/lib/catalog/tool-preview";
export function TrustStatus({ tool }: { tool: Tool }) {
  return (
    <div className="flex flex-wrap gap-2">
      <span className="badge">{tool.verification.replaceAll("_", " ")}</span>
      {tool.verified && (
        <span className="badge verified-badge">aiBean Verified</span>
      )}
      {tool.claimed && <span className="badge">Owner claimed</span>}
    </div>
  );
}
export function ToolCard({ tool }: { tool: Tool }) {
  const preview = toolPreview(tool);
  return (
    <PreviewCard className="tool-card" preview={preview}>
      <div className="flex items-center justify-between">
        <ToolLogo tool={tool} />
        {tool.demo && <span className="badge">Example listing</span>}
        <form action={saveTool}>
          <input type="hidden" name="toolId" value={tool.id} />
          <input type="hidden" name="returnTo" value={`/tools/${tool.slug}`} />
          <button aria-label={`Save ${tool.name}`} className="icon-button">
            <Bookmark size={18} />
          </button>
        </form>
      </div>
      <p className="mt-5 text-xs text-muted">
        {tool.categoryLabel || categoryById(tool.categoryId)?.name}
      </p>
      <h3 className="mt-2">
        <PreviewLink preview={preview}>{tool.name}</PreviewLink>
      </h3>
      <p className="mt-3 text-sm leading-relaxed">{tool.description}</p>
      <div className="mt-5 flex flex-wrap gap-2">
        <span className="badge capitalize">{tool.pricing}</span>
        <span className="badge">
          {tool.reviewCount
            ? `${tool.rating?.toFixed(1)} ★ · ${tool.reviewCount} reviews`
            : "No reviews yet"}
        </span>
      </div>
      <div className="mt-4">
        <TrustStatus tool={tool} />
      </div>
      <p className="mt-3 text-xs text-muted">
        Last verified:{" "}
        {tool.lastVerified
          ? new Date(tool.lastVerified).toLocaleDateString("en-US", {
              timeZone: "UTC",
            })
          : "Not yet verified"}
      </p>
      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-6">
        <PreviewLink preview={preview} className="text-link">
          View tool <ArrowUpRight size={16} />
        </PreviewLink>
        <CompareButton tool={tool} />
      </div>
    </PreviewCard>
  );
}
