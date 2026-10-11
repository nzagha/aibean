import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { registerOutbound } from "@/lib/content/analytics";
import { isSameOrigin, requestOrigin } from "@/lib/request-origin";
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ kind: string; slug: string }> },
) {
  if (!isSameOrigin(request))
    return new NextResponse("Request origin did not match.", { status: 403 });
  const { kind, slug } = await params;
  if (!["tools", "resources", "events"].includes(kind))
    return new NextResponse("Unavailable.", { status: 404 });
  let source: "internal" | "direct" | "external" = "direct";
  try {
    const ref = request.headers.get("referer");
    if (ref)
      source =
        new URL(ref).origin === requestOrigin(request)
          ? "internal"
          : "external";
  } catch {
    // Malformed referrers are treated as direct; no raw URL is retained.
  }
  try {
    const destination = await registerOutbound(
      db(),
      kind as "tools" | "resources" | "events",
      slug,
      source,
    );
    const response = NextResponse.redirect(destination, 303);
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  } catch {
    return new NextResponse(
      "This destination is unavailable. Return to aiBean to find other published content.",
      { status: 404 },
    );
  }
}
