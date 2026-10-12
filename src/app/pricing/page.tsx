export const dynamic = "force-dynamic";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { readPricing } from "@/lib/pricing/releases";
import { readMembership } from "@/lib/pricing/entitlements";
import { PricingMatrix } from "@/components/pricing-matrix";
import { PROPOSED_PRICING } from "@/lib/pricing/config";
import { stripeConfigured } from "@/lib/billing";
export const metadata = {
  title: "Pricing",
  robots: { index: false, follow: false },
};
export default async function Pricing() {
  const user = await requireUser("/pricing", false);
  const data = process.env.DATABASE_URL ? await readPricing(db()) : null;
  const member = process.env.DATABASE_URL
    ? await readMembership(db(), user.id)
    : null;
  return (
    <div className="container py-16">
      <span className="eyebrow">Membership & services</span>
      <h1 className="my-6 font-display text-5xl font-bold">
        Membership & services.
      </h1>
      <p className="max-w-2xl">
        Free membership remains available. Creator and Vendor subscriptions,
        submission fees, and verification pricing are configured independently.
        Payment never bypasses editorial approval or awards capabilities.
      </p>
      <PricingMatrix
        config={data?.config || PROPOSED_PRICING}
        user={user.id}
        eligible={member?.plans.map((p) => p.family) || []}
        chargeable={
          !!data?.active &&
          process.env.AIBEAN_PRICING_APPROVED_SHA256 ===
            data.active.config_sha256 &&
          stripeConfigured()
        }
      />
    </div>
  );
}
