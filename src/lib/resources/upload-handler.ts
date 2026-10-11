import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireAdmin } from "../auth";
import { db } from "../db";
import { rateLimit } from "../security";
import { filesAvailable } from "./storage";
import { checkAuthor } from "../content/workflows";
import { adminMessage } from "../admin/contracts";
import { uploadResource } from "./workflows";
import {
  privateResourceStore,
  loopbackResourceScanner,
  resourceProviderConfigured,
} from "./providers";
import { revalidatePath } from "next/cache";
import { isSameOrigin } from "../request-origin";
const MAX_MULTIPART = 6 * 1024 * 1024;
export async function resourceUploadHandler(
  request: NextRequest,
  admin = false,
) {
  if (!isSameOrigin(request))
    return NextResponse.json(
      { error: "Request origin did not match." },
      { status: 403 },
    );
  const user = admin ? await requireAdmin() : await requireUser("/creator");
  try {
    await rateLimit(user.id, "resource-upload", 10);
    if (!resourceProviderConfigured() || !(await filesAvailable(db())))
      return NextResponse.json(
        {
          error:
            "Private storage, scanning and reviewed file metadata are not enabled.",
        },
        { status: 503 },
      );
    if (!admin)
      await db().transaction((tx) => checkAuthor(tx, user.id, "skills"));
    if (Number(request.headers.get("content-length") || "0") > MAX_MULTIPART)
      throw new Error("Oversized request");
    const reader = request.body?.getReader();
    if (!reader) throw new Error("Missing file body");
    const chunks: Uint8Array[] = [];
    let length = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        length += value.length;
        if (length > MAX_MULTIPART) {
          await reader.cancel();
          throw new Error("Oversized request");
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    const body = Buffer.concat(chunks),
      form = await new Request(request.url, {
        method: "POST",
        headers: { "content-type": request.headers.get("content-type") || "" },
        body,
      }).formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new Error("Missing file");
    await uploadResource(
      db(),
      user.id,
      {
        kind: form.get("kind"),
        id: form.get("id"),
        revision: form.get("revision"),
      },
      {
        name: file.name,
        mime: file.type,
        bytes: new Uint8Array(await file.arrayBuffer()),
      },
      privateResourceStore(),
      loopbackResourceScanner(),
      admin,
    );
    try {
      revalidatePath("/creator", "layout");
      revalidatePath("/admin", "layout");
    } catch {
      /* Committed upload remains successful if cache refresh is unavailable. */
    }
    return NextResponse.json({
      message:
        "File scanned and uploaded privately. Admin review is required before public downloads.",
    });
  } catch (error) {
    return NextResponse.json({ error: adminMessage(error) }, { status: 400 });
  }
}
