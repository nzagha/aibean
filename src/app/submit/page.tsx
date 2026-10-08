import Link from "next/link";
export const metadata = { title: "Submit to aiBean" };
export default function Submit() {
  return (
    <div className="container py-16">
      <span className="eyebrow">Contribute something useful</span>
      <h1 className="my-6 font-display text-5xl font-bold">
        Bring your work to aiBean.
      </h1>
      <p className="max-w-2xl text-lg mb-8">
        Every submission goes through review. Payment never guarantees approval,
        verification, or organic ranking.
      </p>
      <div className="grid gap-6 md:grid-cols-3">
        {[
          [
            "AI Tool",
            "Approved vendors, creators, and admins can submit a tool for a paid editorial review.",
            "/submit/tool",
          ],
          [
            "Skill or Playbook",
            "Approved creators can contribute structured Skills and free-to-read Playbooks.",
            "/creator",
          ],
          [
            "Event",
            "Approved creators, vendors, and organizers can submit events for review. Registration stays external.",
            "/events",
          ],
        ].map(([title, text, href]) => (
          <article className="placeholder-card" key={title}>
            <h2 className="text-2xl">{title}</h2>
            <p className="my-5 text-sm">{text}</p>
            <Link href={href} className="text-link">
              View next steps →
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}
