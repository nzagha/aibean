import "server-only";
import { db } from "../db";
import { createSharedAuthSecurity } from "./shared-security";
import { sql } from "drizzle-orm";
import manifest from "../../../db/proposals/auth-release-v1/manifest.json";

export function sharedAuthSecurity() {
  if (process.env.AIBEAN_AUTH_SHARED_STATE !== "postgres")
    throw new Error("Shared authentication state is unavailable.");
  const database = db();
  const security = createSharedAuthSecurity(
    database,
    process.env.AIBEAN_RECOVERY_SECRET || "",
    process.env.AIBEAN_AUTH_RELEASE_EPOCH || "",
  );
  async function readiness() {
    const result = await database.execute(
      sql`SELECT sql_sha256 FROM aibean_private.auth_release_installations WHERE package_id='auth-release-v1'`,
    );
    if (result.length !== 1 || result[0].sql_sha256 !== manifest.sqlSha256)
      throw new Error("Authentication release installation is unavailable.");
  }
  async function checked<T>(work: () => Promise<T>): Promise<T> {
    try {
      await readiness();
      return await work();
    } catch {
      throw new Error("Authentication security is unavailable.");
    }
  }
  return {
    ...security,
    async allow(purpose: string, email: string) {
      return checked(() => security.allow(purpose, email));
    },
    async active(
      session: Parameters<typeof security.active>[0],
      sensitive = false,
    ) {
      return checked(() => security.active(session, sensitive));
    },
    async consume(proof: Parameters<typeof security.consume>[0]) {
      return checked(() => security.consume(proof));
    },
    async establish(
      session: Parameters<typeof security.establish>[0],
      fresh = false,
    ) {
      return checked(() => security.establish(session, fresh));
    },
    async revoke(session: Parameters<typeof security.revoke>[0]) {
      return checked(() => security.revoke(session));
    },
    async revokeProof(token: string | undefined) {
      return checked(() => security.revokeProof(token));
    },
    async cleanup() {
      return checked(() => security.cleanup());
    },
  };
}
