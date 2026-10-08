import { NextRequest, NextResponse } from "next/server";
import { PASSWORD_COOKIE } from "@/lib/password-auth";
export async function POST(request: NextRequest) {
  const origins = new Set([
    request.nextUrl.origin,
    process.env.NEXT_PUBLIC_APP_URL
      ? new URL(process.env.NEXT_PUBLIC_APP_URL).origin
      : request.nextUrl.origin,
  ]);
  if (!origins.has(request.headers.get("origin") || ""))
    return new Response("Invalid request origin", { status: 403 });
  const response = NextResponse.redirect(
    new URL("/login?loggedOut=1", request.url),
    303,
  );
  response.cookies.set(PASSWORD_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:",
    path: "/",
    maxAge: 0,
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
