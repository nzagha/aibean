import Link from "next/link";
import { getAccountNavigation } from "@/lib/account-navigation-server";

export async function WorkspaceNavigation() {
  const links = await getAccountNavigation();
  return (
    <nav aria-label="Your workspaces" className="flex flex-wrap gap-5 mb-8">
      {links.map((link) => (
        <Link key={link.href} href={link.href} className="text-link">
          {link.label} →
        </Link>
      ))}
      {!links.some((link) => link.href === "/creator") && (
        <Link href="/creators/apply" className="text-link">
          Become a Creator →
        </Link>
      )}
      {!links.some((link) => link.href === "/vendor") && (
        <Link href="/for-vendors#get-started" className="text-link">
          Get Started as a Vendor →
        </Link>
      )}
    </nav>
  );
}
