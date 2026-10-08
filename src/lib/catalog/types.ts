export const verificationStates = [
  "unverified",
  "auto_checked",
  "human_reviewed",
  "vendor_confirmed",
  "needs_reverification",
  "deprecated",
] as const;
export type Tool = {
  id: string;
  slug: string;
  name: string;
  logoUrl?: string | null;
  description: string;
  website: string | null;
  categoryId: string;
  subcategoryId: string | null;
  useCaseIds: string[];
  industries: {
    id: string;
    fit: "native" | "strong" | "general" | "suggested";
    relevance: number;
  }[];
  listingTypeId: string;
  pricing: "free" | "freemium" | "paid" | "unknown";
  startingPrice: string | null;
  freePlan: boolean | null;
  trial: boolean | null;
  features: string[];
  integrations: string[];
  platforms: string[];
  bestFor: string;
  notBestFor: string;
  pros: string[];
  limitations: string[];
  verification: (typeof verificationStates)[number];
  verified: boolean;
  lastVerified: string | null;
  claimed: boolean;
  rating: number | null;
  reviewCount: number;
  demo: boolean;
};
export type CatalogFilters = {
  q?: string;
  category?: string;
  subcategory?: string;
  industry?: string;
  useCase?: string;
  pricing?: string;
  free?: string;
  trial?: string;
  verification?: string;
  verified?: string;
  recency?: string;
  claimed?: string;
  sort?: string;
  rating?: string;
  type?: string;
};
