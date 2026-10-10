export const dynamic = "force-dynamic";
import { requireApprovedCreator } from "@/lib/auth";
import { WorkspaceNavigation } from "@/components/workspace-navigation";
import Link from "next/link";
export const metadata = {
  title: "Creator workspace",
  robots: { index: false, follow: false },
};
export default async function Creator() {
  await requireApprovedCreator();
  return (
    <div className="container py-16">
      <h1 className="font-display text-4xl font-bold">Creator workspace</h1>
      <div className="mt-6">
        <WorkspaceNavigation />
      </div>
      <p className="mt-6">
        Your Creator capability is approved. Your User account and personal
        stacks remain available alongside this workspace.
      </p>
      <div className="grid gap-6 md:grid-cols-3 mt-8">
        <section className="placeholder-card">
          <h2 className="text-2xl">Personal stacks</h2>
          <p className="my-5">
            Build and manage your own Tool collections. Public Creator stacks
            are not enabled yet.
          </p>
          <Link href="/account#stacks" className="text-link">
            Manage my stacks →
          </Link>
        </section>
        <section className="placeholder-card">
          <h2 className="text-2xl">Skills and Playbooks</h2>
          <p className="my-5">
            Structured drafts, editorial review and publishing are being
            prepared. No publishing action is available yet.
          </p>
          <Link href="/skills" className="text-link">
            Explore Skills →
          </Link>
        </section>
        <section className="placeholder-card">
          <h2 className="text-2xl">Profile and resources</h2>
          <p className="my-5">
            Public profiles, resource uploads and campaign analytics need the
            Creator data model and validation before they open.
          </p>
          <Link href="/creators" className="text-link">
            Creator community →
          </Link>
        </section>
      </div>
    </div>
  );
}
