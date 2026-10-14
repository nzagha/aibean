import { cookies } from "next/headers";
import { qaAuth } from "@/lib/local-qa-auth/runtime";
import { MAILBOX_COOKIE } from "@/lib/local-qa-auth/core";
export async function LocalQaMailbox({ error }: { error?: string }) {
  const auth = qaAuth();
  const allowed = await auth.mailboxAllowed(
    (await cookies()).get(MAILBOX_COOKIE)?.value,
  );
  return (
    <div className="container py-16">
      <div className="mx-auto max-w-3xl">
        <span className="eyebrow">Private local testing</span>
        <h1 className="my-5 font-display text-4xl font-bold">
          Local testing mailbox
        </h1>
        <p className="mb-6">
          Captured confirmation and recovery messages. Nothing is delivered
          outside this machine. Keep this mailbox private.
        </p>
        {error && (
          <p role="alert" className="preview-notice">
            {error === "invalidlink"
              ? "This message link is expired, invalid or already used."
              : "Mailbox sign-in failed or too many requests were made."}
          </p>
        )}
        {!allowed ? (
          <form
            action="/api/local-qa/mailbox"
            method="post"
            className="placeholder-card"
          >
            <label className="block">
              Mailbox password
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="my-4 w-full rounded-xl border p-3"
              />
            </label>
            <button className="button primary">Open private mailbox</button>
          </form>
        ) : (
          <div className="space-y-6">
            {(await auth.mail()).map((m) => (
              <article className="placeholder-card" key={m.id}>
                <h2 className="text-2xl">
                  {m.purpose === "verify"
                    ? "Confirm your email"
                    : "Recover your password"}
                </h2>
                <p className="my-3">To: {m.email}</p>
                <p className="text-sm">
                  Single use · expires 15 minutes after request.
                </p>
                <form
                  action="/api/local-qa/exchange"
                  method="post"
                  className="mt-4"
                >
                  <input type="hidden" name="token" value={m.token} />
                  <input type="hidden" name="purpose" value={m.purpose} />
                  <button className="button primary">
                    {m.purpose === "verify"
                      ? "Confirm email"
                      : "Continue password reset"}
                  </button>
                </form>
              </article>
            ))}
            <p>
              Messages are captured locally. Do not share screenshots or page
              source containing private message data.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
