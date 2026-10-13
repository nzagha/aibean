import { requireUser } from "@/lib/auth";
import { safeReturnPath } from "@/lib/catalog/filter";
export const metadata = {
  title: "Confirm your identity",
  robots: { index: false, follow: false },
};
export default async function Reauthenticate({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string; error?: string }>;
}) {
  await requireUser("/reauthenticate");
  const query = await searchParams;
  return (
    <div className="container py-16">
      <div className="mx-auto max-w-lg">
        <span className="eyebrow">Your aiBean</span>
        <h1 className="my-5 font-display text-4xl font-bold">
          Confirm your identity.
        </h1>
        <p className="mb-8">
          Enter your current account email and password to continue with this
          sensitive action.
        </p>
        {query.error && (
          <p role="alert">Unable to confirm this account. Please try again.</p>
        )}
        <form
          action="/api/auth/reauthenticate"
          method="post"
          className="space-y-4"
        >
          <input
            type="hidden"
            name="returnTo"
            value={safeReturnPath(query.returnTo)}
          />
          <label className="field">
            Email
            <input
              type="email"
              name="email"
              autoComplete="username"
              required
              maxLength={254}
            />
          </label>
          <label className="field">
            Password
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              required
              minLength={8}
              maxLength={128}
            />
          </label>
          <button className="button primary" type="submit">
            Confirm and continue
          </button>
        </form>
      </div>
    </div>
  );
}
