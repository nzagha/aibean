// Fixture process environment only; never changes the owner's environment file.
import { join } from "node:path";
export function qaCredentialPath(run: string) {
  if (!/^[a-f0-9]{32}$/.test(run) || !process.env.LOCALAPPDATA)
    throw Error("Private Windows QA credential location unavailable");
  return join(
    process.env.LOCALAPPDATA,
    "aiBean",
    "local-website-qa",
    run,
    "credentials.json",
  );
}
export const qaPorts = {
  user: 3000,
  admin: 3002,
  creator: 3003,
  vendor: 3004,
} as const;
export function privateChildEnvironment(
  parent: Record<string, string | undefined>,
  fileKeys: string[],
) {
  const env: NodeJS.ProcessEnv = { NODE_ENV: "development" };
  for (const key of [
    "PATH",
    "Path",
    "SystemRoot",
    "WINDIR",
    "COMSPEC",
    "PATHEXT",
    "TEMP",
    "TMP",
    "USERPROFILE",
    "APPDATA",
    "LOCALAPPDATA",
  ])
    if (parent[key]) env[key] = parent[key];
  for (const key of fileKeys) env[key] = "";
  return Object.assign(env, { NODE_ENV: "development" });
}
export function assertQaOrigin(value: string) {
  const u = new URL(value);
  if (
    u.protocol !== "http:" ||
    u.hostname !== "127.0.0.1" ||
    ![3000, 3002, 3003, 3004].includes(Number(u.port)) ||
    u.username ||
    u.password ||
    u.pathname !== "/" ||
    u.search ||
    u.hash
  )
    throw Error("QA endpoint is not an approved isolated loopback origin");
  return u.origin;
}
