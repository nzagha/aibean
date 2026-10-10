import { clerkMiddleware } from "@clerk/nextjs/server";
import {
  NextResponse,
  type NextRequest,
  type NextFetchEvent,
} from "next/server";
import { authMode, providerTestApproved } from "./lib/auth-mode";
import { refreshSupabaseSession } from "./lib/supabase/proxy";
const clerk = clerkMiddleware();
export default function proxy(request: NextRequest, event: NextFetchEvent) {
  const mode = authMode();
  if (mode === "supabase") {
    if (!providerTestApproved()) return NextResponse.next();
    return refreshSupabaseSession(request);
  }
  if (mode === "clerk") return clerk(request, event);
  return NextResponse.next();
}
export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico)).*)",
    "/(api|trpc)(.*)",
  ],
};
