import { z } from "zod";
import { toolInput, safeWebUrl } from "../validation";
import { recordId, reasonInput, revisionInput } from "./contracts";

export const creatorApplicationInput = z.object({
  name: z.string().trim().min(2).max(100),
  bio: z.string().trim().min(30).max(2000),
  links: z.array(safeWebUrl.max(2000)).min(1).max(5),
});
// No slug, taxonomy, trust, review, ownership or commercial fields accepted.
export const vendorEditInput = toolInput.pick({
  name: true,
  description: true,
  website: true,
  logoUrl: true,
  pricing: true,
  bestFor: true,
  notBestFor: true,
});
export type VendorEditInput = z.infer<typeof vendorEditInput>;
export const vendorRequestInput = z.object({
  toolId: recordId,
  baseRevision: revisionInput,
  note: z.string().trim().min(20).max(2000),
  proposed: vendorEditInput,
});
export const verificationRequestInput = z.object({
  toolId: recordId,
  baseRevision: revisionInput,
  note: z.string().trim().min(20).max(2000),
  evidence: z.array(safeWebUrl.max(2000)).min(1).max(5),
});
export const reviewDecisionInput = z.object({
  id: recordId,
  revision: revisionInput,
  decision: z.enum(["approved", "rejected"]),
  reason: reasonInput,
});
export const creatorDecisionInput = reviewDecisionInput.extend({
  decision: z.enum(["approved", "rejected", "suspension_requested"]),
});
export const disputeInput = z.object({
  claimId: recordId,
  reason: reasonInput,
});
export const disputeDecisionInput = z.object({
  id: recordId,
  revision: revisionInput,
  decision: z.enum(["retain", "revoke"]),
  reason: reasonInput,
});
