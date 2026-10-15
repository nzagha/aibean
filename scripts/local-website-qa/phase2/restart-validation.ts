// Only the existing reviewed stop/start scripts; cookies remain in memory.
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  state,
  apps,
  credentials,
  cookies,
  login,
  request,
  pg,
} from "./http-support";
import { createConnection } from "node:net";
let stage = "capture-current-sessions";
// PowerShell 7's inherited module list makes Windows PowerShell load duplicate
// ACL type data. Let powershell.exe discover its own installed default modules.
// The reviewed launcher's owner/SYSTEM ACL guard still runs unchanged.
const windowsPowerShellEnvironment = { ...process.env };
delete windowsPowerShellEnvironment.PSModulePath;
function localScript(file: string, args: string[] = []) {
  execFileSync("powershell.exe", ["-NoProfile", "-File", file, ...args], {
    env: windowsPowerShellEnvironment,
    stdio: "ignore",
    windowsHide: true,
    timeout: 30_000,
  });
}
async function listening(port: number) {
  return new Promise<boolean>((ok) => {
    const socket = createConnection({ host: "127.0.0.1", port });
    socket.setTimeout(1000);
    socket.once("connect", () => {
      socket.destroy();
      ok(true);
    });
    socket.once("error", () => {
      socket.destroy();
      ok(false);
    });
    socket.once("timeout", () => {
      socket.destroy();
      ok(false);
    });
  });
}
async function main() {
  stage = "windows-acl-module-precheck";
  execFileSync(
    "powershell.exe",
    [
      "-NoProfile",
      "-Command",
      "Import-Module Microsoft.PowerShell.Security -ErrorAction Stop; Get-Command Get-Acl -ErrorAction Stop | Out-Null",
    ],
    {
      env: windowsPowerShellEnvironment,
      stdio: "pipe",
      windowsHide: true,
      timeout: 30_000,
    },
  );
  stage = "capture-current-sessions";
  for (const a of apps) await login(a);
  const main = apps.find((a) => a.role === "user")!;
  const mailbox = await request(main, "/api/local-qa/mailbox", "", {
    method: "POST",
    headers: {
      Origin: main.url,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ password: credentials.mailbox.password }),
  });
  const mailboxCookie = (mailbox.r.headers.get("set-cookie") || "").split(
    ";",
  )[0];
  assert(mailboxCookie.startsWith("aibean_local_qa_mailbox="));
  execFileSync(
    process.execPath,
    [
      "node_modules/tsx/dist/cli.mjs",
      "scripts/local-website-qa/phase2/continuity.ts",
      "--checkpoint",
    ],
    { stdio: "pipe", windowsHide: true, timeout: 30_000 },
  );
  await pg.end({ timeout: 5 });
  stage = "stop-only-owned-preview";
  console.log(
    "Stopping only the current reviewed local preview; identities and cookies remain unchanged.",
  );
  localScript("scripts/local-website-qa/stop.ps1");
  const stopDeadline = Date.now() + 60_000;
  while (
    (await Promise.all([3000, 3002, 3003, 3004].map(listening))).some(Boolean)
  ) {
    assert(
      Date.now() < stopDeadline,
      "Owned listeners did not stop; no process will be killed",
    );
    await new Promise((ok) => setTimeout(ok, 500));
  }
  // App listeners can close before the runner finishes PostgreSQL shutdown.
  // Wait for this exact retained cluster; never kill or initialize a target.
  const pgCtl =
    "test-results/postgres-validation/portable/pgsql/bin/pg_ctl.exe";
  while (true) {
    const status = spawnSync(
      pgCtl,
      ["status", "-D", join(state.root, "cluster")],
      { stdio: "ignore", windowsHide: true, timeout: 5000 },
    ).status;
    if (status === 3) break;
    assert.equal(status, 0, "Owned cluster status could not be established");
    assert(
      Date.now() < stopDeadline,
      "Owned PostgreSQL did not stop; no process will be killed",
    );
    await new Promise((ok) => setTimeout(ok, 500));
  }
  stage = "resume-same-fixture";
  localScript("scripts/local-website-qa/start-account-testing.ps1", [
    "-LeaseHours",
    "8",
  ]);
  const startDeadline = Date.now() + 90_000;
  let next = state;
  while (
    next.sourceGeneration === state.sourceGeneration ||
    !(await Promise.all([3000, 3002, 3003, 3004].map(listening))).every(Boolean)
  ) {
    assert(
      Date.now() < startDeadline,
      "Preserving restart did not become ready; no replacement fixture may be created",
    );
    await new Promise((ok) => setTimeout(ok, 500));
    next = JSON.parse(
      readFileSync("test-results/local-website-qa-active.json", "utf8"),
    );
  }
  assert.equal(next.run, state.run);
  assert.equal(next.root, state.root);
  assert.equal(next.credentialsPath, state.credentialsPath);
  stage = "verify-all-record-continuity";
  execFileSync(
    process.execPath,
    [
      "node_modules/tsx/dist/cli.mjs",
      "scripts/local-website-qa/phase2/continuity.ts",
      "--verify-restart",
    ],
    { stdio: "pipe", windowsHide: true, timeout: 30_000 },
  );
  stage = "verify-original-access-and-mailbox-sessions";
  for (const a of apps) {
    const response = await request(a, "/account", cookies.get(a.role));
    assert.equal(response.status, 200);
    assert(response.html.includes("Your next moves."));
  }
  const mailPage = await request(main, "/local-mailbox", mailboxCookie);
  assert.equal(mailPage.status, 200);
  assert(!mailPage.html.includes('name="password"'));
  stage = "verify-unchanged-passwords-on-original-aliases";
  for (const original of credentials.accounts) {
    const a = { ...original, role: "restart-" + original.role };
    await login(a);
    await request(a, "/api/auth/logout", cookies.get(a.role), {
      method: "POST",
      headers: { Origin: a.url },
    });
  }
  const report = {
    status: "PASS",
    capturedAt: new Date().toISOString(),
    sameFixture: true,
    passwordsRotated: false,
    recordsAndLedgersPreserved: true,
    registeredAccountsPreserved: true,
    oldAccessSessionsSurviveRestart: true,
    oldMailboxSessionSurvivesRestart: true,
    fourAliasLoginsVerified: true,
    currentSourceLoaded: true,
    hostedConnections: 0,
    runnerPid: next.runnerPid,
    expiresAt: next.expiresAt,
  };
  writeFileSync(
    "docs/evidence/local-ui-phase2-restart-sessions.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(JSON.stringify(report));
  // The runner's own native directory remains retained; no history is deleted.
  assert(readFileSync(join(next.root, "runtime.json"), "utf8"));
}
void main().catch((error: unknown) => {
  const failure = error as { code?: string; signal?: string; status?: number };
  const report = {
    status: "FAIL",
    stage,
    category: failure.code || "ASSERTION_OR_TARGET_CHECK",
    processStatus: failure.status ?? null,
    processSignal: failure.signal ?? null,
    privateValuesDisclosed: false,
    hostedConnections: 0,
  };
  writeFileSync(
    "docs/evidence/local-ui-phase2-restart-failure.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  console.error(JSON.stringify(report));
  process.exitCode = 1;
});
