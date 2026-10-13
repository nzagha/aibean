import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { createSharedAuthSecurity } from "../../src/lib/supabase/shared-security";
import { createAuthProofs } from "../../src/lib/supabase/auth-proof";
import type { IdentityDatabase } from "../../src/lib/supabase/identity";
const secret = "synthetic-local-security-secret-".repeat(4);
export async function authReleaseContract(
  database: IdentityDatabase,
  peer: IdentityDatabase,
  operator: IdentityDatabase,
) {
  const a = createSharedAuthSecurity(
      database,
      secret,
      "synthetic-release-epoch",
    ),
    b = createSharedAuthSecurity(peer, secret, "synthetic-release-epoch");
  const sub = randomUUID(),
    session = randomUUID(),
    s = { sub, session };
  await operator.transaction(async (tx) => {
    await tx.execute(sql`INSERT INTO auth.users(id) VALUES(${sub}::uuid)`);
    await tx.execute(
      sql`INSERT INTO auth.sessions(id,user_id) VALUES(${session}::uuid,${sub}::uuid)`,
    );
  });
  // Atomic budget shared by independent connections. HMAC minimizes identities.
  const limits = await Promise.all(
    Array.from({ length: 20 }, (_, i) =>
      (i % 2 ? a : b).allow("login", "synthetic@example.invalid"),
    ),
  );
  assert.equal(limits.filter(Boolean).length, 10);
  const proof = createAuthProofs(secret).read(
    createAuthProofs(secret).issue({ purpose: "intent" }, 600),
    "intent",
  )!;
  const attempts = await Promise.all(
    Array.from({ length: 12 }, (_, i) => (i % 2 ? a : b).consume(proof)),
  );
  assert.equal(attempts.filter(Boolean).length, 1);
  assert.equal(
    await a.consume({ ...proof, nonce: randomUUID(), expires: Date.now() - 1 }),
    false,
  );
  await a.establish(s);
  assert.equal(await b.active(s), true);
  assert.equal(await b.active(s, true), false);
  await a.establish(s, true);
  assert.equal(await b.active(s, true), true);
  assert.equal(await b.active({ sub: randomUUID(), session }), false);
  const wrongEpoch = createSharedAuthSecurity(
    peer,
    secret,
    "synthetic-new-release-epoch",
  );
  assert.equal(await wrongEpoch.active(s), false);
  await b.revoke(s);
  assert.equal(await a.active(s), false);
  await assert.rejects(a.establish(s, true), /revoked/);
  const s2 = { ...s, session: randomUUID() };
  await operator.transaction((tx) =>
    tx.execute(
      sql`INSERT INTO auth.sessions(id,user_id) VALUES(${s2.session}::uuid,${sub}::uuid)`,
    ),
  );
  await a.establish(s2, true);
  assert.equal(await a.active(s2), true);
  // Provider-side revocation denies an otherwise signed and unexpired proof.
  await operator.transaction((tx) =>
    tx.execute(sql`DELETE FROM auth.sessions WHERE id=${s2.session}::uuid`),
  );
  assert.equal(await b.active(s2), false);
  await assert.rejects(a.active({ sub: "bad", session }), /Invalid/);
  // Minimized state contains none of the source email/UUID/token bodies.
  await operator.transaction(async (tx) => {
    const result = await tx.execute(
      sql`SELECT key FROM public.rate_limits WHERE key LIKE 'auth-%'`,
    );
    assert.doesNotMatch(
      JSON.stringify(result),
      new RegExp(sub + "|" + session + "|synthetic@example"),
    );
    await tx.execute(
      sql`INSERT INTO public.rate_limits VALUES('unrelated-preservation',1,now()-interval '3 days')`,
    );
  });
  await a.cleanup();
  await operator.transaction(async (tx) => {
    const result = await tx.execute(
      sql`SELECT key FROM public.rate_limits WHERE key='unrelated-preservation'`,
    );
    assert.equal(
      Array.isArray(result)
        ? result.length
        : (result as { rows: unknown[] }).rows.length,
      1,
    );
  });
}
