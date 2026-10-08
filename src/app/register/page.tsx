import { AuthPage } from "@/components/auth-page";
export const metadata = {
  title: "Create account",
  robots: { index: false, follow: false },
};
export default async function Register({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  return <AuthPage register returnTo={(await searchParams).returnTo} />;
}
