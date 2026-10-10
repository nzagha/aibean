import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { providerTestApproved } from "../auth-mode";
import { db } from "../db";
import { resolveSupabaseUser } from "./identity";
import { createSupabaseRouteClient } from "./route";
import { createAuthHandlers, type AuthAction } from "./auth-flow";
import { createAuthLimiter } from "./auth-limits";
import { createProofReplayStore } from "./auth-proof";

const candidateState = globalThis as unknown as {
  aibeanCandidateLimiter?: ReturnType<typeof createAuthLimiter>;
  aibeanCandidateReplay?: ReturnType<typeof createProofReplayStore>;
};
function handlers() {
  if (!providerTestApproved())
    throw new Error("Candidate provider testing is not enabled.");
  candidateState.aibeanCandidateLimiter ??= createAuthLimiter();
  candidateState.aibeanCandidateReplay ??= createProofReplayStore();
  return createAuthHandlers({
    origin: process.env.NEXT_PUBLIC_APP_URL || "",
    secret: process.env.AIBEAN_RECOVERY_SECRET || "",
    client(request) {
      const { supabase, finish } = createSupabaseRouteClient(request);
      return { auth: supabase.auth, finish };
    },
    provision: (uuid) => resolveSupabaseUser(db(), uuid),
    allow: candidateState.aibeanCandidateLimiter,
    replay: candidateState.aibeanCandidateReplay,
  });
}
function unavailable(request: NextRequest, action?: AuthAction) {
  const path =
    action === "register"
      ? "/register"
      : action === "recover"
        ? "/forgot-password"
        : action === "resend"
          ? "/confirm-email"
          : action === "reset"
            ? "/reset-password"
            : "/login";
  let base = request.url;
  try {
    const configured = new URL(process.env.NEXT_PUBLIC_APP_URL || "");
    const actual = new URL(request.url);
    if (
      configured.origin === actual.origin ||
      (actual.hostname === "localhost" &&
        ["127.0.0.1", "[::1]"].includes(configured.hostname) &&
        actual.protocol === configured.protocol &&
        actual.port === configured.port)
    )
      base = configured.origin;
  } catch {
    /* Invalid configuration never selects an external redirect. */
  }
  const url = new URL(path, base);
  url.searchParams.set("error", "unavailable");
  const response = NextResponse.redirect(url, 303);
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
export async function candidateAuthPost(
  action: AuthAction,
  request: NextRequest,
) {
  try {
    return await handlers().post(action, request);
  } catch {
    return unavailable(request, action);
  }
}
export async function candidateAuthCallback(
  request: NextRequest,
  directToken = false,
) {
  try {
    return await handlers().callback(request, directToken);
  } catch {
    return unavailable(request);
  }
}
