import { AuthPage } from "@/components/auth-page";
import { authMode } from "@/lib/auth-mode";
import { recoverySessionReady } from "@/lib/supabase/recovery";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Reset password",
  robots: { index: false, follow: false },
};
export default async function ResetPassword({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string; error?: string; field?: string }>;
}) {
  if (authMode() !== "supabase") redirect("/login");
  const query = await searchParams;
  const ready = await recoverySessionReady();
  return (
    <AuthPage
      view="reset"
      {...query}
      error={
        ready
          ? query.error
          : query.error === "expired"
            ? "expired"
            : "invalidlink"
      }
    />
  );
}
