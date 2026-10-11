import { z } from "zod";
import { recordId, reasonInput, revisionInput } from "./contracts";
export const productKinds = [
  "submission",
  "edit",
  "verification",
  "vendor_subscription",
  "creator_subscription",
] as const;
export const productInput = z
  .object({
    kind: z.enum(productKinds),
    name: z.string().trim().min(3).max(100),
    amount: z.coerce.number().int().min(0).max(1000000),
    active: z.boolean(),
    revision: revisionInput.optional(),
    reason: reasonInput,
  })
  .superRefine((p, ctx) => {
    if (!p.amount && p.kind !== "verification")
      ctx.addIssue({
        code: "custom",
        path: ["amount"],
        message: "Only verification can use a zero-price promotion.",
      });
  });
export const submissionDecision = z.object({
  id: recordId,
  revision: revisionInput,
  decision: z.enum(["approved", "rejected"]),
  reason: reasonInput,
});
export type ProductKind = (typeof productKinds)[number];
export type CommerceProduct = {
  id: ProductKind;
  name: string;
  amount: number;
  currency: string;
  active: boolean;
  revision: string;
};
export type CommercePayment = {
  id: string;
  user_id: string;
  kind: ProductKind;
  subject_id: string;
  amount: number;
  currency: string;
  status: string;
  stripe_session_id: string | null;
  revision: string;
  created_at: string;
};
export type Subscription = {
  id: string;
  user_id: string;
  product_id: ProductKind;
  stripe_subscription_id: string;
  status: string;
  ends_at: string | null;
  cancel_at_period_end: boolean;
  revision: string;
};
// A signed, test-mode Stripe session is the only settlement input. Neither
// admin forms nor redirect query parameters can mark an order paid.
export type SandboxSettlement = {
  eventId: string;
  livemode: boolean;
  sessionId: string;
  paymentId: string;
  clientReferenceId: string | null;
  paymentStatus: string;
  amount: number | null;
  currency: string | null;
  subscriptionId?: string | null;
};
