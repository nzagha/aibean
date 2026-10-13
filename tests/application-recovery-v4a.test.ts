import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import {
  recoveryTables,
  recoverySequences,
  recoveryRelations,
  expandedDumpArguments,
  expandedMetadataPreflight,
  validateExpandedToc,
  type expandedCatalog,
} from "../scripts/recovery-v4a/scope";
import {
  inspectRecoveryPackage,
  assertLocalRecoveryIdentity,
} from "../scripts/recovery-v4a/execute";
import {
  exportOperations,
  recoveryOperation,
  safeRecoveryDiagnostic,
} from "../scripts/recovery-v4a/diagnostics";
test("v4a exactly matches the approved 24 table/two sequence design and excludes managed data", () => {
  const design = JSON.parse(
    readFileSync("db/recovery/application-coverage-v4-design.json", "utf8"),
  );
  assert.deepEqual(recoveryRelations, design.checkpoints[0].scope);
  assert.equal(recoveryTables.length, 24);
  assert.equal(recoverySequences.length, 2);
  assert.equal(
    expandedDumpArguments("00000001-00000001-1").filter((s) =>
      s.startsWith("--table="),
    ).length,
    26,
  );
  assert(
    !recoveryRelations.some((n) => /^(auth|vault|storage|realtime)\./.test(n)),
  );
  assert.throws(() => expandedDumpArguments("bad-snapshot"));
});
test("v4a rejects incomplete predecessor catalog before application body capture", async () => {
  let bodies = 0;
  await assert.rejects(
    expandedMetadataPreflight(async (s) => {
      if (/AS record|row_to_json/.test(s)) bodies++;
      return [];
    }),
  );
  assert.equal(bodies, 0);
});
test("v4a validates complete multiword policy names and unknown archive objects", () => {
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
  assert.equal(validateExpandedToc(toc, "", catalog), 51);
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
test("v4a identity and all boundary diagnostics remain fail-closed and redacted", async () => {
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
test("v4a new namespace cannot delete any local target or accept historical artifact names", () => {
  const lifecycle = readFileSync(
      "scripts/recovery-v4a/private-lifecycle.ps1",
      "utf8",
    ),
    crypto = readFileSync("scripts/recovery-v4a/private-crypto.ps1", "utf8");
  assert(!/Remove-Item.*-Recurse/.test(lifecycle));
  assert(lifecycle.includes("^V4aRecovery-"));
  assert(crypto.includes("^v4a-(application|metadata)-"));
  assert(lifecycle.includes("Never reuse target"));
});
test("v4a offline seal and bad execution hash never access protected setup", () => {
  assert.equal(inspectRecoveryPackage().manifest.scope.length, 26);
  assert.throws(() => inspectRecoveryPackage("0".repeat(64)));
  const r = spawnSync(
    process.execPath,
    [
      "node_modules/tsx/dist/cli.mjs",
      "scripts/recovery-v4a/execute.ts",
      "--execute-approved=" + "0".repeat(64),
    ],
    { encoding: "utf8", windowsHide: true },
  );
  assert.equal(r.status, 1);
  assert(!JSON.parse(r.stderr.trim()).hostedExportAttempted);
});
