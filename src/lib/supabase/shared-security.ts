import { createHmac } from "node:crypto";
import { sql } from "drizzle-orm";
import type { IdentityDatabase } from "./identity";
import { createAuthProofs } from "./auth-proof";

export type AuthSession = { sub: string; session: string };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function rows(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value
    : (value as { rows: Record<string, unknown>[] }).rows;
}

// The already installed private-server rate_limits table supplies atomic shared
// state. No process-local fallback and no raw emails, provider tokens or IPs.
// window_start is an expiry for auth-proof/auth-session namespaces only.
export function createSharedAuthSecurity(
  database: IdentityDatabase,
  secret: string,
  epoch: string,
) {
  if (secret.length < 64 || !/^[a-zA-Z0-9_-]{16,80}$/.test(epoch))
    throw new Error("Shared authentication protection is not configured.");
  const key = (kind: string, value: string) =>
    `auth-${kind}:${createHmac("sha256", secret)
      .update(epoch + ":" + value)
      .digest("hex")}`;
  const sessionKey = (s: AuthSession) => {
    if (!uuid.test(s.sub) || !uuid.test(s.session))
      throw new Error("Invalid session.");
    return key("session", s.sub.toLowerCase() + ":" + s.session.toLowerCase());
  };
  async function allow(purpose: string, email: string) {
    return database.transaction(async (tx) => {
      const clock = rows(
        await tx.execute(
          sql`SELECT floor(extract(epoch FROM clock_timestamp()) / 900)::bigint AS bucket`,
        ),
      )[0];
      // Cross-instance budgets, including a global cap independent of arbitrary
      // visitor-supplied forwarded addresses. Stable fixed window is DB-owned.
      let accepted = true;
      for (const [id, limit] of [
        [key("budget", "global"), 1000],
        [
          key("budget", purpose + ":" + email.trim().toLowerCase()),
          purpose === "login" || purpose === "reauthenticate" ? 10 : 3,
        ],
      ] as const) {
        const result = rows(
          await tx.execute(
            sql`INSERT INTO public.rate_limits(key,count,window_start) VALUES(${id + ":" + clock.bucket},1,clock_timestamp()) ON CONFLICT(key) DO UPDATE SET count=least(rate_limits.count+1,1001) RETURNING count`,
          ),
        );
        if (Number(result[0].count) > limit) accepted = false;
      }
      return accepted;
    });
  }
  async function consume(proof: { nonce: string; expires: number }) {
    if (!uuid.test(proof.nonce) || !Number.isFinite(proof.expires))
      return false;
    return database.transaction(async (tx) => {
      const expiry = new Date(proof.expires).toISOString();
      const result = rows(
        await tx.execute(
          sql`INSERT INTO public.rate_limits(key,count,window_start) SELECT ${key("proof", proof.nonce)},1,${expiry}::timestamptz WHERE clock_timestamp()<${expiry}::timestamptz AND ${expiry}::timestamptz<=clock_timestamp()+interval '9 hours' ON CONFLICT(key) DO NOTHING RETURNING key`,
        ),
      );
      return result.length === 1;
    });
  }
  async function establish(s: AuthSession, reauthenticated = false) {
    const id = sessionKey(s);
    return database.transaction(async (tx) => {
      const result = rows(
        await tx.execute(
          sql`INSERT INTO public.rate_limits(key,count,window_start) VALUES(${id},1,clock_timestamp()+interval '8 hours') ON CONFLICT(key) DO UPDATE SET window_start=EXCLUDED.window_start WHERE rate_limits.count=1 RETURNING key`,
        ),
      );
      if (!result.length) throw new Error("Session was revoked.");
      if (reauthenticated)
        await tx.execute(
          sql`INSERT INTO public.rate_limits(key,count,window_start) VALUES(${id + ":fresh"},1,clock_timestamp()+interval '5 minutes') ON CONFLICT(key) DO UPDATE SET window_start=EXCLUDED.window_start`,
        );
    });
  }
  async function active(s: AuthSession, sensitive = false) {
    const id = sessionKey(s);
    return database.transaction(async (tx) => {
      // Independent function checks the provider's current auth.sessions row;
      // runtime receives only a boolean, never managed session/refresh records.
      const result = rows(
        await tx.execute(
          sql`SELECT EXISTS(SELECT 1 FROM public.rate_limits WHERE key=${id} AND count=1 AND window_start>clock_timestamp()) AND aibean_private.auth_session_active(${s.sub}::uuid,${s.session}::uuid) AND (${!sensitive} OR EXISTS(SELECT 1 FROM public.rate_limits WHERE key=${id + ":fresh"} AND count=1 AND window_start>clock_timestamp())) AS active`,
        ),
      );
      return result[0]?.active === true;
    });
  }
  async function revoke(s: AuthSession) {
    const id = sessionKey(s);
    await database.transaction(async (tx) => {
      // Tombstones are never cleaned while a proof can survive. Even an
      // in-flight establish cannot overwrite a revoked session.
      await tx.execute(
        sql`INSERT INTO public.rate_limits(key,count,window_start) VALUES(${id},0,clock_timestamp()+interval '9 hours') ON CONFLICT(key) DO UPDATE SET count=0,window_start=EXCLUDED.window_start`,
      );
    });
  }
  const proofs = createAuthProofs(secret, epoch);
  async function revokeProof(token: string | undefined) {
    const proof = proofs.read(token, "access");
    if (proof?.sub && proof.session)
      await revoke({ sub: proof.sub, session: proof.session });
  }
  async function cleanup() {
    // An explicit bounded maintenance operation, no business rows or other
    // rate-limit namespaces. Revocation tombstones remain for 9 hours.
    return database.transaction(
      async (tx) =>
        rows(
          await tx.execute(
            sql`DELETE FROM public.rate_limits WHERE key IN (SELECT key FROM public.rate_limits WHERE ((key LIKE 'auth-proof:%' OR key LIKE 'auth-session:%') AND window_start<clock_timestamp()) OR (key LIKE 'auth-budget:%' AND window_start<clock_timestamp()-interval '1 day') ORDER BY window_start LIMIT 1000) RETURNING key`,
          ),
        ).length,
    );
  }
  return { allow, consume, establish, active, revoke, revokeProof, cleanup };
}
