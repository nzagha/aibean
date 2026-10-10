import Link from "next/link";
import type { AdminParams } from "@/lib/admin/queries";
export function AdminPages({
  base,
  total,
  params,
  page,
  size = 20,
}: {
  base: string;
  total: number;
  params: AdminParams;
  page: number;
  size?: number;
}) {
  const href = (next: number) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params))
      if (typeof value === "string") query.set(key, value);
    query.set("page", String(next));
    return base + "?" + query.toString();
  };
  return (
    <>
      <p className="my-5 text-sm">
        {total} results · Page {page}
      </p>
      <nav aria-label="Results pages" className="flex gap-5 mt-5">
        {page > 1 && (
          <Link className="text-link" href={href(page - 1)}>
            Previous
          </Link>
        )}
        {page * size < total && (
          <Link className="text-link" href={href(page + 1)}>
            Next
          </Link>
        )}
      </nav>
    </>
  );
}
export function ReasonField() {
  return (
    <label className="field">
      Decision reason
      <textarea name="reason" required minLength={5} maxLength={1000} />
    </label>
  );
}
export function ReviewGate() {
  return (
    <p className="preview-notice">
      This workflow needs the separately reviewed admin-review-v1 database
      package and its private enable flag. No hosted migration has been applied.
      Existing Tool, review and paid claim operations remain available.
    </p>
  );
}
