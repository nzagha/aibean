"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { PASSWORD_RULES, validPassword } from "@/lib/password-policy";

export type SupabaseAuthView =
  "login" | "register" | "forgot" | "reset" | "confirmation";

type Field = "email" | "password" | "passwordConfirmation";
type FieldErrors = Partial<Record<Field, string>>;

const ACTIONS: Record<SupabaseAuthView, string> = {
  login: "/api/auth/login",
  register: "/api/auth/register",
  forgot: "/api/auth/recover",
  reset: "/api/auth/reset",
  confirmation: "/api/auth/resend",
};
const TITLES: Record<SupabaseAuthView, string> = {
  login: "Sign in with email",
  register: "Create your account",
  forgot: "Send a recovery link",
  reset: "Choose a new password",
  confirmation: "Confirm your email",
};
const BUTTONS: Record<SupabaseAuthView, string> = {
  login: "Sign in",
  register: "Create account",
  forgot: "Send recovery link",
  reset: "Update password",
  confirmation: "Resend confirmation",
};

function errorMessage(error: string | undefined, view: SupabaseAuthView) {
  switch (error) {
    case "credentials":
      return "Email or password is incorrect. Please try again.";
    case "notconfirmed":
      return "Confirm your email before signing in. You can request a new confirmation link below.";
    case "invalidlink":
      return "This link is invalid or has already been used. Please request a new link.";
    case "expired":
      return view === "reset"
        ? "This password-reset link has expired. Please request a new one."
        : "Your session or link has expired. Please sign in again or request a new link.";
    case "rate":
      return "Too many attempts. Please wait a few minutes before trying again.";
    case "validation":
      return "Please check the fields below and try again.";
    case "unavailable":
      return "Sign-in is temporarily unavailable. Please try again shortly.";
    default:
      return undefined;
  }
}

function statusMessage(status: string | undefined, view: SupabaseAuthView) {
  if (status === "confirmed")
    return "Your email is confirmed. You can now sign in.";
  if (status === "password-updated")
    return "Your password has been updated. Sign in with your new password.";
  if (status === "pending" || (status === "sent" && view === "confirmation"))
    return "If your address is eligible, you will receive a confirmation link. Follow it to finish signing in.";
  if (status === "sent" && view === "forgot")
    return "If an account matches that address, you will receive a password-reset link. Check your inbox and spam folder.";
  return undefined;
}

export function SupabaseAuthForm({
  view,
  returnTo,
  error,
  status,
  field,
  loggedOut,
}: {
  view: SupabaseAuthView;
  returnTo: string;
  error?: string;
  status?: string;
  field?: string;
  loggedOut?: string;
}) {
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const emailNeeded = view !== "reset";
  const passwordNeeded = ["login", "register", "reset"].includes(view);
  const confirmationNeeded = view === "register" || view === "reset";
  const notice = errorMessage(error, view);
  const success = statusMessage(status, view);
  const invalidReset =
    view === "reset" && (error === "invalidlink" || error === "expired");
  const query = `?returnTo=${encodeURIComponent(returnTo)}`;

  function fieldError(name: Field) {
    return (
      errors[name] ||
      (error === "validation" && field === name
        ? name === "email"
          ? "Enter a valid email address."
          : name === "passwordConfirmation"
            ? "Both passwords must match."
            : PASSWORD_RULES
        : undefined)
    );
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    if (pending) {
      event.preventDefault();
      return;
    }
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") || "").trim();
    const password = String(data.get("password") || "");
    const nextErrors: FieldErrors = {};
    if (
      emailNeeded &&
      (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    ) {
      nextErrors.email = "Enter a valid email address.";
    }
    if (passwordNeeded && !validPassword(password)) {
      nextErrors.password = PASSWORD_RULES;
    }
    if (
      confirmationNeeded &&
      password !== String(data.get("passwordConfirmation") || "")
    ) {
      nextErrors.passwordConfirmation = "Both passwords must match.";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      event.preventDefault();
      const first = Object.keys(nextErrors)[0] as Field;
      event.currentTarget
        .querySelector<HTMLInputElement>(`[name="${first}"]`)
        ?.focus();
    } else {
      setPending(true);
    }
  }

  function input(name: Field, label: string) {
    const id = `supabase-${view}-${name}`;
    const message = fieldError(name);
    const password = name !== "email";
    return (
      <label className="field" htmlFor={id}>
        {label}
        <input
          id={id}
          name={name}
          type={password ? "password" : "email"}
          autoComplete={
            password
              ? view === "login"
                ? "current-password"
                : "new-password"
              : view === "login"
                ? "username"
                : "email"
          }
          required
          readOnly={pending}
          maxLength={password ? 128 : 254}
          minLength={password ? 8 : undefined}
          aria-invalid={Boolean(message)}
          aria-describedby={
            [
              message ? `${id}-error` : "",
              password ? `supabase-${view}-password-rules` : "",
            ]
              .filter(Boolean)
              .join(" ") || undefined
          }
        />
        {message && (
          <span id={`${id}-error`} className="text-xs text-muted" role="alert">
            {message}
          </span>
        )}
      </label>
    );
  }

  return (
    <div className="placeholder-card">
      <h2 className="text-2xl">{TITLES[view]}</h2>
      {notice && (
        <p className="preview-notice mt-5" role="alert">
          {notice}
        </p>
      )}
      {success && (
        <p className="preview-notice mt-5" role="status">
          {success}
        </p>
      )}
      {loggedOut === "1" && (
        <p className="preview-notice mt-5" role="status">
          You have been signed out.
        </p>
      )}
      {!invalidReset && (
        <form
          action={ACTIONS[view]}
          method="post"
          className="mt-5"
          noValidate
          onSubmit={submit}
          aria-busy={pending}
        >
          <input type="hidden" name="returnTo" value={returnTo} />
          {emailNeeded && input("email", "Email")}
          {passwordNeeded &&
            input("password", view === "reset" ? "New password" : "Password")}
          {confirmationNeeded &&
            input("passwordConfirmation", "Confirm password")}
          {passwordNeeded && (
            <p
              id={`supabase-${view}-password-rules`}
              className="text-xs text-muted mb-6"
            >
              {PASSWORD_RULES}
            </p>
          )}
          <button type="submit" className="button primary" disabled={pending}>
            {pending ? "Please wait…" : BUTTONS[view]}
          </button>
          {pending && (
            <p className="mt-5 text-sm" role="status">
              Your request is being processed.
            </p>
          )}
        </form>
      )}
      <div className="mt-5 text-sm">
        {view === "login" ? (
          <>
            <p>
              <Link href={`/forgot-password${query}`}>
                Forgot your password?
              </Link>
            </p>
            <p className="mt-3">
              <Link href={`/register${query}`}>Create an account →</Link>
            </p>
            {error === "notconfirmed" && (
              <p className="mt-3">
                <Link href={`/confirm-email${query}`}>
                  Resend your confirmation link →
                </Link>
              </p>
            )}
          </>
        ) : (
          <>
            {(view === "reset" || view === "confirmation") && (
              <p>
                <Link
                  href={`/${view === "reset" ? "forgot-password" : "confirm-email"}${query}`}
                >
                  Request a new {view === "reset" ? "recovery" : "confirmation"}{" "}
                  link →
                </Link>
              </p>
            )}
            <p className="mt-3">
              <Link href={`/login${query}`}>Back to sign in →</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
