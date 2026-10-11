"use client";
import { useActionState, useRef, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";

export type ActionState = {
  error?: string;
  message?: string;
  href?: string;
  hrefLabel?: string;
};
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
  confirmation,
}: {
  action: (state: ActionState, form: FormData) => Promise<ActionState>;
  children: ReactNode;
  label: string;
  confirmation?: string;
}) {
  const preserveOnReset = useRef(false);
  const [state, formAction] = useActionState(
    async (previous: ActionState, form: FormData) => {
      const result = await action(previous, form);
      preserveOnReset.current = Boolean(result.error);
      return result;
    },
    {},
  );
  return (
    <form
      action={formAction}
      className="mt-5"
      onReset={(event) => {
        if (preserveOnReset.current) event.preventDefault();
      }}
      onSubmit={(event) => {
        if (confirmation && !window.confirm(confirmation))
          event.preventDefault();
      }}
    >
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
      {state.href && (
        <p className="my-4">
          <Link className="text-link" href={state.href}>
            {state.hrefLabel || "Open saved draft →"}
          </Link>
        </p>
      )}
      <Submit label={label} />
    </form>
  );
}
