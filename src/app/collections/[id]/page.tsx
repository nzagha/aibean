import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { readPublicStack } from "@/lib/content/queries";
export const dynamic = "force-dynamic";
export default async function Stack({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params,
    row = await readPublicStack(db(), id);
  if (!row) notFound();
  return (
    <div className="container py-16">
      <span className="eyebrow">Creator stack</span>
      <h1 className="my-6 font-display text-5xl font-bold">{row.name}</h1>
      <Link className="text-link" href={"/@" + row.handle}>
        By {row.display_name} →
      </Link>
      <p className="max-w-3xl my-8 whitespace-pre-wrap">{row.note}</p>
      <div className="grid gap-6 md:grid-cols-3">
        {row.members.map((t) => (
          <article key={t.id} className="placeholder-card">
            <h2 className="text-2xl">{t.name}</h2>
            <p className="my-5">{t.summary}</p>
            <Link className="text-link" href={"/tools/" + t.slug}>
              Explore Tool →
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}
