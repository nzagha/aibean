"use client";
export default function ErrorBoundary({ reset }: { reset: () => void }) {
  return (
    <section className="placeholder-card">
      <h2 className="text-2xl">Admin workspace unavailable</h2>
      <p role="alert" className="my-5">
        The operation could not be loaded. Check database readiness and retry.
        No credentials or query details are shown.
      </p>
      <button className="button secondary" onClick={reset}>
        Try again
      </button>
    </section>
  );
}
