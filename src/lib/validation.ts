import { z } from "zod";
import { taxonomy } from "./catalog/taxonomy";
import { isToolLogoSource } from "./catalog/logos";
export const safeWebUrl = z
  .string()
  .url()
  .refine((s) => {
    try {
      const u = new URL(s);
      return (
        ["https:", "http:"].includes(u.protocol) && !u.username && !u.password
      );
    } catch {
      return false;
    }
  }, "Use a public http or https URL without credentials.");
export const reviewInput = z.object({
  toolId: z.string().min(1).max(100),
  rating: z.coerce.number().int().min(1).max(5),
  body: z.string().trim().min(20).max(4000),
});
export const toolInput = z.object({
  name: z.string().trim().min(2).max(100),
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .max(100),
  description: z.string().trim().min(20).max(1200),
  categoryId: z
    .string()
    .refine((id) => taxonomy.categories.some((c) => c.id === id)),
  website: safeWebUrl,
  logoUrl: z
    .string()
    .trim()
    .max(2000)
    .refine(
      (value) => value === "" || isToolLogoSource(value),
      "Use an HTTPS image URL or a local /tool-logos/ image path.",
    )
    .optional(),
  pricing: z.enum(["free", "freemium", "paid", "unknown"]),
  bestFor: z.string().trim().min(3).max(300),
  notBestFor: z.string().trim().min(3).max(300),
});
export const claimInput = z.object({
  toolId: z.string().min(1).max(100),
  company: z.string().trim().min(2).max(200),
  role: z.string().trim().min(2).max(100),
  proof: z.string().trim().min(30).max(4000),
});
