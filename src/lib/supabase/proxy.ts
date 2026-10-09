import "server-only";
import type { NextRequest } from "next/server";
import { createSupabaseRouteClient } from "./route";

// Prepared for the coordinated cutover; not called by src/proxy.ts yet.
// This refreshes verified identity only. Protected operations must separately
// resolve the internal User and enforce database capabilities/ownership.
export async function refreshSupabaseSession(request: NextRequest) {
  const { supabase, finish } = createSupabaseRouteClient(request);
  await supabase.auth.getClaims();
  return finish();
}
