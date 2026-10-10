import type { NextRequest } from "next/server";
import { candidateAuthCallback } from "@/lib/supabase/auth-handler";
export const runtime = "nodejs";
export function GET(request: NextRequest) {
  return candidateAuthCallback(request);
}
