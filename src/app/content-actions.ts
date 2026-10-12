"use server";
import { analyticsSession } from "@/lib/discovery/analytics-session";
import { requireUser, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/security";
import { revalidatePath } from "next/cache";
import { adminMessage, refreshAfterCommit } from "@/lib/admin/contracts";
import { contentAvailable } from "@/lib/content/storage";
import {
  contentKinds,
  parseContentFields,
  type ContentKind,
} from "@/lib/content/contracts";
import {
  saveContent,
  submitContent,
  moderateContent,
  saveProfile,
  submitProfile,
  moderateProfile,
} from "@/lib/content/workflows";
import {
  saveEntity,
  followCreator,
  markNotificationRead,
  updateStackSettings,
} from "@/lib/content/queries";
import type { ActionState } from "@/components/action-form";
import { reviewResource } from "@/lib/resources/workflows";
import { filesAvailable } from "@/lib/resources/storage";
import {
  createContentReport,
  resolveContentReport,
  featureEvent,
} from "@/lib/content/operations";
async function command(
  work: (id: string) => Promise<ActionState>,
  admin = false,
) {
  const user = admin ? await requireAdmin() : await requireUser();
  try {
    await rateLimit(user.id, "content-operation", 60);
    if (!(await contentAvailable(db())))
      return {
        error: "Reviewed content storage is not installed and enabled.",
      };
    const result = await work(user.id);
    return refreshAfterCommit(result, () => {
      for (const path of [
        "/admin",
        "/creator",
        "/vendor",
        "/account",
        "/skills",
        "/playbooks",
        "/events",
        "/creators",
        "/",
      ])
        revalidatePath(path, "layout");
    });
  } catch (error) {
    return { error: adminMessage(error) };
  }
}
function kindFrom(form: FormData) {
  const kind = String(form.get("kind")) as ContentKind;
  if (!contentKinds.includes(kind)) throw new Error("Invalid content type");
  return kind;
}
async function save(form: FormData, id: string, admin = false) {
  const kind = kindFrom(form);
  const key = form.get("id")
    ? { id: form.get("id"), revision: form.get("revision") }
    : undefined;
  const contentId = await saveContent(
    db(),
    id,
    kind,
    parseContentFields(kind, form),
    key,
    admin,
  );
  return {
    message: "Draft saved. Publication requires independent Admin review.",
    href:
      (admin ? "/admin/content/" : "/creator/content/") +
      kind +
      "/" +
      encodeURIComponent(contentId),
  };
}
export async function saveAuthorContent(_state: ActionState, form: FormData) {
  return command((id) => save(form, id));
}
export async function saveEditorialContent(
  _state: ActionState,
  form: FormData,
) {
  return command((id) => save(form, id, true), true);
}
export async function requestContentReview(
  _state: ActionState,
  form: FormData,
) {
  return command(async (id) => {
    await submitContent(
      db(),
      id,
      kindFrom(form),
      form.get("id"),
      form.get("revision"),
    );
    return { message: "Content submitted for editorial review." };
  });
}
export async function requestEditorialReview(
  _state: ActionState,
  form: FormData,
) {
  return command(async (id) => {
    await submitContent(
      db(),
      id,
      kindFrom(form),
      form.get("id"),
      form.get("revision"),
      true,
    );
    return { message: "Editorial draft submitted for review." };
  }, true);
}
export async function reviewContent(_state: ActionState, form: FormData) {
  return command(async (id) => {
    await moderateContent(db(), id, kindFrom(form), Object.fromEntries(form));
    return {
      message:
        "Editorial decision saved, audited and added to the author's notifications.",
    };
  }, true);
}
export async function editMyProfile(_state: ActionState, form: FormData) {
  return command(async (id) => {
    await saveProfile(db(), id, Object.fromEntries(form), form.get("revision"));
    return {
      message:
        "Private profile draft saved. Public Creator profiles require approval.",
    };
  });
}
export async function requestProfileReview(
  _state: ActionState,
  form: FormData,
) {
  return command(async (id) => {
    await submitProfile(db(), id, form.get("revision"));
    return { message: "Creator profile submitted for review." };
  });
}
export async function reviewCreatorProfile(
  _state: ActionState,
  form: FormData,
) {
  return command(async (id) => {
    await moderateProfile(db(), id, Object.fromEntries(form));
    return { message: "Creator profile decision saved." };
  }, true);
}
export async function changeSavedContent(_state: ActionState, form: FormData) {
  return command(async (id) => {
    const kind = kindFrom(form);
    if (kind === "resources")
      return { error: "Resource campaign saves are not a membership product." };
    await saveEntity(
      db(),
      id,
      kind,
      String(form.get("id")),
      form.get("remove") === "true",
      await analyticsSession(),
    );
    return { message: "Saved content updated." };
  });
}
export async function changeFollow(_state: ActionState, form: FormData) {
  return command(async (id) => {
    await followCreator(
      db(),
      id,
      String(form.get("id")),
      form.get("remove") === "true",
    );
    return { message: "Creator follow updated." };
  });
}
export async function readNotification(_state: ActionState, form: FormData) {
  return command(async (id) => {
    await markNotificationRead(db(), id, String(form.get("id")));
    return { message: "Notification marked read." };
  });
}
export async function editStackSettings(_state: ActionState, form: FormData) {
  return command(async (id) => {
    await updateStackSettings(db(), id, {
      id: form.get("id"),
      orderedToolIds: String(form.get("orderedToolIds") || "")
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean),
      visibility: form.get("visibility"),
      note: form.get("note"),
    });
    return { message: "Stack ordering and visibility saved." };
  });
}

export async function reportContent(_state: ActionState, form: FormData) {
  return command(async (id) => {
    await createContentReport(db(), id, Object.fromEntries(form));
    return { message: "Report received for Admin review." };
  });
}
export async function reviewReportedContent(
  _state: ActionState,
  form: FormData,
) {
  return command(async (id) => {
    await resolveContentReport(db(), id, Object.fromEntries(form));
    return { message: "Report decision saved and audited." };
  }, true);
}
export async function changeEventFeature(_state: ActionState, form: FormData) {
  return command(async (id) => {
    await featureEvent(db(), id, {
      ...Object.fromEntries(form),
      featured: form.get("featured") === "true",
    });
    return {
      message: "Editorial Event featuring saved. Payments have no influence.",
    };
  }, true);
}
export async function reviewResourceFile(_state: ActionState, form: FormData) {
  return command(async (id) => {
    if (!(await filesAvailable(db())))
      return { error: "Reviewed resource-file storage is not enabled." };
    await reviewResource(db(), id, Object.fromEntries(form));
    return {
      message:
        "File decision saved and audited. Existing signed download links expire within 60 seconds.",
    };
  }, true);
}
