import { AuthPage } from "@/components/auth-page";
export const metadata = {
  title: "Login",
  robots: { index: false, follow: false },
};
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{
    returnTo?: string;
    error?: string;
    loggedOut?: string;
  }>;
}) {
  return <AuthPage {...await searchParams} />;
}
