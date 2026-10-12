import { readResourceCampaignLinks } from "@/lib/discovery/campaigns";
import { AnalyticsBeacon } from "@/components/analytics-beacon";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { readPublicProfile, readContentDetail } from "@/lib/content/queries";
import { ReportContent } from "@/components/report-content";
import { PublishedFiles } from "@/components/content-files";
import { creatorHandle } from "@/lib/content/public-path";
export const dynamic = "force-dynamic";
export default async function Resource({
  params,
}: {
  params: Promise<{ creator: string; resource: string }>;
}) {
  const { creator, resource } = await params;
  const handle = creatorHandle(creator);
  if (!handle) notFound();
  const profile = await readPublicProfile(db(), handle);
  if (!profile) notFound();
  const row = await readContentDetail(
    db(),
    null,
    "resources",
    resource,
    "public",
  );
  if (!row || row.user_id !== profile.user_id) notFound();
  const links = await readResourceCampaignLinks(db(), row.id);
  return (
    <div className="container py-16">
      <AnalyticsBeacon
        value={{
          event: "resource_view",
          kind: "resources",
          targetId: row.id,
          campaignId: row.id,
        }}
      />
      <span className="eyebrow">Resource from {profile.display_name}</span>
      <h1 className="my-6 font-display text-5xl font-bold">{row.title}</h1>
      <p className="max-w-3xl text-lg mb-8">{row.summary}</p>
      <section className="placeholder-card max-w-3xl">
        <h2 className="text-2xl">Get this resource</h2>
        <p className="my-5">{String(row.disclosure)}</p>
        <form
          method="post"
          action={"/outbound/resources/" + row.slug}
          target="_blank"
          rel="noopener noreferrer"
        >
          <button className="button primary">Open Creator’s resource →</button>
        </form>
        {links.map((link) => (
          <p className="my-5" key={link.id}>
            <Link className="text-link" href={link.href}>
              Related implementation: {link.title} →
            </Link>
          </p>
        ))}
        <ReportContent kind="resources" id={row.id} />
        <PublishedFiles kind="resources" id={row.id} />
        <p className="text-sm mt-5">
          This opens the Creator’s external website. Check their terms before
          signing up or purchasing.
        </p>
        <Link
          className="text-link inline-block mt-5"
          href={"/@" + profile.handle}
        >
          More from {profile.display_name} →
        </Link>
      </section>
    </div>
  );
}
