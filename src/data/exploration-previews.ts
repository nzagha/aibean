import type { PreviewData } from "@/lib/exploration";
export const featurePreviews: PreviewData[] = [
  {
    id: "feature:find",
    title: "Find your fit.",
    summary: "Start with a task, then narrow the options.",
    href: "/tools",
    linkLabel: "Explore tools",
    details: [
      {
        title: "A useful first question",
        text: "What is one repeatable task you want to make easier? Search for that task, then choose a category or industry.",
      },
      {
        title: "Keep the shortlist manageable",
        text: "Filter by pricing and use case. Save promising tools or put up to four side by side.",
      },
    ],
  },
  {
    id: "feature:compare",
    title: "Get the full picture.",
    summary: "Compare practical differences before committing to a tool.",
    href: "/tools",
    linkLabel: "Preview discovery",
    details: [
      {
        title: "Compare what matters",
        text: "Select Compare on two to four tool cards. Look at features, platform support, best-fit tasks, and limitations together.",
      },
      {
        title: "Unknown is useful information",
        text: "Missing prices and verification dates stay visibly unknown. Paid placement never replaces evidence or changes an organic ranking.",
      },
    ],
  },
  {
    id: "feature:skills",
    title: "Turn tools into skills.",
    summary: "Build understanding through practical work.",
    href: "/skills",
    linkLabel: "Explore AI Skills",
    notice: "AI Skills publishing is planned for a later MVP stage.",
    details: [
      {
        title: "Practice with a clear outcome",
        text: "Pick a small task, define what success looks like, and check the result against that goal. Keep notes on what you changed.",
      },
      {
        title: "What is coming",
        text: "The Skills area will host approved guides and hands-on learning. This preview does not imply that lessons are already available.",
      },
    ],
  },
  {
    id: "feature:stack",
    title: "Build a better stack.",
    summary: "Connect the right tools to a repeatable workflow.",
    href: "/playbooks",
    linkLabel: "Explore playbooks",
    notice: "Playbook publishing is planned for a later MVP stage.",
    details: [
      {
        title: "Think in steps",
        text: "List your inputs, the task each tool handles, and the review needed before the next step. Fewer, well-chosen tools can make a clearer process.",
      },
      {
        title: "Keep useful discoveries",
        text: "The Compare shortlist stays in this browser. With configured accounts, personal stacks and saved tools are kept in your account.",
      },
    ],
  },
];
export const heroDiscovery: PreviewData = {
  ...featurePreviews[0],
  id: "hero:discovery",
  title: "Your next great find.",
};
export const heroWorkflow: PreviewData = {
  ...featurePreviews[3],
  id: "hero:workflow",
  title: "Less scrolling. More doing.",
};
