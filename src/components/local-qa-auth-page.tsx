import Link from "next/link";
import { qaSettings } from "@/lib/local-qa-auth/runtime";
import { PASSWORD_RULES } from "@/lib/password-policy";
import { safeReturnPath } from "@/lib/catalog/filter";
type View =
  "login" | "register" | "forgot" | "reset" | "confirmation" | "reauthenticate";
export function LocalQaAuthPage({
  register = false,
  view,
  returnTo,
  error,
  status,
  loggedOut,
  handoff,
}: {
  register?: boolean;
  view?: View;
  returnTo?: string;
  error?: string;
  status?: string;
  loggedOut?: string;
  handoff?: string;
  field?: string;
}) {
  qaSettings();
  const mode = view || (register ? "register" : "login");
  const password = ["register", "login", "reset"].includes(mode);
  const confirmation = mode === "register" || mode === "reset";
  const title =
    mode === "register"
      ? "Build your next stack."
      : mode === "forgot"
        ? "Let's get you back in."
        : mode === "reset"
          ? "A fresh start."
          : "Welcome back.";
  const message =
    status === "sent"
      ? "If this request is eligible, a message is available in the protected local testing mailbox."
      : status === "verified"
        ? "Email confirmed. Sign in to continue."
        : status === "changed"
          ? "Password updated. Previous sessions have been signed out. Sign in again."
          : loggedOut
            ? "You have been signed out."
            : null;
  const errors: Record<string, string> = {
    credentials:
      "Email or password is incorrect, or verification is incomplete.",
    email: "Use a valid synthetic email address ending in .invalid.",
    password: PASSWORD_RULES,
    confirmation: "Passwords must match.",
    rate: "Too many requests. Try again in 15 minutes.",
    invalidlink: "This recovery link is invalid, expired or already used.",
    unavailable: "The request could not be completed. Try again.",
  };
  return (
    <div className="container py-16">
      <div className="mx-auto max-w-lg">
        <span className="eyebrow">Your aiBean · Local QA</span>
        <h1 className="my-5 font-display text-4xl font-bold">{title}</h1>
        <p className="mb-8">
          {mode === "register"
            ? "Create an ordinary User account, then confirm your email in the local testing mailbox."
            : mode === "forgot"
              ? "Request a private local password recovery message."
              : mode === "reset"
                ? "Choose a new password. This signs out your previous sessions."
                : "Sign in with your email and password."}
        </p>
        {message && (
          <p role="status" className="preview-notice mb-6">
            {message}
          </p>
        )}
        {error && (
          <p role="alert" className="preview-notice mb-6">
            {errors[error] || errors.unavailable}
          </p>
        )}
        {handoff === "stale" && (
          <p role="alert" className="preview-notice mb-6">
            Your password was updated, but the private fixture handoff could not
            be refreshed. Use the password you just chose and inspect the
            protected handoff before rotating credentials.
          </p>
        )}
        <form
          action={
            mode === "forgot" ? "/api/local-qa/forgot" : `/api/auth/${mode}`
          }
          method="post"
          className="placeholder-card space-y-5"
        >
          <input
            type="hidden"
            name="returnTo"
            value={safeReturnPath(returnTo)}
          />
          {mode !== "reset" && (
            <label className="block">
              Email
              <input
                className="mt-2 w-full rounded-xl border p-3"
                name="email"
                type="email"
                autoComplete="email"
                required
                maxLength={254}
              />
            </label>
          )}
          {password && (
            <label className="block">
              {mode === "reset" ? "New password" : "Password"}
              <input
                className="mt-2 w-full rounded-xl border p-3"
                name="password"
                type="password"
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                minLength={8}
                maxLength={128}
                required
                aria-describedby="qa-password-policy"
              />
            </label>
          )}
          {confirmation && (
            <label className="block">
              Confirm password
              <input
                className="mt-2 w-full rounded-xl border p-3"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                maxLength={128}
              />
            </label>
          )}
          {password && (
            <p id="qa-password-policy" className="text-sm">
              {PASSWORD_RULES}
            </p>
          )}
          <button className="button primary" type="submit">
            {mode === "register"
              ? "Create account"
              : mode === "forgot"
                ? "Send recovery email"
                : mode === "reset"
                  ? "Reset password"
                  : "Sign in"}
          </button>
        </form>
        <div className="mt-6 flex flex-wrap gap-5">
          <Link href="/login" className="text-link">
            Login
          </Link>
          <Link href="/register" className="text-link">
            Create account
          </Link>
          <Link href="/forgot-password" className="text-link">
            Forgot password?
          </Link>
          <Link href="/local-mailbox" className="text-link">
            Local testing mailbox
          </Link>
        </div>
        <p className="mt-6 text-sm">
          Local testing only. No email is sent externally. New accounts never
          receive Admin, Creator or Tool ownership privileges.
        </p>
      </div>
    </div>
  );
}
