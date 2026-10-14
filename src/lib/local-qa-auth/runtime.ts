import "server-only";
import { readFileSync, realpathSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";
import { qaDatabaseConfig } from "./config";
import { createQaAuth } from "./core";
export function qaSettings() {
  const run = process.env.AIBEAN_LOCAL_ACCEPTANCE_RUN || "";
  const expected = join(
    process.env.LOCALAPPDATA || "",
    "aiBean",
    "local-website-qa",
    run,
    "qa-auth.json",
  );
  if (
    process.env.NODE_ENV !== "development" ||
    process.env.AIBEAN_LOCAL_QA_AUTH !== "1" ||
    !/^[a-f0-9]{32}$/.test(run) ||
    process.env.AIBEAN_LOCAL_QA_AUTH_CONFIG !== expected ||
    realpathSync(expected) !== expected
  )
    throw Error(
      "Local QA authentication is unavailable outside its protected development fixture",
    );
  const cfg = JSON.parse(readFileSync(expected, "utf8"));
  if (
    cfg.run !== run ||
    cfg.connectionString !== process.env.DATABASE_URL ||
    cfg.expiresAt <= Date.now() ||
    cfg.expiresAt > Date.now() + 13 * 3600_000
  )
    throw Error("Local QA authentication lease or identity mismatch");
  const app = new URL(process.env.NEXT_PUBLIC_APP_URL || "");
  if (
    app.protocol !== "http:" ||
    app.hostname !== "127.0.0.1" ||
    ![3000, 3002, 3003, 3004].includes(Number(app.port)) ||
    app.username ||
    app.password ||
    app.pathname !== "/" ||
    app.search ||
    app.hash
  )
    throw Error("Local QA requires a reviewed loopback origin");
  return cfg as {
    run: string;
    connectionString: string;
    expiresAt: number;
    dummyHash: string;
    mailboxHash: string;
  };
}
const globalState = globalThis as unknown as {
  localQaAuth?: ReturnType<typeof createQaAuth>;
};
export function qaAuth() {
  const cfg = qaSettings();
  if (!globalState.localQaAuth) {
    const connection = qaDatabaseConfig();
    if (!connection) throw Error("Local-only database is required");
    globalState.localQaAuth = createQaAuth(
      postgres(connection.connectionString, {
        ...connection.options,
        max: 4,
        onnotice: () => {},
      }),
      cfg.dummyHash,
    );
  }
  return globalState.localQaAuth;
}
