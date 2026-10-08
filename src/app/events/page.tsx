import { ModulePreview } from "@/components/module-preview";
export const metadata = { title: "Events" };
export default function Page() {
  return (
    <ModulePreview
      scope="events"
      title="Find your next room."
      description="Discover workshops, meetups, webinars, and conferences around the AI work that matters to you."
      items={[
        {
          title: "Online or in person",
          text: "Explore virtual, hybrid, and in-person events by topic, industry, and location.",
        },
        {
          title: "Know before you go",
          text: "See the organizer, date, time zone, and relevant tools or learning resources.",
        },
        {
          title: "Register with the organizer",
          text: "Registration stays on the organizer’s external site. Completed events will remain in an archive.",
        },
      ]}
    />
  );
}
