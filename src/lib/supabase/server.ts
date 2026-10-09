import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { publicSupabaseConfig } from "./config";

// Server Components cannot write cookies. Activate the session-refresh proxy
// at auth cutover; use the route client for login/callback/logout mutations.
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const { url, publishableKey } = publicSupabaseConfig();
  return createServerClient(url, publishableKey, {
    cookies: { getAll: () => cookieStore.getAll() },
  });
}
