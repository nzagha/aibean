"use server";
import { requireAdmin, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/security";
import { adminMessage, refreshAfterCommit } from "@/lib/admin/contracts";
import { revalidatePath } from "next/cache";
import type { ActionState } from "@/components/action-form";
import {
  saveAffiliate,
  setProgramStatus,
  reconcileAffiliate,
  hmacReceiptVerifier,
} from "@/lib/creator-enhancements/affiliates";
import {
  savePresentation,
  saveCampaignBlocks,
  unpublishCampaign,
} from "@/lib/creator-enhancements/presentation";
async function perform(
  work: () => Promise<unknown>,
  message: string,
): Promise<ActionState> {
  try {
    await work();
    return refreshAfterCommit({ message }, () => {
      revalidatePath("/admin/affiliates");
      revalidatePath("/admin/profiles");
      revalidatePath("/account/profile");
      revalidatePath("/creator");
      revalidatePath("/creator/content", "layout");
      revalidatePath("/admin/content", "layout");
      revalidatePath("/[creator]", "layout");
    });
  } catch (e) {
    return { error: adminMessage(e) };
  }
}
export async function changeAffiliate(_s: ActionState, form: FormData) {
  const a = await requireAdmin();
  await rateLimit(a.id, "affiliate-admin", 30);
  return perform(async () => {
    const operation = String(form.get("operation")),
      reason = String(form.get("reason")),
      id = String(form.get("id") || ""),
      revision = Number(form.get("revision"));
    if (operation === "status")
      return setProgramStatus(db(), a.id, {
        id,
        revision,
        reason,
        enabled: form.get("enabled") === "true",
      });
    if (!["program", "destination", "relationship"].includes(operation))
      throw Error("Invalid operation.");
    const data = JSON.parse(String(form.get("configuration")));
    return saveAffiliate(
      db(),
      a.id,
      operation as "program" | "destination" | "relationship",
      data,
      id ? { id, revision } : undefined,
      reason,
    );
  }, "Configuration saved. Changed programs are disabled pending independent activation approval.");
}
export async function importAffiliateReceipt(_s: ActionState, form: FormData) {
  const a = await requireAdmin();
  await rateLimit(a.id, "affiliate-reconcile", 20);
  return perform(
    () =>
      reconcileAffiliate(
        db(),
        a.id,
        JSON.parse(String(form.get("receipt"))),
        String(form.get("signature")),
        hmacReceiptVerifier(),
        String(form.get("reason")),
      ),
    "Verified provider receipt reconciled. Recorded clicks remain separate from conversions and commissions.",
  );
}
export async function editPresentation(_s: ActionState, form: FormData) {
  const a = await requireUser("/account/profile");
  await rateLimit(a.id, "creator-presentation", 20);
  return perform(
    () =>
      savePresentation(
        db(),
        a.id,
        String(form.get("revision")),
        JSON.parse(String(form.get("presentation"))),
      ),
    "Presentation saved as a private draft. Submit the profile for editorial review.",
  );
}
export async function editCampaignBlocks(_s: ActionState, form: FormData) {
  const admin = form.get("admin") === "true",
    a = admin ? await requireAdmin() : await requireUser("/creator");
  await rateLimit(a.id, "campaign-blocks", 20);
  return perform(
    () =>
      saveCampaignBlocks(
        db(),
        a.id,
        String(form.get("id")),
        String(form.get("revision")),
        JSON.parse(String(form.get("blocks"))),
        admin,
        String(form.get("reason") || ""),
      ),
    "Ordered blocks saved in a private draft. Submit again for publication review.",
  );
}
export async function takeCampaignOffline(_s: ActionState, form: FormData) {
  const a = await requireUser("/creator");
  await rateLimit(a.id, "campaign-unpublish", 20);
  return perform(
    () =>
      unpublishCampaign(
        db(),
        a.id,
        String(form.get("id")),
        String(form.get("revision")),
      ),
    "Campaign unpublished and preserved as a draft.",
  );
}
