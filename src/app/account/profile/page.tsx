import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { contentAvailable } from "@/lib/content/storage";
import { readProfile } from "@/lib/content/queries";
import { authorAllowed } from "@/lib/content/workflows";
import { ActionForm } from "@/components/action-form";
import { WorkspaceNavigation } from "@/components/workspace-navigation";
import { ProfilePresentationEditor } from "@/components/creator-enhancements";
import { editMyProfile, requestProfileReview } from "@/app/content-actions";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Your profile",
  robots: { index: false, follow: false },
};
export default async function Profile() {
  const user = await requireUser("/account/profile");
  if (!(await contentAvailable(db())))
    return (
      <div className="container py-16">
        <WorkspaceNavigation />
        <h1 className="text-4xl font-display mb-6">Your profile</h1>
        <p className="preview-notice">
          Profiles will open after the reviewed database package is installed
          and validated.
        </p>
      </div>
    );
  const row = await readProfile(db(), user.id),
    canPublish = await db().transaction((tx) => authorAllowed(tx, user.id));
  return (
    <div className="container py-16">
      <WorkspaceNavigation />
      <h1 className="text-4xl font-display mb-6">Your profile</h1>
      <section className="placeholder-card max-w-3xl">
        <p className="mb-5">
          {row ? row.status : "Private draft"} ·{" "}
          {row?.review_reason ||
            "Public Creator profiles require independent approval."}
        </p>
        <ActionForm
          action={editMyProfile}
          label="Save private profile"
          key={row?.revision || "new"}
        >
          {row && <input type="hidden" name="revision" value={row.revision} />}
          <label className="field">
            Handle
            <input
              name="handle"
              required
              pattern="[a-z0-9][a-z0-9-]{2,29}"
              minLength={3}
              maxLength={30}
              defaultValue={row?.handle}
            />
          </label>
          <p className="text-sm my-4">
            Your published handle stays stable so existing campaign links keep
            working.
          </p>
          <label className="field">
            Display name
            <input
              name="displayName"
              required
              minLength={2}
              maxLength={100}
              defaultValue={row?.display_name}
            />
          </label>
          <label className="field">
            About you
            <textarea
              name="bio"
              required
              minLength={20}
              maxLength={2000}
              defaultValue={row?.bio}
            />
          </label>
          <label className="field">
            Website (optional)
            <input
              name="website"
              type="url"
              maxLength={2000}
              defaultValue={row?.website || ""}
            />
          </label>
        </ActionForm>
        {canPublish && row && ["draft", "rejected"].includes(row.status) && (
          <ActionForm
            action={requestProfileReview}
            label="Request public profile review"
          >
            <input type="hidden" name="revision" value={row.revision} />
          </ActionForm>
        )}
        {row?.status === "published" && (
          <Link
            className="text-link inline-block mt-5"
            href={"/@" + row.handle}
          >
            View public profile →
          </Link>
        )}
        {!canPublish && (
          <p className="my-5 text-sm">
            Public publishing requires an approved Creator capability. Personal
            profile drafts remain private.
          </p>
        )}
      </section>
      {canPublish && row && <ProfilePresentationEditor user={user.id} revision={row.revision}/>}
    </div>
  );
}
