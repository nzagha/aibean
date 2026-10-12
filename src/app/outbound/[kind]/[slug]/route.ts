import { analyticsSession } from "@/lib/discovery/analytics-session";
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
    const fields = /^(application\/x-www-form-urlencoded|multipart\/form-data)/i.test(request.headers.get("content-type")||"") ? await request.formData() : new FormData();
    const campaign = fields.get("campaign");
    const disclosureHash=fields.get("affiliateDisclosure");
    if(disclosureHash&&(typeof disclosureHash!=="string"||!/^[a-f0-9]{64}$/.test(disclosureHash)))return new NextResponse("Invalid disclosure context.",{status:400});
    if (campaign && (typeof campaign !== "string" || campaign.length > 100))
      return new NextResponse("Unavailable campaign.", {status:400});
    const destination = await registerOutbound(
      db(),
      kind as "tools" | "resources" | "events",
      slug,
      source,
      await analyticsSession(),
      typeof campaign === "string" ? campaign : undefined,
      typeof disclosureHash === "string" ? disclosureHash : undefined,
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
