export type AuthMode = "password" | "clerk" | "supabase" | "disabled";

// Candidate tests require a separate loopback deployment. No environment file
// is changed by implementation, and there is no production cutover value yet.
export function authMode(
  env: Record<string, string | undefined> = process.env,
): AuthMode {
  const mode = env.AIBEAN_AUTH_MODE;
  if (mode === "password") return mode;
  if (mode === "clerk") {
    if (!env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || !env.CLERK_SECRET_KEY)
      throw new Error("Authentication configuration is incomplete.");
    return mode;
  }
  if (mode === "supabase") {
    let origin: URL;
    try {
      origin = new URL(env.NEXT_PUBLIC_APP_URL || "");
    } catch {
      throw new Error("Authentication candidate configuration is invalid.");
    }
    if (
      env.AIBEAN_SUPABASE_RELEASE !== "candidate" ||
      env.AIBEAN_AUTH_ISOLATED !== "true" ||
      !["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname) ||
      !["http:", "https:"].includes(origin.protocol) ||
      origin.username ||
      origin.password ||
      origin.pathname !== "/" ||
      origin.search ||
      origin.hash
    )
      throw new Error("Authentication candidate configuration is invalid.");
    return mode;
  }
  if (mode === "disabled") return mode;
  if (mode !== undefined && mode !== "")
    throw new Error("Unknown authentication mode.");
  // Preserve the existing unlabelled Clerk configuration until retirement.
  if (env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && env.CLERK_SECRET_KEY)
    return "clerk";
  return "disabled";
}

// Deliberately absent from the current private configuration. The owner must
// separately approve hosted accounts/provider tests before an operator sets it.
export function providerTestApproved(
  env: Record<string, string | undefined> = process.env,
) {
  return (
    authMode(env) === "supabase" &&
    env.AIBEAN_SUPABASE_PROVIDER_TEST_APPROVED === "true"
  );
}
