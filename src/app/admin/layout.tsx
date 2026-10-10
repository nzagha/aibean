import Link from "next/link";
import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/auth";
import { WorkspaceNavigation } from "@/components/workspace-navigation";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};
const links = [
  ["/admin", "Overview"],
  ["/admin/tools", "Tools"],
  ["/admin/reviews", "Reviews & ratings"],
  ["/admin/claims", "Tool claims"],
  ["/admin/disputes", "Ownership disputes"],
  ["/admin/creators", "Creator applications"],
  ["/admin/capabilities", "Capability requests"],
  ["/admin/edits", "Vendor edit requests"],
  ["/admin/verification", "Verification requests"],
  ["/admin/featured", "Featured placements"],
  ["/admin/taxonomy", "Taxonomy provenance"],
  ["/admin/audit", "Audit history"],
];
const menu = (
  <nav aria-label="Admin operations" className="flex flex-col gap-4">
    {links.map(([href, label]) => (
      <Link key={href} className="text-link" href={href}>
        {label}
      </Link>
    ))}
  </nav>
);
export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireAdmin();
  return (
    <div className="container py-16">
      <span className="eyebrow">Admin operations</span>
      <h1 className="my-6 font-display text-4xl font-bold">
        Content and trust.
      </h1>
      <WorkspaceNavigation />
      <details className="placeholder-card mb-6 lg:hidden">
        <summary className="cursor-pointer font-semibold">
          Admin navigation
        </summary>
        <div className="mt-5">{menu}</div>
      </details>
      <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="placeholder-card hidden lg:block self-start">
          {menu}
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
