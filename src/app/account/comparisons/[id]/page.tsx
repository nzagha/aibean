import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { readComparisons } from "@/lib/discovery/comparisons";
import { getTools } from "@/lib/catalog/repository";
import { ComparisonEditor } from "@/components/comparison-editor";
import { ComparisonPresentation } from "@/components/comparison-presentation";
import { WorkspaceNavigation } from "@/components/workspace-navigation";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Private comparison",
  robots: { index: false, follow: false },
};
export default async function Comparison({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params,
    user = await requireUser("/account/comparisons/" + id),
    data = await readComparisons(db(), user.id, 1, id),
    saved = data.rows[0];
  if (!saved) notFound();
  const catalog = await getTools(),
    selected = saved.tools.flatMap((t) =>
      t.available ? catalog.filter((c) => c.id === t.id) : [],
    );
  return (
    <div className="container py-16">
      <WorkspaceNavigation />
      <h1 className="font-display text-4xl mb-8">{saved.name}</h1>
      <Link href="/account/comparisons" className="text-link">
        All saved comparisons →
      </Link>
      {selected.length !== saved.tools.length && (
        <p className="preview-notice my-5">
          Unavailable Tools stay in your saved selection. Their private details
          and scores are hidden. Retain or remove them when editing; keep 2–4
          Tools.
        </p>
      )}
      <ComparisonPresentation
        embedded
        catalog={catalog}
        selected={selected}
        context={saved.context}
        unavailableCount={saved.tools.length - selected.length}
      />
      <ComparisonEditor
        saved={saved}
        options={catalog}
        selected={saved.tools.map((t) => t.id)}
        context={saved.context}
      />
    </div>
  );
}
