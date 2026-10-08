const demoLogoSlugs = new Set([
  "draft-studio",
  "code-compass",
  "image-workshop",
  "flow-desk",
  "property-notes",
  "research-map",
]);

export function isToolLogoSource(value: string) {
  if (/^\/tool-logos\/[a-zA-Z0-9_-]+\.(svg|png|webp|jpe?g)$/.test(value))
    return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}

export function toolLogoSource(tool: {
  logoUrl?: string | null;
  slug: string;
  demo: boolean;
}) {
  if (tool.logoUrl && isToolLogoSource(tool.logoUrl)) return tool.logoUrl;
  // Also supports demo rows seeded before logos were introduced.
  if (tool.demo && demoLogoSlugs.has(tool.slug))
    return `/tool-logos/${tool.slug}.svg`;
  return null;
}
