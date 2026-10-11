import { ModulePreview } from "@/components/module-preview";
import { PublicContentResults } from "@/components/public-content-results";
import type { AdminParams } from "@/lib/admin/queries";
export const dynamic = "force-dynamic";
export const metadata = { title: "Events" };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<AdminParams>;
}) {
  const params = await searchParams;
  return (
    <ModulePreview
      scope="events"
      title="Find your next room."
      description="Discover workshops, meetups, webinars, and conferences around the AI work that matters to you."
      results={<PublicContentResults kind="events" params={params} />}
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
