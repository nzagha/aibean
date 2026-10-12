import { recordAnalytics } from "../discovery/analytics";
import { visibleTarget } from "../discovery/targets";
import type { AnalyticsSession } from "../discovery/analytics-contracts";
import { sql } from "drizzle-orm";
import { z } from "zod";
import type {
  IdentityDatabase,
  IdentityTransaction,
} from "../supabase/identity";
import { audit, checkAdmin, resultRows } from "../admin/tool-workflows";
import {
  AdminWorkflowError,
  recordId,
  revisionInput,
  reasonInput,
} from "../admin/contracts";
import { contentTables } from "../content/contracts";
import { checkAuthor, notify } from "../content/workflows";
import { publicAuthor } from "../content/queries";
import { requireFileStorage, filesAvailable } from "./storage";
import {
  validateResource,
  type ResourceStore,
  type ResourceScanner,
} from "./contracts";
import { adminFilters, type AdminParams } from "../admin/queries";
const parentInput = z.object({
  kind: z.enum(["skills", "playbooks", "resources"]),
  id: recordId,
  revision: revisionInput,
});
const columns = {
  skills: "skill_id",
  playbooks: "playbook_id",
  resources: "resource_id",
} as const;
type Parent = z.infer<typeof parentInput>;
async function ownedParent(
  tx: IdentityTransaction,
  user: string,
  parent: Parent,
  admin: boolean,
) {
  await requireFileStorage(tx);
  if (admin) await checkAdmin(tx, user);
  else await checkAuthor(tx, user, parent.kind);
  const [row] = resultRows<{
    user_id: string;
    status: string;
    revision: string;
  }>(
    await tx.execute(
      sql`SELECT user_id,status,updated_at::text AS revision FROM public.${sql.identifier(contentTables[parent.kind])} WHERE id=${parent.id} AND ${admin ? sql`true` : sql`user_id=${user}`} FOR SHARE`,
    ),
  );
  if (
    !row ||
    row.revision !== parent.revision ||
    !["draft", "rejected", "pending", "published"].includes(row.status)
  )
    throw new AdminWorkflowError(
      "Choose an unchanged owned content item that is still open.",
    );
  return row;
}
export async function uploadResource(
  database: IdentityDatabase,
  user: string,
  value: unknown,
  file: { name: string; mime: string; bytes: Uint8Array },
  store: ResourceStore,
  scanner: ResourceScanner,
  admin = false,
) {
  const parent = parentInput.parse(value);
  await database.transaction((tx) => ownedParent(tx, user, parent, admin));
  const metadata = validateResource(file);
  await store.assertPrivate();
  if ((await scanner.scan(file.bytes)) !== "clean")
    throw new AdminWorkflowError(
      "The malware scanner rejected this file. Nothing was uploaded.",
    );
  await database.transaction(async (tx) => {
    const owner = await ownedParent(tx, user, parent, admin);
    await tx.execute(
      sql`INSERT INTO public.resource_files(id,user_id,${sql.identifier(columns[parent.kind])},object_key,filename,mime,bytes,sha256,scan_status) VALUES(${metadata.id},${owner.user_id},${parent.id},${metadata.objectKey},${metadata.filename},${metadata.mime},${metadata.bytes},${metadata.sha256},'clean')`,
    );
    await audit(tx, user, "resource.upload-reserved", metadata.id, {
      parent: parent.id,
      kind: parent.kind,
      bytes: metadata.bytes,
      sha256: metadata.sha256,
    });
  });
  try {
    await store.upload(metadata.objectKey, file.bytes, metadata.mime);
    await database.transaction(async (tx) => {
      await ownedParent(tx, user, parent, admin);
      await tx.execute(
        sql`UPDATE public.resource_files SET status='pending',updated_at=GREATEST(clock_timestamp(),updated_at+interval '1 microsecond') WHERE id=${metadata.id} AND status='uploading'`,
      );
      await audit(tx, user, "resource.uploaded", metadata.id, {
        scan: "clean",
        moderation: "pending",
        sha256: metadata.sha256,
      });
    });
    return metadata.id;
  } catch {
    let cleaned = false;
    try {
      await store.remove(metadata.objectKey);
      cleaned = true;
    } catch {
      /* Reserved metadata tracks a possible orphan for operator review. */
    }
    try {
      await database.transaction(async (tx) => {
        await tx.execute(
          sql`UPDATE public.resource_files SET status='failed',updated_at=GREATEST(clock_timestamp(),updated_at+interval '1 microsecond') WHERE id=${metadata.id} AND status='uploading'`,
        );
        await audit(tx, user, "resource.upload-failed", metadata.id, {
          newObjectCleaned: cleaned,
        });
      });
    } catch {
      /* An uploading reservation remains inspectable if failure logging is unavailable. */
    }
    throw new AdminWorkflowError(
      "Upload did not complete. The reserved file is unavailable and retained for operator review.",
    );
  }
}
export async function reviewResource(
  database: IdentityDatabase,
  actor: string,
  value: unknown,
) {
  const input = z
    .object({
      id: recordId,
      revision: revisionInput,
      decision: z.enum(["approved", "rejected", "disabled"]),
      reason: reasonInput,
    })
    .parse(value);
  await database.transaction(async (tx) => {
    await requireFileStorage(tx);
    await checkAdmin(tx, actor);
    const [row] = resultRows<FileRow>(
      await tx.execute(
        sql`SELECT *,updated_at::text AS revision FROM public.resource_files WHERE id=${input.id} FOR UPDATE`,
      ),
    );
    if (
      !row ||
      row.revision !== input.revision ||
      (input.decision === "disabled"
        ? row.status !== "approved"
        : row.status !== "pending") ||
      row.scan_status !== "clean"
    )
      throw new AdminWorkflowError("Invalid or stale file review transition.");
    if (input.decision === "approved") {
      const kind = row.skill_id
        ? "skills"
        : row.playbook_id
          ? "playbooks"
          : "resources";
      await checkAuthor(tx, row.user_id, kind);
    }
    await tx.execute(
      sql`UPDATE public.resource_files SET status=${input.decision},reviewer_id=${actor},review_reason=${input.reason},updated_at=GREATEST(clock_timestamp(),updated_at+interval '1 microsecond') WHERE id=${input.id}`,
    );
    await notify(
      tx,
      row.user_id,
      "Resource file: " + input.decision + ". " + input.reason,
    );
    await audit(tx, actor, "resource.reviewed", input.id, {
      from: row.status,
      to: input.decision,
      reason: input.reason,
    });
  });
}
export type FileRow = {
  id: string;
  user_id: string;
  skill_id: string | null;
  playbook_id: string | null;
  resource_id: string | null;
  object_key: string;
  filename: string;
  mime: string;
  bytes: number;
  sha256: string;
  scan_status: string;
  status: string;
  revision: string;
  review_reason: string | null;
};
export async function readResourceFiles(
  database: IdentityDatabase,
  user: string | null,
  parent?: { kind: Parent["kind"]; id: string },
  admin = false,
  params: AdminParams = {},
) {
  const filters = adminFilters(params);
  return database.transaction(async (tx) => {
    if (admin) await checkAdmin(tx, user || "");
    if (!(await filesAvailable(tx)))
      return { ready: false, rows: [] as FileRow[], total: 0, filters };
    let predicate = sql`true`;
    if (parent) {
      const [content] = resultRows<{ user_id: string }>(
        await tx.execute(
          sql`SELECT r.user_id FROM public.${sql.identifier(contentTables[parent.kind])} r JOIN public.users u ON u.id=r.user_id WHERE r.id=${parent.id} AND ${admin ? sql`true` : sql`r.user_id=${user} OR r.status='published' AND ${publicAuthor(parent.kind)}`}`,
        ),
      );
      if (!content)
        return { ready: true, rows: [] as FileRow[], total: 0, filters };
      predicate = sql`${sql.identifier(columns[parent.kind])}=${parent.id} AND ${admin || content.user_id === user ? sql`true` : sql`status='approved'`}`;
    } else if (!admin) predicate = sql`user_id=${user}`;
    const match = "%" + filters.q.replace(/[\\%_]/g, "\\$&") + "%";
    const where = sql`WHERE ${predicate} AND (${filters.status || null}::text IS NULL OR status=${filters.status || null}) AND filename ILIKE ${match}`;
    const rows = resultRows<FileRow>(
      await tx.execute(
        sql`SELECT *,updated_at::text AS revision FROM public.resource_files ${where} ORDER BY created_at DESC,id LIMIT ${filters.size} OFFSET ${(filters.page - 1) * filters.size}`,
      ),
    );
    const [n] = resultRows<{ n: number }>(
      await tx.execute(
        sql`SELECT count(*)::int AS n FROM public.resource_files ${where}`,
      ),
    );
    return { ready: true, rows, total: n.n, filters };
  });
}
export async function downloadResource(
  database: IdentityDatabase,
  user: string | null,
  id: string,
  store: ResourceStore,
  session?: AnalyticsSession,
) {
  recordId.parse(id);
  return database.transaction(async (tx) => {
    if (!(await filesAvailable(tx)))
      throw new AdminWorkflowError("Downloads are not available.");
    const [row] = resultRows<FileRow>(
      await tx.execute(
        sql`SELECT *,updated_at::text AS revision FROM public.resource_files WHERE id=${id} FOR SHARE`,
      ),
    );
    if (
      !row ||
      !["pending", "approved"].includes(row.status) ||
      row.scan_status !== "clean"
    )
      throw new AdminWorkflowError("File unavailable.");
    const [actor] = user
      ? resultRows<{ is_admin: boolean }>(
          await tx.execute(
            sql`SELECT is_admin FROM public.users WHERE id=${user}`,
          ),
        )
      : [];
    const kind = row.skill_id
      ? "skills"
      : row.playbook_id
        ? "playbooks"
        : "resources";
    const target = row.skill_id || row.playbook_id || row.resource_id!;
    if (!actor?.is_admin && row.user_id !== user) {
      if (
        row.status !== "approved" ||
        !resultRows(
          await tx.execute(
            sql`SELECT r.id FROM public.${sql.identifier(contentTables[kind])} r JOIN public.users u ON u.id=r.user_id WHERE r.id=${target} AND r.status='published' AND ${publicAuthor(kind)}`,
          ),
        ).length
      )
        throw new AdminWorkflowError("File unavailable.");
    }
    await store.assertPrivate();
    const destination = await store.sign(row.object_key, row.filename);
    if (
      session &&
      row.status === "approved" &&
      (await visibleTarget(tx, kind, target))
    )
      await recordAnalytics(tx, session, {
        event: "resource_download",
        kind,
        targetId: target,
        ...(kind === "resources" ? { campaignId: target } : {}),
      });
    return destination;
  });
}
