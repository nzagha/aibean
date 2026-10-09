"use client";

import { createBrowserClient } from "@supabase/ssr";
import { publicSupabaseConfig } from "./config";

export function createSupabaseBrowserClient() {
  const { url, publishableKey } = publicSupabaseConfig();
  return createBrowserClient(url, publishableKey, {
    cookieOptions: {
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    },
  });
}
