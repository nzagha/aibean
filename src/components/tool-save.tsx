"use client";
import { useActionState } from "react";
import { Bookmark } from "lucide-react";
import { updateEngagement } from "@/app/engagement-actions";
export function ToolSave({
  id,
  slug,
  name,
}: {
  id: string;
  slug: string;
  name: string;
}) {
  const [state, action, pending] = useActionState(updateEngagement, {});
  return (
    <form action={action}>
      <input type="hidden" name="operation" value="save" />
      <input type="hidden" name="toolId" value={id} />
      <input type="hidden" name="returnTo" value={"/tools/" + slug} />
      <button
        disabled={pending}
        aria-label={"Save " + name}
        className="icon-button"
      >
        <Bookmark size={18} />
      </button>
      {state.error && (
        <p className="text-xs mt-3" role="alert">
          {state.error}
        </p>
      )}
      {state.message && (
        <p className="text-xs mt-3" role="status">
          {state.message}
        </p>
      )}
    </form>
  );
}
