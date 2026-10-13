import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { providerTestApproved } from "../auth-mode";
import { db } from "../db";
import { resolveSupabaseUser } from "./identity";
import { createSupabaseRouteClient } from "./route";
import { createAuthHandlers, type AuthAction } from "./auth-flow";
import { sharedAuthSecurity } from "./release-server";
import { ACCESS_COOKIE, INTENT_COOKIE, RECOVERY_COOKIE } from "./auth-proof";
import { clearSupabaseSessionCookies } from "./session-refresh";
function handlers() {
  if (!providerTestApproved())
    throw new Error("Candidate provider testing is not enabled.");
  const security = sharedAuthSecurity();
  return createAuthHandlers({
    origin: process.env.NEXT_PUBLIC_APP_URL || "",
    secret: process.env.AIBEAN_RECOVERY_SECRET || "",
    epoch: process.env.AIBEAN_AUTH_RELEASE_EPOCH,
    client(request) {
      const { supabase, finish } = createSupabaseRouteClient(request);
      return { auth: supabase.auth, finish };
    },
    provision: (uuid) => resolveSupabaseUser(db(), uuid),
    allow: security.allow,
    replay: security,
    security,
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
  if (action === "logout") {
    for (const name of [ACCESS_COOKIE, INTENT_COOKIE, RECOVERY_COOKIE])
      response.cookies.set(name, "", {
        httpOnly: true,
        secure: request.nextUrl.protocol === "https:",
        sameSite: "lax",
        path: "/",
        maxAge: 0,
      });
    clearSupabaseSessionCookies(request, response, true);
  }
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
