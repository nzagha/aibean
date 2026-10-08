import { notFound } from "next/navigation";
import Link from "next/link";
import { taxonomy } from "@/lib/catalog/taxonomy";
import { getTools, demoMode } from "@/lib/catalog/repository";
import { filterTools } from "@/lib/catalog/filter";
import { ToolCard } from "@/components/tool-card";
export const dynamic = "force-dynamic";
export default async function IndustryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const industry = taxonomy.industries.find((i) => i.slug === slug);
  if (!industry) notFound();
  const tools = filterTools(await getTools(), { industry: industry.id });
  return (
    <div className="container py-16">
      <Link href="/industries" className="text-link">
        All industries
      </Link>
      <h1 className="my-6 font-display text-4xl font-bold">
        AI for {industry.name}.
      </h1>
      <p className="mb-6 text-lg">{industry.description}</p>
      <div className="flex flex-wrap gap-2 mb-8">
        {industry.needs.map((n) => (
          <span className="badge" key={n}>
            {n}
          </span>
        ))}
      </div>
      <p className="preview-notice mb-8">
        Only tools with native or strong industry fit appear here.
        General-purpose matches are excluded.
        {demoMode()
          ? " Current listings are fictional development examples."
          : ""}
      </p>
      {tools.length ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {tools.map((t) => (
            <ToolCard key={t.id} tool={t} />
          ))}
        </div>
      ) : (
        <div className="placeholder-card">
          <h2 className="text-2xl">
            This industry is ready for its first listings.
          </h2>
          <p className="my-4">
            Relevant tools will appear after editorial review.
          </p>
        </div>
      )}
      <Link
        href={`/tools?industry=${industry.id}`}
        className="button secondary mt-8"
      >
        Filter tools in this industry
      </Link>
    </div>
  );
}
