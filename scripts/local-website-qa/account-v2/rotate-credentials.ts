// Explicit operator-requested local fixture rotation only; never run on startup.
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, copyFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { randomBytes } from "node:crypto";
import postgres from "postgres";
import { qaCredentialPath } from "../guards";
import { qaDatabaseConfig } from "../../../src/lib/local-qa-auth/config";
import {
  hashPassword,
  passwordAccountId,
} from "../../../src/lib/password-crypto";
assert.deepEqual(
  process.argv.slice(2),
  ["--confirm-local-rotation"],
  "Explicit local-only rotation confirmation is required",
);
const state = JSON.parse(
  readFileSync("test-results/local-website-qa-active.json", "utf8"),
);
assert.equal(state.authVersion, 2);
assert.equal(state.credentialsPath, qaCredentialPath(state.run));
const original = JSON.parse(readFileSync(state.credentialsPath, "utf8"));
const manifest = JSON.parse(
  readFileSync(join(state.root, "runtime.json"), "utf8"),
);
const cfg = qaDatabaseConfig({
  NODE_ENV: "development",
  AIBEAN_LOCAL_QA_AUTH: "1",
  AIBEAN_LOCAL_ACCEPTANCE_RUN: state.run,
  DATABASE_URL: manifest.connectionString,
})!;
const pg = postgres(cfg.connectionString, {
  ...cfg.options,
  max: 1,
  onnotice: () => {},
});
async function main() {
  const [target] =
    await pg`select current_setting('cluster_name') as cluster,current_user as role`;
  assert.equal(target.cluster, "aibean-acceptance-" + state.run);
  assert.equal(target.role, "aibean_runtime");
  const next = {
    ...original,
    revision: (original.revision || 1) + 1,
    rotatedAt: new Date().toISOString(),
    accounts: original.accounts.map((a: Record<string, string>) => ({
      ...a,
      password: "Qa9!" + randomBytes(32).toString("hex"),
    })),
  };
  const hashes = await Promise.all(
    next.accounts.map((a: { password: string }) => hashPassword(a.password)),
  );
  const candidate = join(
    dirname(state.credentialsPath),
    "credentials-proposed-" + Date.now() + ".json",
  );
  writeFileSync(candidate, JSON.stringify(next, null, 2));
  copyFileSync(
    state.credentialsPath,
    join(
      dirname(state.credentialsPath),
      "credentials-before-" + Date.now() + ".json",
    ),
  );
  await pg.begin(async (tx) => {
    for (let i = 0; i < next.accounts.length; i++) {
      const a = next.accounts[i],
        id = passwordAccountId(a.email);
      const [identity] =
        await tx`select user_id from local_qa_auth.accounts where email=${a.email} for update`;
      assert.equal(identity.user_id, id);
      await tx`update local_qa_auth.accounts set password_hash=${hashes[i]} where user_id=${id}`;
      await tx`update local_qa_auth.sessions set revoked=true where user_id=${id}`;
      await tx`update local_qa_auth.tokens set consumed=true where user_id=${id}`;
    }
  });
  writeFileSync(state.credentialsPath, JSON.stringify(next, null, 2));
  console.log(
    "Explicit local fixture rotation committed. Four identities/resources are preserved; previous sessions are revoked. Open the current private handoff again.",
  );
}
void main()
  .catch(() => {
    console.error(
      "Rotation could not be confirmed. No automatic retry. Proposed and previous credentials remain protected for operator inspection.",
    );
    process.exitCode = 1;
  })
  .finally(() => pg.end({ timeout: 5 }));
