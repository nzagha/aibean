import Link from "next/link";
import { SignIn, SignUp } from "@clerk/nextjs";
import { authConfigured } from "@/lib/auth";
import { safeReturnPath } from "@/lib/catalog/filter";
import { passwordMode, passwordConfiguration } from "@/lib/password-auth";
import { PasswordLogin } from "./password-login";
export function AuthPage({
  register = false,
  returnTo,
  error,
  loggedOut,
}: {
  register?: boolean;
  returnTo?: string;
  error?: string;
  loggedOut?: string;
}) {
  const destination = safeReturnPath(returnTo);
  return (
    <div className="container py-16">
      <div className="mx-auto max-w-lg">
        <span className="eyebrow">Your aiBean</span>
        <h1 className="my-5 font-display text-4xl font-bold">
          {register && !passwordMode()
            ? "Build your next stack."
            : "Welcome back."}
        </h1>
        <p className="mb-8">
          {passwordMode()
            ? register
              ? "New account registration is coming later. Sign in with your existing account."
              : "Sign in to your aiBean account with your email and password."
            : "Sign in to save tools, create stacks, and share your experience."}
        </p>
        {passwordMode() ? (
          <PasswordLogin
            returnTo={destination}
            error={error}
            loggedOut={loggedOut}
            configured={Boolean(passwordConfiguration())}
          />
        ) : authConfigured() ? (
          register ? (
            <SignUp
              routing="hash"
              signInUrl="/login"
              forceRedirectUrl={destination}
            />
          ) : (
            <SignIn
              routing="hash"
              signUpUrl="/register"
              forceRedirectUrl={destination}
            />
          )
        ) : (
          <div className="placeholder-card">
            <h2 className="text-2xl">Sign-in setup is next.</h2>
            <p className="my-4">
              Accounts are not enabled in this preview. You can browse tools and
              compare them without an account.
            </p>
            <p className="mb-6 text-sm">
              Google, Apple, and email sign-in will be available after the
              authentication service is configured.
            </p>
            <Link href="/tools" className="button primary">
              Keep exploring →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
