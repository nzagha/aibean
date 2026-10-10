import type { Metadata } from "next";
import localFont from "next/font/local";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { CompareProvider } from "@/components/compare-provider";
import { authConfigured } from "@/lib/auth";
import { getAccountNavigation } from "@/lib/account-navigation-server";
import { ExplorationProvider } from "@/components/exploration-provider";
const satoshi = localFont({
  src: "../../public/brand/Satoshi.ttf",
  variable: "--font-satoshi",
  display: "swap",
  weight: "300 900",
});
const inter = localFont({
  src: "../../public/brand/Inter.ttf",
  variable: "--font-inter",
  display: "swap",
  weight: "100 900",
});
const caveat = localFont({
  src: "../../public/brand/Caveat.ttf",
  variable: "--font-caveat",
  display: "swap",
  weight: "400 700",
  preload: false,
});
export const metadata: Metadata = {
  title: {
    default: "aiBean — Less noise. Better tools.",
    template: "%s | aiBean",
  },
  description:
    "Find AI tools for the work you want to do. Explore categories, discover practical knowledge, and build your next stack with aiBean.",
  openGraph: {
    title: "aiBean — Find. Compare. Master.",
    description: "The AI tool discovery hub for doers.",
    type: "website",
  },
  twitter: { card: "summary", title: "aiBean — Less noise. Better tools." },
};
export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const accountLinks = await getAccountNavigation();
  const content = (
    <ExplorationProvider>
      <CompareProvider>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <Header accountLinks={accountLinks} />
        <main id="main">{children}</main>
        <Footer />
      </CompareProvider>
    </ExplorationProvider>
  );
  return (
    <html
      lang="en"
      className={`${satoshi.variable} ${inter.variable} ${caveat.variable}`}
    >
      <body>
        {authConfigured() ? <ClerkProvider>{content}</ClerkProvider> : content}
      </body>
    </html>
  );
}
