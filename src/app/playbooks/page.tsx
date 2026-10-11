import { ModulePreview } from "@/components/module-preview";
import { PublicContentResults } from "@/components/public-content-results";
import type { AdminParams } from "@/lib/admin/queries";
export const dynamic = "force-dynamic";
export const metadata = { title: "Playbooks" };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<AdminParams>;
}) {
  const params = await searchParams;
  return (
    <ModulePreview
      scope="playbooks"
      title="From first step to finished work."
      description="Free-to-read Playbooks bring tools and AI Skills together into a complete workflow."
      results={<PublicContentResults kind="playbooks" params={params} />}
      items={[
        {
          title: "See the whole route",
          text: "An intended outcome, audience, difficulty, and implementation time before you begin.",
        },
        {
          title: "Follow ordered steps",
          text: "Put tools, Skills, and resources to work in a sequence that makes sense.",
        },
        {
          title: "Build your own stack",
          text: "Discover the tools behind the workflow and compare them for your own needs.",
        },
      ]}
    />
  );
}
