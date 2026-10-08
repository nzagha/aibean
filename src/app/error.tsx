"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="container py-20">
      <h1 className="text-4xl font-display">This page couldn’t load.</h1>
      <p className="my-6">
        Please try again. If the issue continues, the service may need
        attention.
      </p>
      <button onClick={reset} className="button primary">
        Try again
      </button>
    </div>
  );
}
