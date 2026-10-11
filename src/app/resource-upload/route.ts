import type { NextRequest } from "next/server";
import { resourceUploadHandler } from "@/lib/resources/upload-handler";
export async function POST(request: NextRequest) {
  return resourceUploadHandler(request);
}
