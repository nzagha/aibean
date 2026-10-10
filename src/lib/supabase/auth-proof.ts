import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

export const INTENT_COOKIE = "aibean_auth_intent";
export const RECOVERY_COOKIE = "aibean_auth_recovery";
export const ACCESS_COOKIE = "aibean_auth_access";
type Proof = {
  purpose: "intent" | "recovery" | "access";
  nonce: string;
  expires: number;
  kind?: "signup" | "recovery";
  verifier?: string;
  returnTo?: string;
  sub?: string;
  session?: string;
};

export function createAuthProofs(secret: string) {
  if (secret.length < 64)
    throw new Error("Configure private recovery protection.");
  const mac = (body: string) =>
    createHmac("sha256", secret).update(body).digest("base64url");
  function issue(
    fields: Omit<Proof, "nonce" | "expires">,
    seconds: number,
    now = Date.now(),
  ) {
    const body = Buffer.from(
      JSON.stringify({
        ...fields,
        nonce: randomUUID(),
        expires: now + seconds * 1000,
      }),
    ).toString("base64url");
    return `${body}.${mac(body)}`;
  }
  function read(
    token: string | undefined,
    purpose: Proof["purpose"],
    now = Date.now(),
  ): Proof | null {
    if (!token || token.length > 2048) return null;
    const [body, signature, extra] = token.split(".");
    if (!body || !signature || extra) return null;
    const expected = Buffer.from(mac(body));
    const actual = Buffer.from(signature);
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual))
      return null;
    try {
      const p: Proof = JSON.parse(Buffer.from(body, "base64url").toString());
      return p.purpose === purpose &&
        typeof p.nonce === "string" &&
        typeof p.expires === "number" &&
        p.expires > now
        ? p
        : null;
    } catch {
      return null;
    }
  }
  return { issue, read };
}

// Bounded one-process candidate replay store. A shared atomic store and an
// approved multi-instance release design are mandatory before live cutover.
export function createProofReplayStore(limit = 4096) {
  const used = new Map<string, number>();
  return {
    consume(proof: Proof, now = Date.now()) {
      for (const [id, expiry] of used) if (expiry <= now) used.delete(id);
      if (proof.expires <= now || used.has(proof.nonce) || used.size >= limit)
        return false;
      used.set(proof.nonce, proof.expires);
      return true;
    },
  };
}
