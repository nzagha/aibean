import "server-only";
import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";
import { publicSupabaseConfig } from "./config";
import { createSessionCookieBridge } from "./cookies";

// The caller MUST return finish(response), including for errors and redirects.
export function createSupabaseRouteClient(request: NextRequest) {
  const { url, publishableKey } = publicSupabaseConfig();
  const bridge = createSessionCookieBridge(request);
  const supabase = createServerClient(url, publishableKey, {
    cookies: bridge.cookies,
    cookieOptions: {
      sameSite: "lax",
      secure: request.nextUrl.protocol === "https:",
      path: "/",
    },
  });
  return { supabase, finish: bridge.finish };
}
