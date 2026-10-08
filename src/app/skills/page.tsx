import { ModulePreview } from "@/components/module-preview";
export const metadata = { title: "AI Skills" };
export default function Page() {
  return (
    <ModulePreview
      scope="skills"
      title="Make the next task easier."
      description="Focused AI Skills connect a specific outcome to the tools, prompts, and steps that help you get there."
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
