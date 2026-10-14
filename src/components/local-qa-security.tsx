import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { qaSettings } from "@/lib/local-qa-auth/runtime";
import { PASSWORD_RULES } from "@/lib/password-policy";
export async function LocalQaSecurity({ error }: { error?: string }) {
  qaSettings();
  await requireUser("/account/security");
  return (
    <div className="container py-16">
      <div className="mx-auto max-w-lg">
        <span className="eyebrow">Account security · Local QA</span>
        <h1 className="my-5 font-display text-4xl font-bold">
          Change your password
        </h1>
        <p className="mb-6">
          Verify your current password. Changing it signs out all existing
          sessions without changing your account or capabilities. For a
          preconfigured QA persona this also updates the protected owner
          credential handoff. Newly registered User passwords are never saved in
          that handoff.
        </p>
        {error && (
          <p role="alert" className="preview-notice mb-5">
            {error === "current"
              ? "The current password is incorrect or your session has expired."
              : error === "confirmation"
                ? "Passwords must match."
                : error === "rate"
                  ? "Too many attempts. Try again in 15 minutes."
                  : PASSWORD_RULES}
          </p>
        )}
        <form
          method="post"
          action="/api/local-qa/change"
          className="placeholder-card space-y-5"
        >
          <label className="block">
            Current password
            <input
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              required
              maxLength={128}
              className="mt-2 w-full rounded-xl border p-3"
            />
          </label>
          <label className="block">
            New password
            <input
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              maxLength={128}
              className="mt-2 w-full rounded-xl border p-3"
            />
          </label>
          <label className="block">
            Confirm new password
            <input
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              maxLength={128}
              className="mt-2 w-full rounded-xl border p-3"
            />
          </label>
          <p className="text-sm">{PASSWORD_RULES}</p>
          <button className="button primary">Change password</button>
        </form>
        <Link href="/account" className="text-link mt-6 inline-block">
          Return to your account →
        </Link>
      </div>
    </div>
  );
}
