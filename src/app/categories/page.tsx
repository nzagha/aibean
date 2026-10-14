import Link from "next/link";
import { taxonomy } from "@/lib/catalog/taxonomy";
export const metadata = { title: "AI Tool categories" };
export default function Categories() {
  return (
    <div className="container py-16">
      <span className="eyebrow">Pick a direction</span>
      <h1 className="my-6 text-5xl font-display font-bold">Find your fit.</h1>
      <p className="mb-10 max-w-2xl text-lg">
        Browse AI Tools by category. Start with the work you want to do.
      </p>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {taxonomy.categories.map((c) => (
          <Link
            className="placeholder-card industry-card"
            key={c.id}
            href={`/categories/${c.slug}`}
          >
            <h2 className="text-xl">{c.name} →</h2>
            <p className="mt-4 text-sm">{c.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
