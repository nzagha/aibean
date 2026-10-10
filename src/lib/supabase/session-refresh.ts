import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_PROJECT_REF } from "./config";
import { safeReturnPath } from "../catalog/filter";

export function clearSupabaseSessionCookies(
  request: NextRequest,
  response: NextResponse,
  allProjectCookies = false,
) {
  for (const cookie of request.cookies.getAll()) {
    if (!cookie.name.startsWith(`sb-${SUPABASE_PROJECT_REF}-`)) continue;
    if (
      !allProjectCookies &&
      cookie.name !== `sb-${SUPABASE_PROJECT_REF}-auth-token` &&
      !new RegExp(`^sb-${SUPABASE_PROJECT_REF}-auth-token\\.\\d+$`).test(
        cookie.name,
      )
    )
      continue;
    request.cookies.delete(cookie.name);
    response.cookies.set(cookie.name, "", {
      path: "/",
      maxAge: 0,
      sameSite: "lax",
      secure: request.nextUrl.protocol === "https:",
    });
  }
}

export async function refreshVerifiedSession(
  request: NextRequest,
  client: {
    auth: Pick<SupabaseClient["auth"], "getClaims">;
    finish: (response?: NextResponse) => NextResponse;
  },
) {
  let valid: boolean;
  try {
    const { data, error } = await client.auth.getClaims();
    valid =
      !error &&
      Boolean(data?.claims.sub) &&
      data?.claims.role === "authenticated" &&
      Number(data.claims.exp) > Date.now() / 1000;
  } catch {
    valid = false;
  }
  const protectedPage = /^\/(account|admin|creator|vendor)(\/|$)/.test(
    request.nextUrl.pathname,
  );
  const target = new URL("/login", request.url);
  target.searchParams.set("error", "expired");
  target.searchParams.set(
    "returnTo",
    safeReturnPath(request.nextUrl.pathname + request.nextUrl.search),
  );
  const response = client.finish(
    !valid && protectedPage ? NextResponse.redirect(target, 303) : undefined,
  );
  if (!valid) clearSupabaseSessionCookies(request, response);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
