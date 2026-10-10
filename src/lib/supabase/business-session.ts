import { createAuthProofs } from "./auth-proof";
import {
  verifiedSupabaseAccount,
  type VerifiedAccountClient,
} from "./identity";

// Only normal sign-in/confirmation issues this proof. An unmarked recovery
// JWT, including one whose holder removes the recovery cookie, cannot enter
// business authorization or provision a User. Refresh retains session_id.
export async function verifiedBusinessAccount(
  auth: VerifiedAccountClient,
  token: string | undefined,
  secret: string,
) {
  try {
    const proof = createAuthProofs(secret).read(token, "access");
    if (!proof) return null;
    const sub = await verifiedSupabaseAccount(auth);
    if (!sub || proof.sub !== sub) return null;
    const { data, error } = await auth.getClaims();
    return !error &&
      data?.claims.sub === sub &&
      data.claims.session_id === proof.session
      ? sub
      : null;
  } catch {
    return null;
  }
}
