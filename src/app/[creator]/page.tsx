import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import {
  readPublicProfile,
  readCreatorPublicContent,
} from "@/lib/content/queries";
import { FollowControl } from "@/components/follow-control";
import { AnalyticsBeacon } from "@/components/analytics-beacon";
import { creatorHandle } from "@/lib/content/public-path";
export const dynamic = "force-dynamic";
export default async function CreatorProfile({
  params,
}: {
  params: Promise<{ creator: string }>;
}) {
  const { creator } = await params;
  const handle = creatorHandle(creator);
  if (!handle) notFound();
  const profile = await readPublicProfile(db(), handle);
  if (!profile) notFound();
  const content = await readCreatorPublicContent(db(), profile.user_id);
  return (
    <div className="container py-16">
      <span className="eyebrow">Approved Creator · @{profile.handle}</span>
      <h1 className="my-6 font-display text-5xl font-bold">
        {profile.display_name}
      </h1>
      <p className="max-w-3xl text-lg mb-8 whitespace-pre-wrap">
        {profile.bio}
      </p>
      {profile.website && (
        <a
          className="text-link"
          href={profile.website}
          target="_blank"
          rel="noopener noreferrer"
        >
          Visit website →
        </a>
      )}
      <FollowControl
        kind="creators"
        id={profile.user_id}
        returnTo={"/@" + profile.handle}
      />
      <AnalyticsBeacon
        value={{
          event: "creator_view",
          kind: "creators",
          targetId: profile.user_id,
        }}
      />

      <div className="grid gap-6 md:grid-cols-3 mt-8">
        {Object.entries(content).map(([kind, items]) => (
          <section className="placeholder-card" key={kind}>
            <h2 className="text-2xl capitalize">{kind}</h2>
            {!items.length && <p className="mt-5">Nothing published yet.</p>}
            {items.map((item) => (
              <article className="account-row" key={item.id}>
                <Link
                  className="text-link"
                  href={
                    kind === "resources"
                      ? "/@" +
                        profile.handle +
                        "/" +
                        ("slug" in item ? item.slug : "")
                      : kind === "stacks"
                        ? "/collections/" + item.id
                        : "/" + kind + "/" + ("slug" in item ? item.slug : "")
                  }
                >
                  {item.title} →
                </Link>
                <p className="mt-3 text-sm">{item.summary}</p>
              </article>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}
