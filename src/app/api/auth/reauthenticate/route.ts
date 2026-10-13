import { NextRequest } from "next/server";
import { authMode } from "@/lib/auth-mode";
import { candidateAuthPost } from "@/lib/supabase/auth-handler";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  if (authMode() !== "supabase")
    return new Response("Unavailable", { status: 503 });
  return candidateAuthPost("reauthenticate", request);
}
