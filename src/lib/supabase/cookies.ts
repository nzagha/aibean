import type { CookieMethodsServer, CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// One bridge per request. A callback may write multiple times; retain every
// cookie and the first write's SDK cache headers when returning a redirect.
export function createSessionCookieBridge(request: NextRequest) {
  const pending = new Map<string, { value: string; options: CookieOptions }>();
  const responseHeaders = new Headers({ "Cache-Control": "private, no-store" });
  const cookies: CookieMethodsServer = {
    getAll: () => request.cookies.getAll(),
    setAll(values, headers) {
      for (const { name, value, options } of values) {
        request.cookies.set(name, value);
        pending.set(name, { value, options });
      }
      for (const [name, value] of Object.entries(headers)) {
        responseHeaders.set(name, value);
      }
    },
  };
  function finish(response = NextResponse.next({ request })) {
    for (const [name, { value, options }] of pending) {
      response.cookies.set(name, value, options);
    }
    responseHeaders.forEach((value, name) => response.headers.set(name, value));
    return response;
  }
  return { cookies, finish };
}
