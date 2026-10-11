import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { registerOutbound } from "@/lib/content/analytics";
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ kind: string; slug: string }> },
) {
  if (request.headers.get("origin") !== request.nextUrl.origin)
    return new NextResponse("Request origin did not match.", { status: 403 });
  const { kind, slug } = await params;
  if (!["tools", "resources", "events"].includes(kind))
    return new NextResponse("Unavailable.", { status: 404 });
  let source: "internal" | "direct" | "external" = "direct";
  try {
    const ref = request.headers.get("referer");
    if (ref)
      source =
        new URL(ref).origin === request.nextUrl.origin
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
    return NextResponse.redirect(destination, 303);
  } catch {
    return new NextResponse(
      "This destination is unavailable. Return to aiBean to find other published content.",
      { status: 404 },
    );
  }
}
