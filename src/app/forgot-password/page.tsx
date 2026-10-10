import { AuthPage } from "@/components/auth-page";
import { authMode } from "@/lib/auth-mode";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Password recovery",
  robots: { index: false, follow: false },
};
export default async function ForgotPassword({
  searchParams,
}: {
  searchParams: Promise<{
    returnTo?: string;
    error?: string;
    status?: string;
    field?: string;
  }>;
}) {
  if (authMode() !== "supabase") redirect("/login");
  return <AuthPage view="forgot" {...await searchParams} />;
}
