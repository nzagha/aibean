import { ModulePreview } from "@/components/module-preview";
export const metadata = { title: "Creators" };
export default function Page() {
  return (
    <ModulePreview
      scope="creators"
      title="Learn from people who do the work."
      description="Find the people behind useful AI Skills, practical Playbooks, and thoughtfully assembled tool stacks."
      items={[
        {
          title: "Creator profiles",
          text: "Discover a creator’s tools, Skills, Playbooks, resources, and events in one place.",
        },
        {
          title: "Purpose-built stacks",
          text: "Understand which tools belong together and how a creator uses each one.",
        },
        {
          title: "The exact resource",
          text: "Arrive from a creator’s campaign and find the specific template or workflow they shared.",
        },
      ]}
    />
  );
}
