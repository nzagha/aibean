"use client";
import { useActionState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";

export type ActionState = { error?: string; message?: string };
function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button className="button primary" disabled={pending}>
      {pending ? "Please wait…" : label}
    </button>
  );
}
export function ActionForm({
  action,
  children,
  label,
}: {
  action: (state: ActionState, form: FormData) => Promise<ActionState>;
  children: ReactNode;
  label: string;
}) {
  const [state, formAction] = useActionState(action, {});
  return (
    <form action={formAction} className="mt-5">
      {children}
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
      <Submit label={label} />
    </form>
  );
}
