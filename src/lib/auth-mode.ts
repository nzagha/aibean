export type AuthMode = "password" | "clerk" | "supabase" | "disabled";

// Candidate and production gates are exclusive. No private configuration is
// changed by implementation. Evidence/owner flags are operator release inputs.
export function authMode(
  env: Record<string, string | undefined> = process.env,
): AuthMode {
  const mode = env.AIBEAN_AUTH_MODE;
  if (env.AIBEAN_SUPABASE_RELEASE === "production" && mode !== "supabase")
    throw new Error(
      "Production release cannot fall back to legacy authentication.",
    );
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
    if (env.AIBEAN_SUPABASE_RELEASE === "production") {
      if (
        env.NODE_ENV !== "production" ||
        origin.protocol !== "https:" ||
        !["aibean.io", "www.aibean.io"].includes(origin.hostname) ||
        origin.port ||
        origin.username ||
        origin.password ||
        origin.pathname !== "/" ||
        origin.search ||
        origin.hash ||
        env.AIBEAN_SUPABASE_PRODUCTION_APPROVED !== "true" ||
        env.AIBEAN_SUPABASE_HOSTED_E2E_VERIFIED !== "true" ||
        env.AIBEAN_AUTH_LEGACY_RETIREMENT_VERIFIED !== "true" ||
        env.AIBEAN_AUTH_SHARED_STATE !== "postgres" ||
        !/^[A-Za-z0-9_-]{16,80}$/.test(env.AIBEAN_AUTH_RELEASE_EPOCH || "") ||
        (env.AIBEAN_RECOVERY_SECRET?.length || 0) < 64 ||
        !env.DATABASE_URL ||
        env.CLERK_SECRET_KEY ||
        env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
        env.LOCAL_LOGIN_PASSWORD_HASH ||
        env.LOCAL_SESSION_SECRET
      )
        throw new Error(
          "Production authentication release prerequisites are incomplete.",
        );
      return mode;
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
    (env.AIBEAN_SUPABASE_RELEASE === "production" ||
      env.AIBEAN_SUPABASE_PROVIDER_TEST_APPROVED === "true")
  );
}

export function productionAuth(
  env: Record<string, string | undefined> = process.env,
) {
  return (
    authMode(env) === "supabase" && env.AIBEAN_SUPABASE_RELEASE === "production"
  );
}
