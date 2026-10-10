import { randomUUID } from "node:crypto";
import { sql, type SQL } from "drizzle-orm";

// This module accepts only a verified Auth client and a server-owned database
// adapter. It never accepts email, role metadata, or a proposed historical ID.
export type VerifiedAccountClient = {
  getClaims(): Promise<{
    data: { claims: Record<string, unknown> } | null;
    error: unknown;
  }>;
  getUser(): Promise<{
    data: {
      user: {
        id: string;
        email?: string;
        email_confirmed_at?: string;
        is_anonymous?: boolean;
      } | null;
    };
    error: unknown;
  }>;
};

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function verifiedSupabaseAccount(
  auth: VerifiedAccountClient,
  now = Date.now(),
): Promise<string | null> {
  try {
    const claimsResult = await auth.getClaims();
    const claims = claimsResult.data?.claims;
    if (
      claimsResult.error ||
      !claims ||
      typeof claims.sub !== "string" ||
      !uuid.test(claims.sub) ||
      claims.role !== "authenticated" ||
      claims.is_anonymous === true ||
      typeof claims.exp !== "number" ||
      !Number.isFinite(claims.exp) ||
      claims.exp * 1000 <= now
    )
      return null;
    // A signed access token alone cannot prove that the account still exists,
    // remains confirmed, or matches the fresh server-side provider response.
    const accountResult = await auth.getUser();
    const user = accountResult.data.user;
    if (
      accountResult.error ||
      !user ||
      user.id.toLowerCase() !== claims.sub.toLowerCase() ||
      user.is_anonymous === true ||
      !user.email ||
      !user.email_confirmed_at
    )
      return null;
    return claims.sub.toLowerCase();
  } catch {
    return null;
  }
}

export type CanonicalUser = {
  id: string;
  isAdmin: boolean;
  isCreator: boolean;
  createdAt: Date;
};
export type IdentityTransaction = { execute(query: SQL): Promise<unknown> };
export type IdentityDatabase = {
  transaction<T>(work: (tx: IdentityTransaction) => Promise<T>): Promise<T>;
};

function rows(result: unknown): Record<string, unknown>[] {
  const value = Array.isArray(result)
    ? result
    : (result as { rows?: unknown } | null)?.rows;
  if (!Array.isArray(value))
    throw new Error("Identity resolution unavailable.");
  return value as Record<string, unknown>[];
}

function canonicalUser(row: Record<string, unknown>): CanonicalUser {
  if (
    typeof row.id !== "string" ||
    !row.id ||
    typeof row.is_admin !== "boolean" ||
    typeof row.is_creator !== "boolean" ||
    !(row.created_at instanceof Date || typeof row.created_at === "string")
  )
    throw new Error("Identity mapping is inconsistent.");
  const createdAt = new Date(row.created_at);
  if (!Number.isFinite(createdAt.getTime()))
    throw new Error("Identity mapping is inconsistent.");
  return {
    id: row.id,
    isAdmin: row.is_admin,
    isCreator: row.is_creator,
    createdAt,
  };
}

export async function resolveSupabaseUser(
  database: IdentityDatabase,
  authUserId: string,
  newInternalId = () => `user_${randomUUID()}`,
): Promise<CanonicalUser> {
  if (!uuid.test(authUserId)) throw new Error("Verified identity is required.");
  try {
    return await database.transaction(async (tx) => {
      // One transaction lock per verified UUID, including when no mapping row
      // exists yet. It is released on commit/rollback and safe with pooling.
      await tx.execute(
        sql`SELECT pg_advisory_xact_lock(hashtextextended(${`aibean-identity:${authUserId.toLowerCase()}`}, 0))`,
      );
      const existing = rows(
        await tx.execute(sql`
        SELECT u.id, u.is_admin, u.is_creator, u.created_at
        FROM aibean_private.user_identities AS identity
        LEFT JOIN public.users AS u ON u.id = identity.user_id
        WHERE identity.auth_user_id = ${authUserId}::uuid`),
      );
      if (existing.length > 1)
        throw new Error("Identity mapping is inconsistent.");
      if (existing.length === 1) return canonicalUser(existing[0]);

      const internalId = newInternalId();
      if (!/^user_[0-9a-f-]{36}$/i.test(internalId))
        throw new Error("Identity resolution unavailable.");
      // Name only id: the reviewed runtime grant cannot insert or update
      // capability columns. A collision fails instead of adopting an account.
      const created = rows(
        await tx.execute(sql`
        INSERT INTO public.users (id) VALUES (${internalId})
        RETURNING id, is_admin, is_creator, created_at`),
      );
      const user = canonicalUser(created[0]);
      if (user.isAdmin || user.isCreator)
        throw new Error("Ordinary account provisioning is unavailable.");
      await tx.execute(sql`
        INSERT INTO aibean_private.user_identities (auth_user_id, user_id)
        VALUES (${authUserId}::uuid, ${internalId})`);
      // The installed unique constraints and FKs reject conflicting mappings
      // or deleted Auth identities. Any failure rolls back the User too.
      return user;
    });
  } catch {
    // Avoid propagating driver query parameters, provider IDs or private data.
    throw new Error("Identity resolution unavailable.");
  }
}
