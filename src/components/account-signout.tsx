import { UserButton } from "@clerk/nextjs";
import type { AuthMode } from "@/lib/auth-mode";

export function AccountSignOut({ mode, compact = false }: { mode: AuthMode; compact?: boolean }) {
  if (mode === "clerk") return compact ? null : <UserButton />;
  if (mode !== "password" && mode !== "supabase") return null;
  return (
    <form action="/api/auth/logout" method="post" className={compact ? "mt-6" : undefined}>
      <button className={compact ? "text-link" : "button secondary"}>Sign out</button>
    </form>
  );
}
