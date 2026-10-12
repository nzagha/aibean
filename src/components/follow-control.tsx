import { changeFollow } from "@/app/content-actions";
import Link from "next/link";
import { getIdentity } from "@/lib/auth";
import { db } from "@/lib/db";
import { followState } from "@/lib/discovery/follows";
import type { FollowKind } from "@/lib/discovery/targets";
import { ActionForm } from "./action-form";
import { changeTargetFollow } from "@/app/discovery-actions";
export async function FollowControl({
  kind,
  id,
  returnTo,
}: {
  kind: FollowKind;
  id: string;
  returnTo: string;
}) {
  if (!process.env.DATABASE_URL) return null;
  const user = await getIdentity(false),
    data = await followState(db(), user, kind, id);
  if (!data.ready)
    return kind === "creators" &&
      process.env.AIBEAN_DISCOVERY_WORKFLOWS !== "true" ? (
      <ActionForm action={changeFollow} label="Follow Creator">
        <input type="hidden" name="id" value={id} />
      </ActionForm>
    ) : null;
  return (
    <div className="my-5">
      <p className="text-sm">{data.count} following</p>
      {user ? (
        <ActionForm
          action={changeTargetFollow}
          label={data.following ? "Unfollow" : "Follow"}
          submitClassName="button secondary"
        >
          <input type="hidden" name="kind" value={kind} />
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="remove" value={String(data.following)} />
        </ActionForm>
      ) : (
        <Link
          className="text-link"
          href={"/login?returnTo=" + encodeURIComponent(returnTo)}
        >
          Sign in to follow →
        </Link>
      )}
    </div>
  );
}
