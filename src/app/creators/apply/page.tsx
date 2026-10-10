import Link from "next/link";
export const metadata = { title: "Become a Creator" };
export default function CreatorApplication() {
  return (
    <div className="container py-16">
      <span className="eyebrow">Share what works</span>
      <h1 className="my-6 font-display text-5xl font-bold">Become a Creator</h1>
      <p className="mb-8 max-w-2xl text-lg">
        Turn practical experience into AI Skills, Playbooks, Stacks and
        resources that help others do better work.
      </p>
      <div className="grid gap-6 md:grid-cols-3">
        {[
          [
            "1. Start with your account",
            "Everyone begins as an ordinary User. Registration does not grant publishing access.",
          ],
          [
            "2. Apply for review",
            "Tell the team about your experience and what you want to share. Applications are not open yet; no application can be submitted here.",
          ],
          [
            "3. Publish after approval",
            "An Admin reviews your application. Approved Creators receive a workspace; content remains subject to review.",
          ],
        ].map(([title, body]) => (
          <article className="placeholder-card" key={title}>
            <h2 className="text-2xl">{title}</h2>
            <p className="mt-5">{body}</p>
          </article>
        ))}
      </div>
      <p className="preview-notice my-8">
        Creator applications and publishing are being prepared. Browsing this
        page does not submit an application or change your account access.
      </p>
      <div className="flex flex-wrap gap-4">
        <Link href="/register" className="button primary">
          User registration status →
        </Link>
        <Link href="/account" className="button secondary">
          My Account
        </Link>
        <Link href="/tools" className="text-link">
          Keep exploring →
        </Link>
      </div>
    </div>
  );
}
