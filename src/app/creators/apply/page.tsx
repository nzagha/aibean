import Link from "next/link";
import { getIdentity, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { reviewWorkflowsAvailable } from "@/lib/admin/review-storage";
import { readOwnApplication } from "@/lib/admin/request-queries";
import { ActionForm } from "@/components/action-form";
import { applyForCreator } from "@/app/review-request-actions";
export const metadata = { title: "Become a Creator" };
export const dynamic = "force-dynamic";
export default async function CreatorApplication() {
  const ready =
    Boolean(process.env.DATABASE_URL) && (await reviewWorkflowsAvailable(db()));
  const identity = ready ? await getIdentity(false) : null;
  const user = identity ? await requireUser("/creators/apply") : null;
  const application = user ? await readOwnApplication(db(), user.id) : null;
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
            ready
              ? "Share your experience and portfolio for independent review."
              : "Applications await the reviewed database installation. No application can be submitted yet.",
          ],
          [
            "3. Publish after approval",
            "An Admin reviews your application. Protected Creator access is activated separately; content remains subject to review.",
          ],
        ].map(([title, body]) => (
          <article className="placeholder-card" key={title}>
            <h2 className="text-2xl">{title}</h2>
            <p className="mt-5">{body}</p>
          </article>
        ))}
      </div>
      {application && (
        <p className="preview-notice my-8">
          Application: {application.status}
          {application.status === "approved" && !user?.isCreator
            ? " · Awaiting operator capability activation"
            : ""}
          . {application.review_reason}
        </p>
      )}
      {ready &&
      user &&
      !user.isCreator &&
      (!application || application.status === "rejected") ? (
        <section className="placeholder-card my-8">
          <h2 className="text-2xl">Your application</h2>
          <ActionForm action={applyForCreator} label="Submit for review">
            <label className="field">
              Creator name
              <input name="name" minLength={2} maxLength={100} required />
            </label>
            <label className="field">
              Experience and publishing plans
              <textarea name="bio" minLength={30} maxLength={2000} required />
            </label>
            <label className="field">
              Portfolio links
              <textarea name="links" required maxLength={10004} />
              <span className="text-xs text-muted">
                One public HTTP/HTTPS link per line; up to five. No credentials
                in URLs.
              </span>
            </label>
          </ActionForm>
        </section>
      ) : (
        <p className="preview-notice my-8">
          {ready && !user
            ? "Log in to review your eligibility and apply."
            : ready && user?.isCreator
              ? "Your Creator access is already approved. Open your workspace to review publishing readiness."
              : !ready
                ? "Creator applications await database installation and validation. Browsing this page does not submit an application or change account access."
                : "Your application is under review or awaiting separately approved activation."}
        </p>
      )}
      <div className="flex flex-wrap gap-4">
        <Link href="/register" className="button primary">
          User registration status →
        </Link>
        <Link
          href={
            ready && !user ? "/login?returnTo=%2Fcreators%2Fapply" : "/account"
          }
          className="button secondary"
        >
          {ready && !user ? "Login" : "My Account"}
        </Link>
        <Link href="/tools" className="text-link">
          Keep exploring →
        </Link>
      </div>
    </div>
  );
}
