import Link from "next/link";
export function ParticipationJourneys() {
  return (
    <section
      className="section container"
      aria-labelledby="participation-title"
    >
      <div className="section-heading">
        <div>
          <span className="eyebrow">Find your place</span>
          <h2 id="participation-title">Your next move starts here.</h2>
        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {[
          {
            title: "For Users",
            text: "Discover, save, compare and review AI Tools. Public discovery is open; account features require sign-in.",
            label: "Sign up",
            href: "/register",
          },
          {
            title: "For Creators",
            text: "Apply to publish AI Skills, Playbooks, Stacks and resources. Learn about the upcoming application and review process.",
            label: "Become a Creator",
            href: "/creators/apply",
          },
          {
            title: "For Vendors",
            text: "Submit, claim and manage approved ownership of your Tool listing. Ownership review is separate from aiBean verification.",
            label: "Get Started as a Vendor",
            href: "/for-vendors#get-started",
          },
        ].map((journey) => (
          <article
            className="placeholder-card flex flex-col"
            key={journey.title}
          >
            <h3 className="text-2xl">{journey.title}</h3>
            <p className="my-5">{journey.text}</p>
            <Link href={journey.href} className="text-link mt-auto">
              {journey.label} →
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
