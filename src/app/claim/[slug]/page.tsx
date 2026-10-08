import { notFound } from "next/navigation";
import Link from "next/link";
import { getTool } from "@/lib/catalog/repository";
import { requireUser } from "@/lib/auth";
import { billingConfigured } from "@/lib/billing";
import { startClaim } from "../actions";
export const metadata = {
  title: "Claim a Tool",
  robots: { index: false, follow: false },
};
export default async function Claim({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  await requireUser(`/claim/${slug}`);
  const t = await getTool(slug);
  if (!t) notFound();
  return (
    <div className="container py-16">
      <div className="max-w-2xl">
        <span className="eyebrow">Ownership review</span>
        <h1 className="my-6 font-display text-4xl font-bold">
          Claim {t.name}.
        </h1>
        <p className="mb-8">
          Provide evidence of your relationship to the company. Payment covers
          review and does not guarantee approval or aiBean Verified.
        </p>
        {!billingConfigured() || t.demo || t.claimed ? (
          <div className="placeholder-card">
            <h2 className="text-2xl">
              {t.claimed
                ? "This tool already has an owner."
                : "Claims are not enabled for this listing yet."}
            </h2>
            <p className="my-4">
              Development examples cannot be claimed. Real listings require a
              configured test checkout and an independent admin review.
            </p>
            <Link href={`/tools/${slug}`} className="text-link">
              Back to the tool →
            </Link>
          </div>
        ) : (
          <form action={startClaim} className="placeholder-card">
            <p className="preview-notice mb-6">
              Test checkout only. No live payments are accepted in this stage.
            </p>
            <input type="hidden" name="toolId" value={t.id} />
            <label className="field">
              Company
              <input name="company" required minLength={2} maxLength={200} />
            </label>
            <label className="field">
              Your role
              <input name="role" required minLength={2} maxLength={100} />
            </label>
            <label className="field">
              Affiliation evidence
              <textarea
                name="proof"
                required
                minLength={30}
                maxLength={4000}
                rows={5}
                placeholder="Company-domain email, official team page, or other evidence for an admin to review."
              />
            </label>
            <p className="mb-5 text-sm">
              The configured fee is shown in checkout before you confirm. Do not
              submit passwords or private account credentials as evidence.
            </p>
            <button className="button primary">
              Continue to test checkout →
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
