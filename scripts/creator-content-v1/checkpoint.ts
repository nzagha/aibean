// Read-only encrypted checkpoint inspection. Never starts/restores a recovery target.
import assert from "node:assert/strict";
import { readFileSync, readdirSync, lstatSync } from "node:fs";
import { join, resolve, relative, isAbsolute } from "node:path";
import { spawnSync } from "node:child_process";
import {
  childEnvironment,
  inspectRecoveryPackage,
} from "../recovery-v4b/execute";
import {
  expandedMetadataPreflight,
  recoveryTables,
  qualifiedRelation,
  maxArchiveBytes,
  type RecoveryQuery,
} from "../recovery-v4b/scope";
import { hash, project } from "./core";
export const recoveryHash =
  "523b351d870e36efd9283b06b9a19b68bb2de2b31e0cd87bd200008f27861deb";
export function verifyReceipt(
  r: Record<string, unknown>,
  evidence: Record<string, unknown>,
) {
  assert.equal(evidence.recoveryGate, "PASS");
  assert.equal(evidence.packageSha256, recoveryHash);
  assert.equal(evidence.project, project);
  assert.equal(evidence.database, "postgres");
  assert.equal(r.version, 5);
  assert.equal(r.namespace, "v4b");
  assert.equal(r.status, "PASS");
  assert.equal(r.packageSha256, recoveryHash);
  assert.equal(r.sourceProject, project);
  assert.equal(r.sourceDatabase, "postgres");
  assert.equal(r.targetStoppedRetained, true);
  for (const [a, b] of [
    ["archiveSha256", "archiveSha256"],
    ["ciphertextSha256", "encryptedArchiveSha256"],
    ["metadataCiphertextSha256", "encryptedMetadataSha256"],
  ])
    assert.equal(r[a], evidence[b]);
  assert.equal(evidence.selectedTables, 29);
  assert.equal(evidence.selectedSequences, 2);
  assert.equal(evidence.archiveEntries, 239);
  for (const n of [r.archiveName, r.metadataName])
    assert(/^v4b-(application|metadata)-[a-z0-9-]+\.cms$/.test(String(n)));
}
export function inspectCheckpoint(root: string) {
  inspectRecoveryPackage(recoveryHash);
  assert.equal(process.platform, "win32");
  assert(process.env.AIBEAN_BACKUP_POWERSHELL);
  assert(process.env.AIBEAN_BACKUP_PG_BIN);
  const paths: { file: string; size: number; mtime: number; sha256: string }[] =
    [];
  function walk(file: string) {
    const part = relative(resolve(root), resolve(file));
    assert(part && !part.startsWith("..") && !isAbsolute(part));
    const st = lstatSync(file);
    assert(!st.isSymbolicLink());
    if (st.isDirectory())
      for (const n of readdirSync(file)) walk(join(file, n));
    else {
      assert(
        !file.endsWith("postmaster.pid"),
        "Historical targets must remain stopped",
      );
      paths.push({
        file,
        size: st.size,
        mtime: st.mtimeMs,
        sha256: hash(readFileSync(file)),
      });
    }
  }
  // Read-only witness covers all namespaces, private config and stopped historical targets.
  for (const name of readdirSync(root)) walk(join(root, name));
  function bridge(request: object) {
    const result = spawnSync(
      process.env.AIBEAN_BACKUP_POWERSHELL!,
      [
        "-NoLogo",
        "-NoProfile",
        "-NonInteractive",
        "-File",
        resolve("scripts/recovery-v4b/private-crypto.ps1"),
        "-Root",
        root,
      ],
      {
        input: JSON.stringify(request),
        encoding: "utf8",
        windowsHide: true,
        timeout: 30000,
        maxBuffer: 16 * 1024 * 1024,
        env: childEnvironment(),
      },
    );
    assert.equal(result.status, 0);
    assert(!result.error);
    return result.stdout;
  }
  assert.equal(bridge({ mode: "check" }), "OK");
  const dir = join(root, "ApplicationRecoveryV4b", "Backups");
  const names = readdirSync(dir).filter((n) =>
    /^v4b-receipt-[a-z0-9-]+\.json$/.test(n),
  );
  assert.equal(names.length, 1);
  const receipt = JSON.parse(readFileSync(join(dir, names[0]), "utf8"));
  const publicEvidence = JSON.parse(
    readFileSync(
      "docs/evidence/application-recovery-v4b-hosted-result.json",
      "utf8",
    ),
  );
  verifyReceipt(receipt, publicEvidence);
  for (const [name, digest] of [
    [receipt.archiveName, receipt.ciphertextSha256],
    [receipt.metadataName, receipt.metadataCiphertextSha256],
  ])
    assert.equal(hash(readFileSync(join(dir, name))), digest);
  const archive = Buffer.from(
    bridge({ mode: "decrypt", name: receipt.archiveName }),
    "base64",
  );
  try {
    assert(archive.length > 0 && archive.length <= maxArchiveBytes);
    assert.equal(archive.subarray(0, 5).toString("ascii"), "PGDMP");
    assert.equal(hash(archive), receipt.archiveSha256);
    const listing = spawnSync(
      join(process.env.AIBEAN_BACKUP_PG_BIN!, "pg_restore.exe"),
      ["--list"],
      {
        input: archive,
        windowsHide: true,
        timeout: 30000,
        maxBuffer: 2 * 1024 * 1024,
        env: childEnvironment(),
      },
    );
    assert.equal(listing.status, 0);
    assert(!listing.error);
    assert.equal(
      listing.stdout
        .toString()
        .split(/\r?\n/)
        .filter((n) => /^\d+;/.test(n)).length,
      239,
    );
  } finally {
    archive.fill(0);
  }
  const bytes = Buffer.from(
    bridge({ mode: "decrypt", name: receipt.metadataName }),
    "base64",
  );
  let capture: Awaited<
    ReturnType<typeof import("../recovery-v4b/scope").expandedPrivateSnapshot>
  >;
  try {
    assert(bytes.length > 0 && bytes.length <= maxArchiveBytes);
    const m = JSON.parse(bytes.toString("utf8"));
    assert.equal(m.version, 5);
    assert.equal(m.packageSha256, recoveryHash);
    assert.equal(m.sourceProject, project);
    assert.equal(m.sourceDatabase, "postgres");
    assert.equal(m.archiveSha256, receipt.archiveSha256);
    capture = m.capture;
    assert.deepEqual(Object.keys(capture.counts).sort(), recoveryTables);
    assert.equal(capture.counts["public.TestUsers"], 2);
  } finally {
    bytes.fill(0);
  }
  return {
    capture,
    preserved: () => {
      const before = paths.slice();
      paths.length = 0;
      for (const n of readdirSync(root)) walk(join(root, n));
      assert.deepEqual(paths, before);
      assert.equal(bridge({ mode: "check" }), "OK");
    },
  };
}
export async function verifyCheckpointContinuity(
  q: RecoveryQuery,
  capture: Awaited<
    ReturnType<typeof import("../recovery-v4b/scope").expandedPrivateSnapshot>
  >,
) {
  const now = await expandedMetadataPreflight(q);
  for (const k of [
    "catalog",
    "counts",
    "sequenceState",
    "ledgers",
    "security",
    "reviewHistory",
    "operationsHistory",
  ] as const)
    assert.deepEqual(
      now[k],
      capture[k],
      "Encrypted checkpoint continuity differs",
    );
  for (const name of recoveryTables) {
    const [r] = await q(
      `SELECT encode(sha256(convert_to(coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text COLLATE "C"),''),'UTF8')),'hex') AS digest FROM ${qualifiedRelation(name)} t`,
    );
    assert.equal(
      r.digest,
      capture.content[name],
      "Private record integrity differs",
    );
  }
}
