import assert from "node:assert/strict";
import { sql } from "drizzle-orm";
import type {
  IdentityDatabase,
  IdentityTransaction,
} from "../../src/lib/supabase/identity";
import {
  saveContent,
  submitContent,
  moderateContent,
} from "../../src/lib/content/workflows";
import { readContentDetail } from "../../src/lib/content/queries";
import {
  uploadResource,
  reviewResource,
  readResourceFiles,
  downloadResource,
} from "../../src/lib/resources/workflows";
import { resultRows } from "../../src/lib/admin/tool-workflows";
import { adminFixtureInput } from "./admin-workflow-contract";
import type {
  ResourceStore,
  ResourceScanner,
} from "../../src/lib/resources/contracts";
export async function resourceWorkflowContract(
  database: IdentityDatabase & IdentityTransaction,
) {
  const flags = [
      "AIBEAN_RESOURCE_UPLOADS",
      "AIBEAN_CONTENT_WORKFLOWS",
    ] as const,
    previous = flags.map((k) => process.env[k]);
  for (const k of flags) process.env[k] = "1";
  try {
    const creator = "content-other",
      admin = "admin-fixture",
      other = "admin-creator";
    const input = {
      title: "File test Skill",
      slug: "resource-file-skill",
      summary: "Synthetic file metadata testing in a disposable database.",
      categoryId: adminFixtureInput.categoryId,
      useCaseIds: [],
      industryIds: [],
      toolIds: [],
      outcome: "A synthetic file download and moderation result.",
      instructions:
        "Follow the synthetic instructions to validate approved resource downloads.",
      prompts: "",
      examples: "",
    };
    const id = await saveContent(database, creator, "skills", input);
    let row = (await readContentDetail(
      database,
      creator,
      "skills",
      id,
      "owner",
    ))!;
    const parent = { kind: "skills", id, revision: row.revision };
    const file = {
      name: "resource.txt",
      mime: "text/plain",
      bytes: new TextEncoder().encode("A synthetic UTF-8 resource file."),
    };
    const objects = new Map<string, Uint8Array>([
        ["original-retained-resource", new Uint8Array([1])],
      ]),
      removed: string[] = [],
      privateChecks: string[] = [];
    const store: ResourceStore = {
      assertPrivate: async () => {
        privateChecks.push("private");
      },
      upload: async (key, bytes) => {
        assert.equal(objects.has(key), false);
        objects.set(key, bytes);
      },
      remove: async (key) => {
        assert.notEqual(key, "original-retained-resource");
        removed.push(key);
        objects.delete(key);
      },
      sign: async (key) => {
        assert.ok(objects.has(key));
        return "https://example.invalid/private-download";
      },
    };
    const scanner: ResourceScanner = { scan: async () => "clean" };
    await assert.rejects(
      uploadResource(database, "admin-ordinary", parent, file, store, scanner),
    );
    await assert.rejects(
      uploadResource(database, other, parent, file, store, scanner),
    );
    await assert.rejects(
      uploadResource(database, creator, parent, file, store, scanner, true),
    );
    await assert.rejects(
      uploadResource(
        database,
        creator,
        parent,
        { ...file, name: "executable.svg" },
        store,
        scanner,
      ),
    );
    await assert.rejects(
      uploadResource(database, creator, parent, file, store, {
        scan: async () => "infected",
      }),
    );
    assert.equal(objects.size, 1);
    const fileId = await uploadResource(
      database,
      creator,
      parent,
      file,
      store,
      scanner,
    );
    let record = (
      await readResourceFiles(database, creator, { kind: "skills", id })
    ).rows[0];
    assert.equal(record.status, "pending");
    assert.equal(record.scan_status, "clean");
    assert.match(record.sha256, /^[a-f0-9]{64}$/);
    assert.ok(!record.object_key.includes(file.name));
    assert.equal(
      (await readResourceFiles(database, other, { kind: "skills", id })).rows
        .length,
      0,
    );
    await assert.rejects(downloadResource(database, other, fileId, store));
    await assert.rejects(downloadResource(database, null, fileId, store));
    assert.equal(
      await downloadResource(database, creator, fileId, store),
      "https://example.invalid/private-download",
    );
    const decision = {
      id: fileId,
      revision: record.revision,
      decision: "approved",
      reason: "Synthetic clean document review",
    };
    await assert.rejects(reviewResource(database, creator, decision));
    await reviewResource(database, admin, decision);
    await assert.rejects(reviewResource(database, admin, decision));
    await assert.rejects(downloadResource(database, null, fileId, store));
    await submitContent(database, creator, "skills", id, row.revision);
    row = (await readContentDetail(database, creator, "skills", id, "owner"))!;
    await moderateContent(database, admin, "skills", {
      id,
      revision: row.revision,
      decision: "published",
      reason: "Synthetic public resource parent approval",
    });
    assert.equal(
      await downloadResource(database, null, fileId, store),
      "https://example.invalid/private-download",
    );
    assert.equal(
      (await readResourceFiles(database, null, { kind: "skills", id })).rows[0]
        .id,
      fileId,
    );
    record = (
      await readResourceFiles(database, admin, undefined, true)
    ).rows.find((r) => r.id === fileId)!;
    await reviewResource(database, admin, {
      id: fileId,
      revision: record.revision,
      decision: "disabled",
      reason: "Synthetic resource download suspension",
    });
    await assert.rejects(downloadResource(database, null, fileId, store));
    assert.equal(
      (await readResourceFiles(database, null, { kind: "skills", id })).rows
        .length,
      0,
    );
    row = (await readContentDetail(database, creator, "skills", id, "owner"))!;
    const current = { kind: "skills", id, revision: row.revision };
    let audits = 0;
    const broken: IdentityDatabase = {
      transaction: (work) =>
        database.transaction((tx) =>
          work({
            execute: async (query) => {
              const t = (
                query as unknown as { queryChunks: unknown[] }
              ).queryChunks
                .map((c) => String((c as { value?: unknown }).value || ""))
                .join("");
              if (t.includes("INSERT INTO public.audit_logs") && ++audits === 2)
                throw Error("Synthetic post-upload audit failure");
              return tx.execute(query);
            },
          }),
        ),
    };
    await assert.rejects(
      uploadResource(broken, creator, current, file, store, scanner),
    );
    const failed = (
      await readResourceFiles(database, admin, undefined, true)
    ).rows.find((r) => r.status === "failed")!;
    assert.ok(failed);
    assert.equal(objects.has(failed.object_key), false);
    assert.ok(removed.includes(failed.object_key));
    assert.ok(objects.has("original-retained-resource"));
    assert.equal(objects.size, 2);
    const count = resultRows<{ n: number }>(
      await database.execute(
        sql`SELECT count(*)::int AS n FROM public.resource_files`,
      ),
    )[0].n;
    await assert.rejects(
      uploadResource(
        database,
        creator,
        current,
        file,
        {
          ...store,
          assertPrivate: async () => {
            throw Error("Synthetic public bucket");
          },
        },
        scanner,
      ),
    );
    assert.equal(
      resultRows<{ n: number }>(
        await database.execute(
          sql`SELECT count(*)::int AS n FROM public.resource_files`,
        ),
      )[0].n,
      count,
    );
    assert.ok(privateChecks.length >= 3);
  } finally {
    flags.forEach((k, i) => {
      if (previous[i] === undefined) delete process.env[k];
      else process.env[k] = previous[i];
    });
  }
}
