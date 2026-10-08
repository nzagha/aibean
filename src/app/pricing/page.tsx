export const dynamic = "force-dynamic";
import { requireUser } from "@/lib/auth";
export const metadata = {
  title: "Pricing",
  robots: { index: false, follow: false },
};
export default async function Pricing() {
  await requireUser("/pricing", false);
  return (
    <div className="container py-16">
      <span className="eyebrow">Membership & services</span>
      <h1 className="my-6 font-display text-5xl font-bold">
        Pricing is being configured.
      </h1>
      <p className="max-w-2xl">
        Free membership remains available. Creator and Vendor subscriptions,
        submission fees, and verification pricing will be published here once
        approved. No charges can be initiated from this page.
      </p>
    </div>
  );
}
