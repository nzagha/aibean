import Link from "next/link";
import { SignIn, SignUp } from "@clerk/nextjs";
import { authConfigured } from "@/lib/auth";
import { authMode } from "@/lib/auth-mode";
import { safeReturnPath } from "@/lib/catalog/filter";
import { passwordConfiguration } from "@/lib/password-auth";
import { PasswordLogin } from "./password-login";
import { RegistrationUnavailable } from "./registration-unavailable";
import { SupabaseAuthForm, type SupabaseAuthView } from "./supabase-auth-form";
export function AuthPage({
  register = false,
  returnTo,
  error,
  loggedOut,
  view,
  status,
  field,
}: {
  register?: boolean;
  returnTo?: string;
  error?: string;
  loggedOut?: string;
  view?: SupabaseAuthView;
  status?: string;
  field?: string;
}) {
  const mode = authMode();
  const password = mode === "password";
  const supabaseView = view || (register ? "register" : "login");
  const destination = safeReturnPath(returnTo);
  return (
    <div className="container py-16">
      <div className="mx-auto max-w-lg">
        <span className="eyebrow">Your aiBean</span>
        <h1 className="my-5 font-display text-4xl font-bold">
          {mode === "supabase" && supabaseView === "forgot"
            ? "Let's get you back in."
            : mode === "supabase" && supabaseView === "reset"
              ? "A fresh start."
              : mode === "supabase" && supabaseView === "confirmation"
                ? "You're almost there."
                : register
                  ? "Build your next stack."
                  : "Welcome back."}
        </h1>
        <p className="mb-8">
          {mode === "supabase"
            ? supabaseView === "register"
              ? "Create your aiBean account to save tools, build stacks, and share your experience."
              : supabaseView === "forgot"
                ? "Enter your email to request a secure password-reset link."
                : supabaseView === "reset"
                  ? "Set a new password to return to your aiBean account."
                  : supabaseView === "confirmation"
                    ? "Check your inbox for your confirmation link, or request a new one below."
                    : "Sign in to your aiBean account with your email and password."
            : password
              ? register
                ? "Discover what you can do with aiBean while account registration is being prepared."
                : "Sign in to your aiBean account with your email and password."
              : "Sign in to save tools, create stacks, and share your experience."}
        </p>
        {mode === "supabase" ? (
          <SupabaseAuthForm
            view={supabaseView}
            returnTo={destination}
            error={error}
            status={status}
            field={field}
            loggedOut={loggedOut}
          />
        ) : register && (password || !authConfigured()) ? (
          <RegistrationUnavailable />
        ) : password ? (
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
