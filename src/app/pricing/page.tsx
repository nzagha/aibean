export const dynamic = "force-dynamic";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { commerceAvailable } from "@/lib/admin/commerce-storage";
import { readOwnCommerce } from "@/lib/admin/commerce-queries";
import Link from "next/link";
export const metadata = {
  title: "Pricing",
  robots: { index: false, follow: false },
};
export default async function Pricing() {
  const user = await requireUser("/pricing", false);
  const data =
    process.env.DATABASE_URL && (await commerceAvailable(db()))
      ? await readOwnCommerce(db(), user.id)
      : null;
  return (
    <div className="container py-16">
      <span className="eyebrow">Membership & services</span>
      <h1 className="my-6 font-display text-5xl font-bold">
        {data ? "Membership & services." : "Pricing is being configured."}
      </h1>
      <p className="max-w-2xl">
        Free membership remains available. Creator and Vendor subscriptions,
        submission fees, and verification pricing are configured independently.
        Payment never bypasses editorial approval or awards capabilities.
      </p>
      {data && (
        <div className="grid gap-6 md:grid-cols-3 mt-8">
          {data.products.map((product) => (
            <article key={product.id} className="placeholder-card">
              <h2 className="text-2xl">{product.name}</h2>
              <p className="my-5">
                USD {(product.amount / 100).toFixed(2)}{" "}
                {product.id.endsWith("subscription")
                  ? "per month"
                  : "per request"}{" "}
                · Sandbox
              </p>
              <Link
                className="text-link"
                href={
                  product.id === "submission"
                    ? "/account/submissions"
                    : "/account/billing"
                }
              >
                View eligible workflows →
              </Link>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
