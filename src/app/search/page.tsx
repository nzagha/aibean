import { redirect } from "next/navigation";
import { ScopedSearch } from "@/components/scoped-search";
import { scopes } from "@/lib/catalog/taxonomy";
import Link from "next/link";
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; scope?: string }>;
}) {
  const p = await searchParams;
  const scope = scopes.find(([s]) => s === p.scope);
  const q = typeof p.q === "string" ? p.q.slice(0, 120) : "";
  if (scope?.[0] === "tools") redirect(`/tools?q=${encodeURIComponent(q)}`);
  return (
    <div className="container py-16">
      <span className="eyebrow">Choose your direction</span>
      <h1 className="my-6 font-display text-5xl font-bold">
        Find the right kind of answer.
      </h1>
      <ScopedSearch scope={scope?.[0] || "tools"} query={q} />
      <div className="placeholder-card mt-8">
        <h2 className="text-2xl">
          {scope
            ? `${scope[1]} search is coming in a later stage.`
            : "Choose a search scope to begin."}
        </h2>
        <p className="my-4">
          Tools, Skills, Playbooks, Creators, and Events have their own results.
          The tool directory is available now.
        </p>
        <Link href={scope ? `/${scope[0]}` : "/tools"} className="text-link">
          {scope ? `Visit ${scope[1]}` : "Explore AI Tools"} →
        </Link>
      </div>
    </div>
  );
}
