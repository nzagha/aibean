import { NextRequest, NextResponse } from "next/server";
import {
  passwordConfiguration,
  PASSWORD_COOKIE,
  allowPasswordAttempt,
} from "@/lib/password-auth";
import {
  verifyPassword,
  signPasswordSession,
  SESSION_SECONDS,
} from "@/lib/password-crypto";
import { safeReturnPath } from "@/lib/catalog/filter";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  const allowedOrigins = new Set([
    request.nextUrl.origin,
    process.env.NEXT_PUBLIC_APP_URL
      ? new URL(process.env.NEXT_PUBLIC_APP_URL).origin
      : request.nextUrl.origin,
  ]);
  if (!allowedOrigins.has(request.headers.get("origin") || ""))
    return new Response("Invalid request origin", { status: 403 });
  const config = passwordConfiguration();
  if (!config)
    return new Response("Password login is not configured", { status: 503 });
  if (!allowPasswordAttempt())
    return NextResponse.redirect(
      new URL("/login?error=rate", request.url),
      303,
    );
  const body = await request.text();
  if (body.length > 4096)
    return new Response("Form is too large", { status: 413 });
  const form = new URLSearchParams(body);
  const email = (form.get("email") || "").trim().toLowerCase();
  const password = form.get("password") || "";
  const destination = safeReturnPath(form.get("returnTo"));
  const matches = await verifyPassword(password, config.hash);
  if (email !== config.email || !matches) {
    const target = new URL("/login", request.url);
    target.searchParams.set("error", "credentials");
    target.searchParams.set("returnTo", destination);
    return NextResponse.redirect(target, 303);
  }
  const response = NextResponse.redirect(
    new URL(destination, request.url),
    303,
  );
  response.cookies.set(
    PASSWORD_COOKIE,
    signPasswordSession(config.accountId, config.secret, config.hash),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: request.nextUrl.protocol === "https:",
      path: "/",
      maxAge: SESSION_SECONDS,
    },
  );
  response.headers.set("Cache-Control", "no-store");
  return response;
}
