"use server";
import { analyticsSession } from "@/lib/discovery/analytics-session";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/security";
import { revalidatePath } from "next/cache";
import { adminMessage, refreshAfterCommit } from "@/lib/admin/contracts";
import type { ActionState } from "@/components/action-form";
import { mutateComparison } from "@/lib/discovery/comparisons";
import { mutateFollow } from "@/lib/discovery/follows";
import { pruneAnalytics } from "@/lib/discovery/analytics";
import { requireAdmin } from "@/lib/auth";
export async function changeComparison(
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  const user = await requireUser("/account/comparisons");
  try {
    await rateLimit(user.id, "saved-comparison", 60);
    const operation = String(form.get("operation"));
    const context = Object.fromEntries(
      ["category", "useCase", "industry"].flatMap((k) =>
        form.get(k) ? [[k, String(form.get(k))]] : [],
      ),
    );
    const id = await mutateComparison(
      db(),
      user.id,
      {
        operation,
        id: form.get("id") || undefined,
        revision: form.get("revision") || undefined,
        name: form.get("name"),
        toolIds: form.getAll("toolIds"),
        context,
      },
      await analyticsSession(),
    );
    return refreshAfterCommit(
      {
        message:
          operation === "delete"
            ? "Comparison deleted."
            : "Comparison saved to your account.",
        href:
          operation === "delete"
            ? "/account/comparisons"
            : "/account/comparisons/" + id,
        hrefLabel:
          operation === "delete"
            ? "Saved comparisons →"
            : "Open saved comparison →",
      },
      () => {
        revalidatePath("/account/comparisons", "layout");
      },
    );
  } catch (error) {
    return { error: adminMessage(error) };
  }
}
export async function changeTargetFollow(
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  const user = await requireUser("/account/following");
  try {
    await rateLimit(user.id, "follow", 120);
    await mutateFollow(db(), user.id, {
      kind: form.get("kind"),
      id: form.get("id"),
      remove: form.get("remove") === "true",
    });
    return refreshAfterCommit(
      {
        message:
          form.get("remove") === "true" ? "Unfollowed." : "Following saved.",
      },
      () => {
        revalidatePath("/", "layout");
        revalidatePath("/account", "layout");
        revalidatePath("/tools", "layout");
        revalidatePath("/skills", "layout");
        revalidatePath("/playbooks", "layout");
        revalidatePath("/events", "layout");
        revalidatePath("/industries", "layout");
        revalidatePath("/creators", "layout");
      },
    );
  } catch (error) {
    return { error: adminMessage(error) };
  }
}
export async function pruneRecordedAnalytics(): Promise<ActionState> {
  const user = await requireAdmin();
  try {
    await rateLimit(user.id, "analytics-retention", 10);
    const count = await pruneAnalytics(db(), user.id);
    revalidatePath("/admin/analytics");
    return { message: `Removed ${count} expired events.` };
  } catch (error) {
    return { error: adminMessage(error) };
  }
}
