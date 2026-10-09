export const SUPABASE_PROJECT_REF = "yfknxidgphhepdtwazhn";
export const SUPABASE_PROJECT_URL = `https://${SUPABASE_PROJECT_REF}.supabase.co`;

// Keep public env access explicit so Next.js can inline only these two values.
export function publicSupabaseConfig(
  url = process.env.NEXT_PUBLIC_SUPABASE_URL,
  publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
) {
  if (url !== SUPABASE_PROJECT_URL) {
    throw new Error("Configure the approved aiBean Supabase project URL.");
  }
  if (
    !publishableKey ||
    !/^sb_publishable_[A-Za-z0-9_-]+$/.test(publishableKey)
  ) {
    throw new Error(
      "Configure a Supabase publishable key, never a privileged key.",
    );
  }
  return { url, publishableKey };
}
