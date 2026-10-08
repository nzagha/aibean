import Link from "next/link";
export const metadata = { title: "For Vendors" };
export default function Vendors() {
  return (
    <div className="container py-16">
      <span className="eyebrow">Trust is earned</span>
      <h1 className="my-6 font-display text-5xl font-bold">
        Give your tool a clear home.
      </h1>
      <p className="max-w-2xl text-lg mb-8">
        Claim your listing, keep information accurate, and understand how people
        discover your tool.
      </p>
      <div className="flex flex-wrap gap-4 mb-12">
        <Link href="/featured" className="button secondary">
          Feature your tool · $99 / 5 days →
        </Link>
        <Link href="/tools" className="button primary">
          Find your tool to claim →
        </Link>
        <Link href="/vendor" className="button secondary">
          Vendor workspace
        </Link>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {[
          [
            "1. Prove your affiliation",
            "Sign in, choose your tool, and provide company and role information with evidence.",
          ],
          [
            "2. Pay for review",
            "A claim fee pays for the review process. Approval is a separate admin decision.",
          ],
          [
            "3. Manage responsibly",
            "Approved owners receive controlled access. Edits and verification remain reviewed workflows.",
          ],
        ].map(([title, text]) => (
          <article className="placeholder-card" key={title}>
            <h2 className="text-2xl">{title}</h2>
            <p className="mt-5 text-sm">{text}</p>
          </article>
        ))}
      </div>
      <p className="preview-notice mt-8">
        Owner claimed and aiBean Verified are different signals. Vendors cannot
        buy organic rank, award their own verification, or remove user reviews.
      </p>
    </div>
  );
}
