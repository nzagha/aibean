import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync, mkdtempSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import {
  recoveryTables,
  recoverySequences,
  recoveryRelations,
  expandedDumpArguments,
  expandedMetadataPreflight,
  validateExpandedToc,
  type expandedCatalog,
} from "./scope";
import {
  inspectRecoveryPackage,
  assertLocalRecoveryIdentity,
  persistRecoveryReceipt,
} from "./execute";
import {
  exportOperations,
  recoveryOperation,
  safeRecoveryDiagnostic,
} from "./diagnostics";
test("v4b late receipt observer and duplicate writes fail without publishing a new PASS", async () => {
  const file = join(
    mkdtempSync(join(tmpdir(), "aibean-v4b-receipt-")),
    "receipt.json",
  );
  await assert.rejects(
    persistRecoveryReceipt(file, { status: "PASS" }, (_id, state) => {
      if (state === "pass") throw Error("private sentinel");
    }),
  );
  assert(!existsSync(file));
  await persistRecoveryReceipt(file, { status: "PASS" });
  assert.equal(JSON.parse(readFileSync(file, "utf8")).status, "PASS");
  await assert.rejects(persistRecoveryReceipt(file, { status: "OTHER" }));
  assert.equal(JSON.parse(readFileSync(file, "utf8")).status, "PASS");
});
test("v4b exactly matches the approved 29 table/two sequence design and excludes managed data", () => {
  const design = JSON.parse(
    readFileSync("db/recovery/application-coverage-v4-design.json", "utf8"),
  );
  assert.deepEqual(recoveryRelations, design.checkpoints[1].scope);
  assert.equal(recoveryTables.length, 29);
  assert.equal(recoverySequences.length, 2);
  assert.equal(
    expandedDumpArguments("00000001-00000001-1").filter((s) =>
      s.startsWith("--table="),
    ).length,
    31,
  );
  assert(
    !recoveryRelations.some((n) => /^(auth|vault|storage|realtime)\./.test(n)),
  );
  assert.throws(() => expandedDumpArguments("bad-snapshot"));
});
test("v4b rejects incomplete predecessor catalog before application body capture", async () => {
  let bodies = 0;
  await assert.rejects(
    expandedMetadataPreflight(async (s) => {
      if (/AS record|row_to_json/.test(s)) bodies++;
      return [];
    }),
  );
  assert.equal(bodies, 0);
});
test("v4b validates complete multiword policy names and unknown archive objects", () => {
  const catalog = {
    relations: recoveryRelations.map((n) => ({
      schema: n.split(".")[0],
      name: n.split(".")[1],
      owner: "postgres",
    })),
    columns: [],
    constraints: [],
    indexes: [],
    policies: [
      {
        schema: "public",
        relation: "TestUsers",
        name: "Enable read access for all users",
      },
    ],
  } as unknown as Awaited<ReturnType<typeof expandedCatalog>>;
  const toc = [
    ...recoveryTables.map(
      (n, i) => `${i + 1}; 1 1 TABLE ${n.replace(".", " ")} postgres`,
    ),
    ...recoveryTables.map(
      (n, i) => `${i + 100}; 1 1 TABLE DATA ${n.replace(".", " ")} postgres`,
    ),
    ...recoverySequences.map(
      (n, i) => `${i + 200}; 0 0 SEQUENCE SET ${n.replace(".", " ")} postgres`,
    ),
    "999; 1 1 POLICY public TestUsers Enable read access for all users postgres",
  ].join("\n");
  assert.equal(validateExpandedToc(toc, "", catalog), 61);
  assert.throws(() =>
    validateExpandedToc(
      toc.replace("Enable read access for all users", "Enable read"),
      "",
      catalog,
    ),
  );
  assert.throws(() =>
    validateExpandedToc(
      toc + "\n1000; 1 1 TABLE auth users postgres",
      "",
      catalog,
    ),
  );
  assert.throws(() =>
    validateExpandedToc(
      toc,
      "CREATE FUNCTION public.bad() RETURNS int;",
      catalog,
    ),
  );
});
test("v4b identity and all boundary diagnostics remain fail-closed and redacted", async () => {
  const identity = {
    role: "recovery_operator",
    database: "postgres",
    host: "127.0.0.1",
    version: "17.11",
    tls: true,
  };
  assertLocalRecoveryIdentity(identity, true);
  for (const drift of [
    { host: "127.0.0.1/32" },
    { host: "192.0.2.1" },
    { role: "postgres" },
    { database: "wrong" },
    { tls: false },
  ])
    assert.throws(() =>
      assertLocalRecoveryIdentity({ ...identity, ...drift }, true),
    );
  assert.throws(() => assertLocalRecoveryIdentity(identity, false));
  for (const op of exportOperations) {
    let ran = false;
    await assert.rejects(
      recoveryOperation(op, () => {
        ran = true;
        throw Error("private-value/path/password");
      }),
      (e) => {
        const d = safeRecoveryDiagnostic(e);
        assert.equal(d.operation, op);
        assert(!JSON.stringify(d).includes("private-value"));
        return true;
      },
    );
    assert(ran);
  }
});
test("v4b new namespace cannot delete any local target or accept historical artifact names", () => {
  const lifecycle = readFileSync(
      "scripts/recovery-v4b/private-lifecycle.ps1",
      "utf8",
    ),
    crypto = readFileSync("scripts/recovery-v4b/private-crypto.ps1", "utf8");
  assert(!/Remove-Item.*-Recurse/.test(lifecycle));
  assert(lifecycle.includes("^V4bRecovery-"));
  assert(crypto.includes("^v4b-(application|metadata)-"));
  assert(lifecycle.includes("Never reuse target"));
});
test("v4b offline seal and bad execution hash never access protected setup", () => {
  assert.equal(inspectRecoveryPackage().manifest.scope.length, 31);
  assert.throws(() => inspectRecoveryPackage("0".repeat(64)));
  const r = spawnSync(
    process.execPath,
    [
      "node_modules/tsx/dist/cli.mjs",
      "scripts/recovery-v4b/execute.ts",
      "--execute-approved=" + "0".repeat(64),
    ],
    { encoding: "utf8", windowsHide: true },
  );
  assert.equal(r.status, 1);
  assert(!JSON.parse(r.stderr.trim()).hostedExportAttempted);
});
