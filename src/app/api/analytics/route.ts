import { NextResponse } from "next/server";
import { isSameOrigin } from "@/lib/request-origin";
import { db } from "@/lib/db";
import {
  analyticsSession,
  analyticsEnabled,
} from "@/lib/discovery/analytics-session";
import { recordAnalytics } from "@/lib/discovery/analytics";
import {
  analyticsInput,
  browserEvents,
} from "@/lib/discovery/analytics-contracts";
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return new NextResponse(null, { status: 403 });
  if (!analyticsEnabled()) return new NextResponse(null, { status: 204 });
  try {
    if (Number(request.headers.get("content-length") || 0) > 4096)
      return new NextResponse(null, { status: 413 });
    const reader = request.body?.getReader();
    if (!reader) return new NextResponse(null, { status: 400 });
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.byteLength;
      if (size > 4096) {
        await reader.cancel();
        return new NextResponse(null, { status: 413 });
      }
      chunks.push(part.value);
    }
    const text = Buffer.concat(chunks).toString("utf8");
    const value = analyticsInput.parse(JSON.parse(text));
    if (!browserEvents.has(value.event))
      return new NextResponse(null, { status: 400 });
    await db().transaction(async (tx) =>
      recordAnalytics(tx, await analyticsSession(), value),
    );
    return new NextResponse(null, {
      status: 204,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return new NextResponse(null, { status: 400 });
  }
}
