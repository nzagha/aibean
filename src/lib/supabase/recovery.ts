import "server-only";
import { cookies } from "next/headers";
import { providerTestApproved } from "../auth-mode";
import { createAuthProofs, RECOVERY_COOKIE } from "./auth-proof";
import { createSupabaseServerClient } from "./server";
import { verifiedSupabaseAccount } from "./identity";

export async function recoverySessionReady() {
  try {
    if (!providerTestApproved()) return false;
    const proof = createAuthProofs(
      process.env.AIBEAN_RECOVERY_SECRET || "",
    ).read((await cookies()).get(RECOVERY_COOKIE)?.value, "recovery");
    if (!proof) return false;
    const client = await createSupabaseServerClient();
    const sub = await verifiedSupabaseAccount(client.auth);
    if (!sub || sub !== proof.sub) return false;
    const { data, error } = await client.auth.getClaims();
    return (
      !error &&
      data?.claims.sub === sub &&
      data.claims.session_id === proof.session
    );
  } catch {
    return false;
  }
}
