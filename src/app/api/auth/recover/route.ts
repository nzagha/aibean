import type { NextRequest } from "next/server";
import { candidateAuthPost } from "@/lib/supabase/auth-handler";
export const runtime = "nodejs";
export function POST(request: NextRequest) {
  return candidateAuthPost("recover", request);
}
