"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function ResourceUploadForm({
  kind,
  id,
  revision,
  admin = false,
}: {
  kind: string;
  id: string;
  revision: string;
  admin?: boolean;
}) {
  const [state, setState] = useState<{ error?: string; message?: string }>({}),
    [pending, setPending] = useState(false),
    router = useRouter();
  return (
    <form
      className="mt-5"
      onSubmit={async (event) => {
        event.preventDefault();
        if (pending) return;
        const form = event.currentTarget;
        setPending(true);
        setState({});
        try {
          const response = await fetch(
            admin ? "/admin/resource-upload" : "/resource-upload",
            { method: "POST", body: new FormData(form) },
          );
          const result = await response.json();
          setState(result);
          if (response.ok) {
            form.reset();
            router.refresh();
          }
        } catch {
          setState({ error: "Upload is unavailable. Sign in and try again." });
        } finally {
          setPending(false);
        }
      }}
    >
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="revision" value={revision} />
      <label className="field">
        Resource file
        <input
          type="file"
          name="file"
          accept=".pdf,.txt,.csv,.png,.jpg,.jpeg,.webp"
          required
        />
      </label>
      <p className="text-sm my-5">
        Up to 5 MB. Permitted types are checked and malware scanned. Files stay
        private until independent Admin review.
      </p>
      {state.error && (
        <p role="alert" className="preview-notice my-4">
          {state.error}
        </p>
      )}
      {state.message && (
        <p role="status" className="preview-notice my-4">
          {state.message}
        </p>
      )}
      <button className="button primary" disabled={pending}>
        {pending ? "Scanning and uploading…" : "Upload for review"}
      </button>
    </form>
  );
}
