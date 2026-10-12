import { NextResponse } from "next/server";
import { getIdentity } from "@/lib/auth";
import { db } from "@/lib/db";
import { resolveCreatorImage } from "@/lib/creator-enhancements/presentation";
import { privateResourceStore } from "@/lib/resources/providers";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const image = await resolveCreatorImage(
        db(),
        await getIdentity(false),
        (await params).id,
      ),
      store = privateResourceStore();
    await store.assertPrivate();
    if (!store.signImage) throw Error("Image delivery is not configured.");
    const response = NextResponse.redirect(
      await store.signImage(image.objectKey),
      302,
    );
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    response.headers.set("X-Content-Type-Options", "nosniff");
    return response;
  } catch {
    return new NextResponse("Image unavailable.", {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
