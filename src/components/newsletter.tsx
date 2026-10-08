"use client";
import { useState } from "react";
import { ArrowUpRight, Check } from "lucide-react";
export function Newsletter() {
  const [done, setDone] = useState(false);
  return (
    <section
      id="newsletter"
      className="newsletter container"
      aria-labelledby="newsletter-title"
    >
      <div>
        <span className="eyebrow">The aiBean Run Club</span>
        <h2 id="newsletter-title">
          Your next edge.
          <br />
          Straight to your inbox.
        </h2>
        <p>
          Fresh tools, useful playbooks, and ideas worth trying.
          <br className="hidden md:block" /> A little signal for your next big
          thing.
        </p>
      </div>
      <div className="newsletter-form">
        <label
          htmlFor="newsletter-email"
          className="mb-3 block text-sm font-medium"
        >
          Find your people. Build your stack.
        </label>
        <form
          className="flex flex-col gap-3 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            setDone(true);
          }}
        >
          <input
            required
            type="email"
            autoComplete="email"
            id="newsletter-email"
            name="email"
            placeholder="Your email address"
            aria-describedby="newsletter-note newsletter-status"
            onChange={() => setDone(false)}
          />
          <button type="submit" className="button primary whitespace-nowrap">
            Join the Run Club <ArrowUpRight size={17} />
          </button>
        </form>
        <p id="newsletter-note" className="mt-3 text-xs">
          Preview form only. No email is sent or stored.
        </p>
        <p id="newsletter-status" role="status" className="mt-3 text-sm">
          {done && (
            <span className="flex items-center gap-2">
              <Check size={18} /> Email validated. Live signup is coming soon.
            </span>
          )}
        </p>
      </div>
    </section>
  );
}
