import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { commerceAvailable } from "@/lib/admin/commerce-storage";
import { readOwnCommerce } from "@/lib/admin/commerce-queries";
import { ActionForm } from "@/components/action-form";
import { AdminToolFields } from "@/components/admin-tool-fields";
import { submitListing, checkout } from "@/app/commerce/actions";
import { WorkspaceNavigation } from "@/components/workspace-navigation";
import { toolSubmissionEligible } from "@/lib/admin/commerce-workflows";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Your Tool submissions",
  robots: { index: false, follow: false },
};
export default async function Submissions() {
  const user = await requireUser("/account/submissions");
  const ready = await commerceAvailable(db());
  const data = ready ? await readOwnCommerce(db(), user.id) : null;
  const eligible = data && (await toolSubmissionEligible(db(), user.id));
  return (
    <div className="container py-16">
      <h1 className="font-display text-4xl">Your Tool submissions</h1>
      <WorkspaceNavigation />
      <p className="preview-notice my-6">
        Paid submissions require editorial review. Approval creates a private
        draft; publication, Tool ownership and verification remain separate.
      </p>
      {!data ? (
        <p>Submissions await the reviewed commercial database installation.</p>
      ) : (
        <>
          <section className="placeholder-card">
            <h2 className="text-2xl">Submit a Tool</h2>
            {eligible ? (
              <ActionForm action={submitListing} label="Save Tool submission">
                <AdminToolFields />
              </ActionForm>
            ) : (
              <p className="preview-notice my-5">
                Tool submissions require approved Creator, Vendor or Admin
                capability. Registration and payment do not grant these
                capabilities.
              </p>
            )}
          </section>
          <section className="placeholder-card mt-8">
            <h2 className="text-2xl">Submission history</h2>
            {!data.submissions.length && (
              <p className="my-5">No submissions yet.</p>
            )}
            {data.submissions.map((s) => (
              <article className="account-row" key={s.id}>
                <h3>
                  {String(s.proposed.name)} · {s.status}
                </h3>
                {s.review_reason && <p className="my-3">{s.review_reason}</p>}
                {s.status === "pending" && (
                  <ActionForm
                    action={checkout}
                    label="Prepare submission checkout"
                  >
                    <input type="hidden" name="kind" value="submission" />
                    <input type="hidden" name="subjectId" value={s.id} />
                  </ActionForm>
                )}
              </article>
            ))}
          </section>
        </>
      )}
    </div>
  );
}
