import "server-only";
import { readFileSync, writeFileSync, renameSync, realpathSync } from "node:fs";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { qaSettings, qaAuth } from "./runtime";
import { passwordAccountId } from "../password-crypto";
// Owner-authorized fixture handoff only. Never records registered-user passwords.
export async function refreshFixtureHandoff(
  userId: string | null,
  password: string,
) {
  const config = qaSettings();
  if (!userId) return;
  await qaAuth().withHandoffLock(() => {
    const path = join(
      process.env.LOCALAPPDATA!,
      "aiBean",
      "local-website-qa",
      config.run,
      "credentials.json",
    );
    if (realpathSync(path) !== path)
      throw Error("Private credential path must not redirect");
    const handoff = JSON.parse(readFileSync(path, "utf8"));
    if (handoff.run !== config.run || handoff.accounts.length !== 4)
      throw Error("Private fixture identity mismatch");
    const account = handoff.accounts.find(
      (a: { email: string }) => passwordAccountId(a.email) === userId,
    );
    if (!account) return;
    account.password = password;
    handoff.revision = (handoff.revision || 1) + 1;
    handoff.updatedAt = new Date().toISOString();
    handoff.updateReason =
      "Explicit owner-operated fixture password change/reset";
    const temporary = path + "." + randomBytes(8).toString("hex") + ".tmp";
    writeFileSync(temporary, JSON.stringify(handoff, null, 2), { mode: 0o600 });
    renameSync(temporary, path);
  });
}
