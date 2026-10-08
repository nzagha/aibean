import Link from "next/link";
import { ArrowUpRight, Sparkles, Check } from "lucide-react";
import { FEATURED_PLAN } from "@/lib/featured/plan";
export const metadata = {
  title: "Feature your AI tool",
  description:
    "Put your AI tool in the aiBean homepage spotlight. Sponsored placements for vendors, creators and users.",
};
export default function FeaturedPage() {
  return (
    <div className="container py-16">
      <span className="eyebrow flex items-center gap-2">
        <Sparkles size={16} /> The aiBean spotlight
      </span>
      <div className="grid gap-12 lg:grid-cols-2 mt-6 items-start">
        <div>
          <h1 className="font-display text-5xl font-bold leading-tight">
            Good tools deserve
            <br />
            <span className="text-cobalt">a little spotlight.</span>
          </h1>
          <p className="mt-6 text-lg max-w-xl">
            Put your tool in front of people looking for their next great find.
            Featured AI Tools is a paid space on the aiBean homepage, open to
            vendors, creators, and users.
          </p>
          <p className="mt-5">
            Choose a published tool, tell us who is sponsoring it, and send it
            for approval. You pay only after your request is approved.
          </p>
          <Link href="/tools" className="text-link mt-6">
            Explore the tool directory <ArrowUpRight size={16} />
          </Link>
        </div>
        <section className="placeholder-card" aria-labelledby="placement-plan">
          <span className="eyebrow">Homepage placement</span>
          <h2 id="placement-plan" className="font-display text-5xl mt-4">
            {FEATURED_PLAN.label}
            <span className="text-base font-normal">
              {" "}
              USD / {FEATURED_PLAN.days} days
            </span>
          </h2>
          <p className="mt-4">One payment. Five days in the spotlight.</p>
          <ul className="grid gap-4 my-7">
            {[
              "A card in Featured AI Tools on the homepage",
              "Your tool name, category, description, and listing link",
              "A clear Sponsored label and sponsor attribution",
              "Five consecutive days from payment confirmation",
              "Admin review before you pay",
            ].map((item) => (
              <li key={item} className="flex gap-3 text-sm">
                <Check size={17} className="shrink-0" />
                {item}
              </li>
            ))}
          </ul>
          <Link href="/featured/manage" className="button primary">
            Request a featured spot <ArrowUpRight size={17} />
          </Link>
          <p className="text-xs text-muted mt-4">
            Sign in to submit. Payments open once billing is connected.
          </p>
        </section>
      </div>
      <div className="grid gap-6 md:grid-cols-3 mt-14">
        {[
          [
            "01 · Pick your tool",
            "Choose an existing published listing. Anyone with an aiBean account can sponsor a tool; vendor ownership is not required.",
          ],
          [
            "02 · Get approved",
            "We review the tool and sponsor details. You can follow the decision in your featured placements workspace.",
          ],
          [
            "03 · Take the spotlight",
            "After approval, pay $99 USD. Your five-day placement starts when payment is confirmed and ends automatically.",
          ],
        ].map(([title, copy]) => (
          <article key={title} className="placeholder-card">
            <h2 className="text-xl">{title}</h2>
            <p className="mt-4 text-sm">{copy}</p>
          </article>
        ))}
      </div>
      <p className="preview-notice mt-8">
        Featured means sponsored. A placement does not grant ownership, aiBean
        Verified status, positive reviews, or a higher organic ranking.
        Placement is shared with other sponsors; clicks and impressions are not
        guaranteed.
      </p>
    </div>
  );
}
