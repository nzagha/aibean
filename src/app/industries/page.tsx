import Link from "next/link";
import { taxonomy } from "@/lib/catalog/taxonomy";
export const metadata = { title: "AI for Your Business" };
export default function Industries() {
  return (
    <div className="container py-16">
      <span className="eyebrow">Built around your work</span>
      <h1 className="my-6 text-5xl font-display font-bold">
        AI for Your Business.
      </h1>
      <p className="mb-10 max-w-2xl text-lg">
        Start with your industry. Find tools with a relevant, specific use case
        for the work you do.
      </p>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {taxonomy.industries.map((i) => (
          <Link
            className="placeholder-card industry-card"
            key={i.id}
            href={`/industries/${i.slug}`}
          >
            <h2 className="text-xl">{i.name} →</h2>
            <p className="mt-4 text-sm">{i.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
