import { NextResponse } from "next/server";
import { getIdentity } from "@/lib/auth";
import { db } from "@/lib/db";
import { downloadResource } from "@/lib/resources/workflows";
import { privateResourceStore } from "@/lib/resources/providers";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const destination = await downloadResource(
      db(),
      await getIdentity(false),
      id,
      privateResourceStore(),
    );
    const response = NextResponse.redirect(destination, 303);
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  } catch {
    return new NextResponse("This file is not available.", {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
