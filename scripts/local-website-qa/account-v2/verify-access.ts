import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { qaCredentialPath, assertQaOrigin } from "../guards";
async function main() {
  const state = JSON.parse(
    readFileSync("test-results/local-website-qa-active.json", "utf8"),
  );
  assert.equal(state.credentialsPath, qaCredentialPath(state.run));
  const handoff = JSON.parse(readFileSync(state.credentialsPath, "utf8"));
  assert.equal(handoff.run, state.run);
  for (const account of handoff.accounts) {
    const origin = assertQaOrigin(account.url);
    let status = "STOPPED_OR_UNREACHABLE";
    try {
      const response = await fetch(origin + "/api/auth/login", {
        method: "POST",
        headers: {
          Origin: origin,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          email: account.email,
          password: account.password,
          returnTo: "/account",
        }),
        redirect: "manual",
        signal: AbortSignal.timeout(45000),
      });
      const cookie = response.headers.get("set-cookie");
      const location = new URL(
        response.headers.get("location") || "/login",
        origin,
      );
      status =
        location.searchParams.get("error") === "rate"
          ? "RATE_LIMITED_TRY_LATER"
          : response.status === 303 &&
              location.pathname === "/account" &&
              cookie?.includes("aibean_password_session=")
            ? "VERIFIED_CURRENT_PASSWORD"
            : "STALE_OR_REJECTED_PASSWORD";
      if (status === "VERIFIED_CURRENT_PASSWORD")
        await fetch(origin + "/api/auth/logout", {
          method: "POST",
          headers: { Origin: origin, Cookie: cookie!.split(";")[0] },
          redirect: "manual",
        });
    } catch {
      /* Only report reachability; no request body or secret is logged. */
    }
    console.log(
      JSON.stringify({
        role: account.role,
        email: account.email,
        loginUrl: origin + "/login",
        status,
      }),
    );
  }
  console.log(
    JSON.stringify({
      expiresAt: state.expiresAt,
      leaseStatus: state.expiresAt > Date.now() ? "ACTIVE" : "EXPIRED",
      credentialRevision: handoff.revision || 1,
      warning:
        "Use the current private handoff. Saved copies can become stale after an explicit password change/rotation.",
    }),
  );
}
void main().catch(() => {
  console.error(
    "Local QA access verification failed; private details withheld",
  );
  process.exitCode = 1;
});
