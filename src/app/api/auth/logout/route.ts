import { NextRequest, NextResponse } from "next/server";
import { PASSWORD_COOKIE } from "@/lib/password-auth";
import { authMode } from "@/lib/auth-mode";
import { candidateAuthPost } from "@/lib/supabase/auth-handler";
import { isSameOrigin, requestOrigin } from "@/lib/request-origin";
export async function POST(request: NextRequest) {
  const mode = authMode();
  if (mode === "supabase") return candidateAuthPost("logout", request);
  if (mode !== "password")
    return new Response("Logout is unavailable", { status: 503 });
  if (!isSameOrigin(request))
    return new Response("Invalid request origin", { status: 403 });
  const response = NextResponse.redirect(
    new URL("/login?loggedOut=1", requestOrigin(request)),
    303,
  );
  response.cookies.set(PASSWORD_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: requestOrigin(request).startsWith("https:"),
    path: "/",
    maxAge: 0,
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
