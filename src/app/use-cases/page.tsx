import Link from "next/link";
import { activeUseCases } from "@/lib/catalog/taxonomy";
export const metadata = { title: "AI use cases" };
export default function UseCases() {
  return (
    <div className="container py-16">
      <span className="eyebrow">Built around your work</span>
      <h1 className="my-6 text-5xl font-display font-bold">
        Start with what you want to do.
      </h1>
      <p className="mb-10 max-w-2xl text-lg">
        Find AI Tools for an approved use case, then compare the options for
        your workflow.
      </p>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {activeUseCases.map((c) => (
          <Link
            className="placeholder-card industry-card"
            key={c.id}
            href={`/use-cases/${c.slug}`}
          >
            <h2 className="text-xl">{c.name} →</h2>
            <p className="mt-4 text-sm">{c.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
