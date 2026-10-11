import { ModulePreview } from "@/components/module-preview";
import { PublicContentResults } from "@/components/public-content-results";
import type { AdminParams } from "@/lib/admin/queries";
export const dynamic = "force-dynamic";
export const metadata = { title: "AI Skills" };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<AdminParams>;
}) {
  const params = await searchParams;
  return (
    <ModulePreview
      scope="skills"
      title="Make the next task easier."
      description="Focused AI Skills connect a specific outcome to the tools, prompts, and steps that help you get there."
      results={<PublicContentResults kind="skills" params={params} />}
      items={[
        {
          title: "A clear outcome",
          text: "Know what a Skill helps you accomplish, who it is for, and what you need to start.",
        },
        {
          title: "Tools and instructions",
          text: "Follow practical steps with linked tools, prompts, examples, and approved resources.",
        },
        {
          title: "A route to more",
          text: "Connect task-level Skills to larger Playbooks and the creators who use them.",
        },
      ]}
    />
  );
}
