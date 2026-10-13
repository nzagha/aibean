// Read-only historical checkpoint inspection. Never starts, restores or edits a target.
import assert from "node:assert/strict";
import { readFileSync, readdirSync, lstatSync } from "node:fs";
import { join, relative, resolve, isAbsolute } from "node:path";
import { recoverySha, maxArchiveBytes, type RecoveryQuery } from "./scope";
import {
  recoveryTables as priorTables,
  qualifiedRelation,
  expandedMetadataPreflight,
} from "../recovery-v4a/scope";
import { operationsRelations } from "../admin-operations-v2/core";
export type PriorCapture = Awaited<
  ReturnType<typeof import("../recovery-v4a/scope").expandedPrivateSnapshot>
>;
const priorHash =
  "cafbf6932c2395cf1d9c5b889cac86ab67cef6b333e3fd8d12cb8c351bdaaa91";
export type PriorReference = {
  recoveryGate: string;
  packageSha256: string;
  selectedTables: number;
  selectedSequences: number;
  archiveEntries: number;
  archiveSha256: string;
  encryptedArchiveSha256: string;
  encryptedMetadataSha256: string;
};
export function captureHistoricalState(root: string) {
  const entries: {
    file: string;
    bytes: number;
    modified: number;
    hash?: string;
  }[] = [];
  const paths = [
    join(root, "preparation.json"),
    join(root, "Backups"),
    join(root, "ApplicationRecoveryV4a"),
  ];
  const failed = readdirSync(root).filter((n) =>
    /^ExpandedRecovery-[a-f0-9]{32}$/.test(n),
  );
  assert.equal(failed.length, 2, "Historical failed-target inventory drift");
  paths.push(...failed.map((n) => join(root, n)));
  function walk(file: string) {
    const part = relative(resolve(root), resolve(file));
    assert(part && !part.startsWith("..") && !isAbsolute(part));
    const s = lstatSync(file);
    assert(!s.isSymbolicLink());
    if (s.isDirectory()) for (const n of readdirSync(file)) walk(join(file, n));
    else {
      assert(
        !file.endsWith("postmaster.pid"),
        "Historical recovery target must remain stopped",
      );
      entries.push({
        file,
        bytes: s.size,
        modified: s.mtimeMs,
        ...(/\.cms$|profile\.json$|preparation\.json$|target\.json$|receipt-.*\.json$/.test(
          file,
        )
          ? { hash: recoverySha(readFileSync(file)) }
          : {}),
      });
    }
  }
  paths.forEach(walk);
  return entries.sort((a, b) => a.file.localeCompare(b.file));
}
export function inspectPriorCheckpoint(
  root: string,
  bridge: (file: string, request: object) => string,
  listArchive: (bytes: Buffer) => string,
  reference: PriorReference,
) {
  assert.equal(reference.recoveryGate, "PASS");
  assert.equal(reference.packageSha256, priorHash);
  assert.equal(reference.selectedTables, 24);
  assert.equal(reference.selectedSequences, 2);
  assert.equal(reference.archiveEntries, 195);
  const protectedState = JSON.parse(
    bridge("scripts/recovery-v4b/private-predecessor.ps1", {}),
  );
  assert.equal(protectedState.status, "PASS");
  assert.equal(
    bridge("scripts/recovery-v4a/private-crypto.ps1", { mode: "check" }),
    "OK",
  );
  const directory = join(root, "ApplicationRecoveryV4a", "Backups");
  const names = readdirSync(directory).filter((n) =>
    /^v4a-receipt-[a-z0-9-]+\.json$/.test(n),
  );
  assert.equal(names.length, 1);
  const r = JSON.parse(readFileSync(join(directory, names[0]), "utf8"));
  assert.equal(r.version, 4);
  assert.equal(r.namespace, "v4a");
  assert.equal(r.status, "PASS");
  assert.equal(r.packageSha256, priorHash);
  assert.equal(r.sourceProject, "yfknxidgphhepdtwazhn");
  assert.equal(r.sourceDatabase, "postgres");
  assert.equal(r.targetStoppedRetained, true);
  assert.equal(r.archiveSha256, reference.archiveSha256);
  assert.equal(r.ciphertextSha256, reference.encryptedArchiveSha256);
  assert.equal(r.metadataCiphertextSha256, reference.encryptedMetadataSha256);
  for (const n of [r.archiveName, r.metadataName])
    assert(/^v4a-(application|metadata)-[a-z0-9-]+\.cms$/.test(n));
  assert.equal(
    recoverySha(readFileSync(join(directory, r.archiveName))),
    r.ciphertextSha256,
  );
  assert.equal(
    recoverySha(readFileSync(join(directory, r.metadataName))),
    r.metadataCiphertextSha256,
  );
  const archive = Buffer.from(
    bridge("scripts/recovery-v4a/private-crypto.ps1", {
      mode: "decrypt",
      name: r.archiveName,
    }),
    "base64",
  );
  try {
    assert(archive.length > 0 && archive.length <= maxArchiveBytes);
    assert.equal(archive.subarray(0, 5).toString("ascii"), "PGDMP");
    assert.equal(recoverySha(archive), r.archiveSha256);
    assert.equal(
      listArchive(archive)
        .split(/\r?\n/)
        .filter((l) => /^\d+;/.test(l)).length,
      195,
    );
  } finally {
    archive.fill(0);
  }
  const bytes = Buffer.from(
    bridge("scripts/recovery-v4a/private-crypto.ps1", {
      mode: "decrypt",
      name: r.metadataName,
    }),
    "base64",
  );
  let capture: PriorCapture;
  try {
    assert(bytes.length > 0 && bytes.length <= maxArchiveBytes);
    const m = JSON.parse(bytes.toString("utf8"));
    assert.equal(m.version, 4);
    assert.equal(m.packageSha256, priorHash);
    assert.equal(m.sourceProject, r.sourceProject);
    assert.equal(m.sourceDatabase, r.sourceDatabase);
    assert.equal(m.archiveSha256, r.archiveSha256);
    capture = m.capture;
    assert.deepEqual(Object.keys(capture.counts).sort(), priorTables);
    assert.equal(capture.counts["public.TestUsers"], 2);
    assert.equal(capture.reviewHistory.length, 1);
  } finally {
    bytes.fill(0);
  }
  const state = captureHistoricalState(root);
  return {
    capture,
    preserved: () => {
      assert.deepEqual(captureHistoricalState(root), state);
      assert.equal(
        JSON.parse(bridge("scripts/recovery-v4b/private-predecessor.ps1", {}))
          .status,
        "PASS",
      );
    },
  };
}
export async function verifyPriorContinuity(
  q: RecoveryQuery,
  capture: PriorCapture,
) {
  const filtered: RecoveryQuery = async (s) =>
    (await q(s)).filter(
      (r) =>
        !operationsRelations.includes(
          String(r.schema) + "." + String(r.name),
        ) &&
        !operationsRelations.includes(String(r.relation)) &&
        !operationsRelations.includes(
          String(r.schema) + "." + String(r.relation ?? r.object),
        ),
    );
  const now = await expandedMetadataPreflight(filtered);
  for (const k of [
    "catalog",
    "counts",
    "sequenceState",
    "ledgers",
    "security",
    "reviewHistory",
  ] as const)
    assert.deepEqual(
      now[k],
      capture[k],
      "V4a private predecessor continuity drift",
    );
  for (const table of priorTables) {
    const [r] = await q(
      `SELECT encode(sha256(convert_to(coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text COLLATE "C"),''),'UTF8')),'hex') AS digest FROM ${qualifiedRelation(table)} t`,
    );
    assert.equal(
      r.digest,
      capture.content[table],
      "V4a record integrity drift",
    );
  }
}
