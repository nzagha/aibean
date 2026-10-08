import { PASSWORD_RULES } from "@/lib/password-policy";
export function PasswordLogin({
  returnTo,
  error,
  loggedOut,
  configured,
}: {
  returnTo: string;
  error?: string;
  loggedOut?: string;
  configured: boolean;
}) {
  return (
    <div className="placeholder-card">
      <h2 className="text-2xl">Sign in with email</h2>
      {error && (
        <p className="preview-notice mt-5" role="alert">
          {error === "rate"
            ? "Too many sign-in attempts. Please try again in 15 minutes."
            : "Email or password is incorrect. Please try again."}
        </p>
      )}
      {loggedOut === "1" && (
        <p className="preview-notice mt-5" role="status">
          You have been signed out.
        </p>
      )}
      {!configured ? (
        <p className="mt-5">
          Email login is being configured. Please try again shortly.
        </p>
      ) : (
        <form action="/api/auth/login" method="post" className="mt-5">
          <input type="hidden" name="returnTo" value={returnTo} />
          <label className="field" htmlFor="login-email">
            Email
            <input
              id="login-email"
              name="email"
              type="email"
              autoComplete="username"
              required
              maxLength={254}
            />
          </label>
          <label className="field" htmlFor="login-password">
            Password
            <input
              id="login-password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              minLength={8}
              maxLength={128}
              pattern={"(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9\\s]).{8,128}"}
              aria-describedby="password-rules"
            />
          </label>
          <p id="password-rules" className="text-xs text-muted mb-6">
            {PASSWORD_RULES}
          </p>
          <button type="submit" className="button primary">
            Sign in
          </button>
        </form>
      )}
    </div>
  );
}
