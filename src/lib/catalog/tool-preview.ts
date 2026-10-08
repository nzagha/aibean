import type { Tool } from "./types";
import type { PreviewData } from "../exploration";
export function toolPreview(tool: Tool, sponsor?: string): PreviewData {
  return {
    id: `tool:${tool.id}`,
    title: tool.name,
    summary: tool.description,
    href: `/tools/${tool.slug}`,
    linkLabel: "Open full tool details",
    notice: tool.demo
      ? "Fictional development example. No real product or performance claims are implied."
      : sponsor
        ? `Sponsored placement · Paid for by ${sponsor}. Sponsorship does not change verification or organic rank.`
        : undefined,
    details: [
      { title: "Where it fits", text: tool.bestFor },
      { title: "What to check first", text: tool.notBestFor },
      {
        title: "Features at a glance",
        text: tool.features.length
          ? tool.features.join(" · ")
          : "Features have not yet been documented.",
      },
      {
        title: "Pricing & verification",
        text: `${tool.startingPrice || "Starting price: unknown / not verified"}. Last verified: ${tool.lastVerified || "Not yet verified"}.`,
      },
    ],
  };
}
