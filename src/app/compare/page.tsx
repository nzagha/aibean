import { getIdentity } from "@/lib/auth";
import { db } from "@/lib/db";
import { discoveryAvailable } from "@/lib/discovery/storage";
import { ComparisonEditor } from "@/components/comparison-editor";
import { ComparisonPresentation } from "@/components/comparison-presentation";
import Link from "next/link";
import { getTools } from "@/lib/catalog/repository";
import { comparisonContext } from "@/lib/catalog/comparison";
export const dynamic = "force-dynamic";
export const metadata = { title: "Compare AI Tools" };
export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const p = await searchParams;
  const slugs = [
    ...new Set(
      (typeof p.tools === "string" ? p.tools : "").split(",").filter(Boolean),
    ),
  ];
  const catalog = await getTools();
  const context = comparisonContext(p);
  const selected = slugs
    .map((s) => catalog.find((t) => t.slug === s))
    .filter((t) => !!t);
  if (slugs.length < 2 || slugs.length > 4 || selected.length !== slugs.length)
    return (
      <div className="container py-20">
        <span className="eyebrow">Side by side</span>
        <h1 className="my-6 text-5xl font-display font-bold">
          A clearer choice.
        </h1>
        <p className="mb-8">
          Choose 2–4 available tools from the directory to compare. Unknown or
          unavailable tools cannot be compared.
        </p>
        <Link href="/tools" className="button primary">
          Choose your tools →
        </Link>
      </div>
    );
  const identity = await getIdentity(false);
  const ready = !!process.env.DATABASE_URL && (await discoveryAvailable(db()));
  return (
    <>
      <ComparisonPresentation
        catalog={catalog}
        selected={selected}
        context={context}
      />
      <div className="container">
        {ready && identity ? (
          <ComparisonEditor
            options={catalog}
            selected={selected.map((t) => t.id)}
            context={context}
          />
        ) : (
          <p className="preview-notice mb-8">
            {identity ? (
              "Account comparisons await the reviewed discovery package."
            ) : (
              <Link
                className="text-link"
                href={
                  "/login?returnTo=" +
                  encodeURIComponent("/compare?tools=" + slugs.join(","))
                }
              >
                Sign in to save comparisons across devices →
              </Link>
            )}
          </p>
        )}
      </div>
    </>
  );
}
