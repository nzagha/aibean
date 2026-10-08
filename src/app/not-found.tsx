import Link from "next/link";
export default function NotFound() {
  return (
    <div className="container py-24">
      <span className="eyebrow">404 · A little off track</span>
      <h1 className="my-6 font-display text-5xl font-bold">
        Let’s find a better route.
      </h1>
      <p className="mb-8">
        This page isn’t here. Your next discovery still is.
      </p>
      <Link href="/explore" className="button primary">
        Explore tools →
      </Link>
    </div>
  );
}
