"use client";
export function WorkspaceError({ reset }: { reset: () => void }) {
  return (
    <div className="container py-16">
      <section className="placeholder-card">
        <h2 className="text-2xl">This workspace could not be loaded.</h2>
        <p role="alert" className="my-5">
          Please try again. Your saved records remain available when the
          workspace reconnects.
        </p>
        <button className="button secondary" onClick={reset}>
          Try again
        </button>
      </section>
    </div>
  );
}
