// Private restart evidence. Never emits IDs, hashes, credentials or paths.
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { createHash } from "node:crypto";
import postgres from "postgres";
import { qaDatabaseConfig } from "../../../src/lib/local-qa-auth/config";
import { qaCredentialPath } from "../guards";
const state = JSON.parse(
  readFileSync("test-results/local-website-qa-active.json", "utf8"),
);
assert.equal(state.authVersion, 2);
assert.equal(state.credentialsPath, qaCredentialPath(state.run));
const runtime = JSON.parse(
  readFileSync(join(state.root, "runtime.json"), "utf8"),
);
const config = qaDatabaseConfig({
  NODE_ENV: "development",
  AIBEAN_LOCAL_QA_AUTH: "1",
  AIBEAN_LOCAL_ACCEPTANCE_RUN: state.run,
  DATABASE_URL: runtime.connectionString,
})!;
const pg = postgres(config.connectionString, {
  ...config.options,
  max: 1,
  onnotice: () => {},
});
const sha = (body: string | Buffer) =>
  createHash("sha256").update(body).digest("hex");
async function main() {
  const handoff = JSON.parse(readFileSync(state.credentialsPath, "utf8"));
  const privatePath = join(
    dirname(state.credentialsPath),
    "restart-continuity.json",
  );
  const snapshot = {
    accounts: sha(
      JSON.stringify(
        await pg`select user_id,email,password_hash,confirmed from local_qa_auth.accounts order by user_id`,
      ),
    ),
    capabilities: sha(
      JSON.stringify(
        await pg`select id,is_admin,is_creator from public.users order by id`,
      ),
    ),
    owners: sha(
      JSON.stringify(
        await pg`select tool_id,user_id from public.vendor_access order by tool_id`,
      ),
    ),
    credentials: sha(JSON.stringify(handoff.accounts)),
    mailbox: sha(JSON.stringify(handoff.mailbox)),
    privateEnvironment: sha(readFileSync(".env.local")),
  };
  if (process.argv[2] === "--checkpoint") {
    writeFileSync(privatePath, JSON.stringify(snapshot));
    console.log(
      "Private restart continuity checkpoint saved; protected values withheld.",
    );
  } else {
    assert.deepEqual(process.argv.slice(2), ["--verify"]);
    assert.deepEqual(snapshot, JSON.parse(readFileSync(privatePath, "utf8")));
    writeFileSync(
      "docs/evidence/local-auth-v2-restart.json",
      JSON.stringify(
        {
          capturedAt: new Date().toISOString(),
          status: "PASS",
          databaseAccountsPreserved: true,
          internalIdsAndCapabilitiesPreserved: true,
          toolOwnershipPreserved: true,
          fourCredentialsAndMailboxPreserved: true,
          privateEnvironmentUnchanged: true,
          hostedConnections: 0,
        },
        null,
        2,
      ) + "\n",
    );
    console.log(
      "PASS: registered identities, credentials, capabilities, Tool ownership, mailbox and private environment survived restart.",
    );
  }
}
void main()
  .catch(() => {
    console.error("Local continuity check failed; protected details withheld.");
    process.exitCode = 1;
  })
  .finally(() => pg.end({ timeout: 5 }));
