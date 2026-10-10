import Link from "next/link";
import { ScopedSearch } from "./scoped-search";
export function ModulePreview({
  scope,
  title,
  description,
  items,
  children,
}: {
  scope: string;
  title: string;
  description: string;
  items: { title: string; text: string }[];
  children?: React.ReactNode;
}) {
  return (
    <div className="container py-16">
      <span className="eyebrow">{scope} · Next MVP stage</span>
      <h1 className="my-6 text-5xl font-display font-bold">{title}</h1>
      <p className="mb-8 max-w-2xl text-lg">{description}</p>
      {children}
      <ScopedSearch scope={scope} />
      <p className="preview-notice my-8">
        This section is being prepared. Content creation, moderation, and
        publishing will arrive in a later MVP stage. The AI Tools directory is
        available now.
      </p>
      <div className="grid gap-6 md:grid-cols-3">
        {items.map((i) => (
          <article className="placeholder-card" key={i.title}>
            <h2 className="text-2xl">{i.title}</h2>
            <p className="mt-5 text-sm">{i.text}</p>
          </article>
        ))}
      </div>
      <Link className="button secondary mt-8" href="/tools">
        Explore AI Tools →
      </Link>
    </div>
  );
}
