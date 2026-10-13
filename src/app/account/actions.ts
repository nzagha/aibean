"use server";
import { revalidatePath } from "next/cache";
import { requireSensitiveUser as requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { updateOwnedAccount, accountCommand } from "@/lib/db/account-workflows";
import { rateLimit } from "@/lib/security";
import type { ActionState } from "@/components/action-form";
import { refreshAfterCommit } from "@/lib/admin/contracts";

export async function updateAccount(
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  const user = await requireUser("/account");
  const input = accountCommand.safeParse(Object.fromEntries(form));
  if (!input.success)
    return {
      error:
        "Check the fields and confirm any stack deletion before continuing.",
    };
  try {
    await rateLimit(user.id, "account-update");
    await updateOwnedAccount(db(), user.id, input.data);
  } catch {
    return {
      error:
        "This item could not be updated. It may be unavailable or you may have reached the request limit. Refresh and try again.",
    };
  }
  return refreshAfterCommit(
    {
      message:
        input.data.operation === "edit-review"
          ? "Review resubmitted for moderation."
          : "Your changes are saved.",
    },
    () => {
      revalidatePath("/account");
      revalidatePath("/creator");
      revalidatePath("/tools", "layout");
    },
  );
}
