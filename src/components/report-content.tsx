import { ActionForm } from "./action-form";
import { reportContent } from "@/app/content-actions";
export function ReportContent({
  kind,
  id,
}: {
  kind: "reviews" | "skills" | "playbooks" | "resources" | "events";
  id: string;
}) {
  return (
    <details className="mt-6">
      <summary className="text-link cursor-pointer">Report a problem</summary>
      <ActionForm action={reportContent} label="Send report">
        <input type="hidden" name="kind" value={kind} />
        <input type="hidden" name="id" value={id} />
        <label className="field">
          What needs review?
          <textarea name="reason" required minLength={5} maxLength={1000} />
        </label>
        <p className="text-sm my-4">
          Sign in to submit a report. Reports go to Admin review; they do not
          automatically remove content.
        </p>
      </ActionForm>
    </details>
  );
}
