"use client";

import { useState } from "react";
import type { Tool } from "@/lib/catalog/types";
import { toolLogoSource } from "@/lib/catalog/logos";

export function ToolLogo({
  tool,
  variant = "card",
}: {
  tool: Pick<Tool, "name" | "slug" | "demo" | "logoUrl">;
  variant?: "card" | "featured" | "compact";
}) {
  const source = toolLogoSource(tool);
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const size = variant === "featured" ? 64 : variant === "compact" ? 32 : 48;
  const initials = tool.name
    .trim()
    .split(/\s+/)
    .map((word) => word[0])
    .slice(0, 2)
    .join("");
  return (
    <span className={`tool-logo tool-logo-${variant}`}>
      {source && source !== failedSource ? (
        <img
          src={source}
          alt={`${tool.name} logo`}
          width={size}
          height={size}
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailedSource(source)}
        />
      ) : (
        <span aria-label={`${tool.name} initials`}>{initials}</span>
      )}
    </span>
  );
}
