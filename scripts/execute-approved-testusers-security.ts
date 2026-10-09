// Owner-operated Approval C only; never run at app startup or in CI.
// Exact reviewed table REVOKE only. No sequence/service grants or Auth changes.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { config } from "dotenv";
import postgres from "postgres";
import { verifiedDatabaseConfig } from "../src/lib/db/tls-config";
import { assertRuntimeConnection } from "../src/lib/db/runtime-config";
import { publicSupabaseConfig } from "../src/lib/supabase/config";
import {
  state,
  verifyRecovery,
  compareTestUsers,
} from "./execute-approved-installation";
import {
  credential,
  installed,
  membership,
  runtimeSmoke,
} from "./execute-approved-runtime-login";

const project = "yfknxidgphhepdtwazhn";
const approvedHash =
  "0c53e6cb250512624d4a73135e8ea122eb8573b8be494b9dbe55ac9bb29985db";
const sha = (bytes: string | Buffer) =>
  createHash("sha256").update(bytes).digest("hex");
const canonical = (rows: Record<string, unknown>[]) =>
  rows.map((row) => JSON.stringify(row)).sort();
type Client = ReturnType<typeof postgres>;
type Query = (text: string) => Promise<Record<string, unknown>[]>;
let operator: Client | undefined;
let stage = "configuration";
let attempted = false;
let committed = false;
let rollbackVerified: boolean | null = null;
let before: Awaited<ReturnType<typeof observe>> | undefined;
const checks: string[] = [];
const good = (text: string) => {
  checks.push(text);
  console.log(`PASS ${text}`);
};
function makeQ(tx: { unsafe: (text: string) => PromiseLike<unknown> }): Query {
  return async (text) => JSON.parse(JSON.stringify(await tx.unsafe(text)));
}
async function observe() {
  assert(operator);
  return operator.begin(
    "ISOLATION LEVEL REPEATABLE READ READ ONLY",
    async (tx) => {
      await tx.unsafe("SET LOCAL timezone='UTC'");
      const q = makeQ(tx);
      const source = await state(q, true);
      const foundation = await installed(q);
      const login = await membership(q, true);
      const extraPrivileges = await q(`SELECT r.role,
      has_any_column_privilege(r.role,'public."TestUsers"','SELECT') AS any_column_select,
      has_any_column_privilege(r.role,'public."TestUsers"','INSERT') AS any_column_insert
      FROM (VALUES ('anon'),('authenticated'),('service_role'),('dashboard_user'),('postgres'),('aibean_app_login')) r(role) ORDER BY role`);
      return { source, foundation, login, extraPrivileges };
    },
  );
}
function comparePostflight(after: Awaited<ReturnType<typeof observe>>) {
  assert(before);
  const a = before.source.data;
  const b = after.source.data;
  for (const key of [
    "metadata",
    "details",
    "sequence",
    "sequenceState",
    "dataDigest",
  ] as const)
    assert.deepEqual(b[key], a[key]);
  const expectedAcl = a.acl.filter(
    (row) =>
      !(
        row.kind === "table" &&
        row.object === "TestUsers" &&
        ["PUBLIC", "anon", "authenticated"].includes(String(row.grantee))
      ),
  );
  assert.deepEqual(canonical(b.acl), canonical(expectedAcl));
  assert.deepEqual(b.catalog.schemaAcl, a.catalog.schemaAcl);
  assert.deepEqual(b.catalog.databaseAcl, a.catalog.databaseAcl);
  assert.deepEqual(b.catalog.defaults, a.catalog.defaults);
  assert.deepEqual(b.catalog.necessaryRoles, a.catalog.necessaryRoles);
  assert.deepEqual(
    b.catalog.relevantMemberships,
    a.catalog.relevantMemberships,
  );
  const tablePermissions = [
    "table_select",
    "table_insert",
    "table_update",
    "table_delete",
    "table_truncate",
    "table_references",
    "table_trigger",
  ];
  const expectedPermission = a.permission.map((row) =>
    ["anon", "authenticated"].includes(String(row.role))
      ? {
          ...row,
          ...Object.fromEntries(tablePermissions.map((key) => [key, false])),
        }
      : row,
  );
  assert.deepEqual(b.permission, expectedPermission);
  for (const role of ["anon", "authenticated"]) {
    const extra = after.extraPrivileges.find((row) => row.role === role)!;
    assert.equal(extra.any_column_select, false);
    assert.equal(extra.any_column_insert, false);
  }
  for (const role of [
    "postgres",
    "dashboard_user",
    "service_role",
    "aibean_app_login",
  ])
    assert.deepEqual(
      after.extraPrivileges.find((row) => row.role === role),
      before.extraPrivileges.find((row) => row.role === role),
    );
  assert.deepEqual(after.source.managed, before.source.managed);
  assert.deepEqual(after.source.installation, before.source.installation);
  assert.deepEqual(after.login, before.login);
  // The approved table ACL is the sole permitted catalog difference.
  const expectedCatalog = before.foundation.catalog.map((row) =>
    row.nspname === "public" && row.relname === "TestUsers"
      ? {
          ...row,
          relacl: after.foundation.catalog.find(
            (next) => next.nspname === "public" && next.relname === "TestUsers",
          )!.relacl,
        }
      : row,
  );
  assert.deepEqual(after.foundation, {
    ...before.foundation,
    catalog: expectedCatalog,
  });
}
async function settings() {
  const { url, publishableKey } = publicSupabaseConfig();
  const response = await fetch(`${url}/auth/v1/settings`, {
    headers: { apikey: publishableKey },
    signal: AbortSignal.timeout(10000),
    cache: "no-store",
  });
  assert.equal(response.status, 200);
  return response.json(); // Private comparison only; settings body is never published.
}
async function anonymousApiHead() {
  const { url, publishableKey } = publicSupabaseConfig();
  const response = await fetch(`${url}/rest/v1/TestUsers?select=id&limit=0`, {
    method: "HEAD",
    headers: { apikey: publishableKey, Prefer: "count=exact" },
    signal: AbortSignal.timeout(10000),
    cache: "no-store",
  });
  return {
    status: response.status,
    noUserJwt: true,
    responseBodyRequested: false,
  };
}
async function deniedRoleChecks() {
  assert(operator);
  const results = [];
  for (const [role, operation, statement] of [
    ["anon", "SELECT", 'SELECT 1 FROM public."TestUsers" LIMIT 0'],
    ["authenticated", "SELECT", 'SELECT 1 FROM public."TestUsers" LIMIT 0'],
    [
      "authenticated",
      "INSERT plan only",
      'EXPLAIN (FORMAT JSON) INSERT INTO public."TestUsers" (email) SELECT NULL::text WHERE false',
    ],
  ]) {
    let code: string | undefined;
    try {
      await operator.begin("READ ONLY", async (tx) => {
        await tx.unsafe(`SET LOCAL ROLE ${role}`);
        await tx.unsafe(statement);
      });
    } catch (error) {
      code = (error as { code?: string }).code;
    }
    assert.equal(code, "42501");
    results.push({
      role,
      operation,
      denied: true,
      sqlState: code,
      noDataWritten: true,
    });
  }
  return results;
}
async function main() {
  assert(
    process.argv.includes("--preflight-only") ||
      process.argv.includes(`--approval-c-sha256=${approvedHash}`),
  );
  assert.equal(
    execFileSync("git", ["branch", "--show-current"], {
      encoding: "utf8",
    }).trim(),
    "codex/supabase-foundation",
  );
  assert.equal(
    JSON.parse(
      readFileSync(
        "docs/evidence/supabase-approval-a-installation-2026-10-09.json",
        "utf8",
      ),
    ).result,
    "PASS",
  );
  assert.equal(
    JSON.parse(
      readFileSync(
        "docs/evidence/supabase-approval-b-runtime-login-2026-10-09.json",
        "utf8",
      ),
    ).result,
    "PASS",
  );
  // No production dependency is allowed to slip in after the reviewed search.
  let dependencies: string[] = [];
  try {
    dependencies = execFileSync(
      "git",
      ["grep", "-l", "TestUsers", "--", "src"],
      {
        encoding: "utf8",
      },
    )
      .trim()
      .split(/\r?\n/)
      .filter(Boolean);
  } catch (error) {
    assert.equal((error as { status?: number }).status, 1);
  }
  // Existing permission-aware aggregate diagnostics are not a browser/route
  // dependency. They already tolerate denied TestUsers reads under runtime B.
  assert.deepEqual(dependencies, ["src/lib/db/readiness-inventory.ts"]);
  const diagnosticSource = readFileSync(
    "src/lib/db/readiness-inventory.ts",
    "utf8",
  ).replace(/\r\n/g, "\n");
  assert.equal(
    diagnosticSource,
    execFileSync("git", ["show", "HEAD:src/lib/db/readiness-inventory.ts"], {
      encoding: "utf8",
    }).replace(/\r\n/g, "\n"),
  );
  const sqlBytes = readFileSync("db/install/testusers-security-proposal.sql");
  assert.equal(sha(sqlBytes), approvedHash);
  const manifest = JSON.parse(readFileSync("db/install/manifest.json", "utf8"));
  for (const entry of manifest.baselineMigrations)
    assert.equal(sha(readFileSync(entry.path)), entry.sha256);
  const recovery = verifyRecovery();
  good(
    "Retained encrypted recovery archive and metadata verified; exact C/original migration hashes and production dependency search pass",
  );
  config({ path: ".env.local", quiet: true });
  const environmentHash = sha(readFileSync(".env.local"));
  assertRuntimeConnection(process.env.DATABASE_URL);
  assert.equal(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    `https://${project}.supabase.co`,
  );
  const originalSettings = await settings();
  const connection = verifiedDatabaseConfig(
    credential({ mode: "read-operator" }),
  );
  const url = new URL(connection.connectionString);
  assert.equal(url.hostname, `db.${project}.supabase.co`);
  assert.equal(url.port || "5432", "5432");
  assert.equal(url.username, "postgres");
  let hostnameVerified = false;
  const verify = connection.options.ssl.checkServerIdentity!;
  connection.options.ssl.checkServerIdentity = (host, cert) => {
    const error = verify(host, cert);
    if (!error) hostnameVerified = true;
    return error;
  };
  operator = postgres(connection.connectionString, {
    ...connection.options,
    onnotice: () => {},
    connection: { application_name: "aibean-owner-approved-testusers-c" },
  });
  stage = "mandatory-readonly-preflight";
  before = await observe();
  assert(hostnameVerified);
  const identity = before.source.data.catalog.identity[0];
  assert.equal(identity.database, "postgres");
  assert.equal(identity.role, "postgres");
  assert.equal(identity.read_only, "on");
  assert.equal(identity.tls, true);
  compareTestUsers(recovery.reference, before.source.data);
  const [operatorPrivileges] =
    await operator`SELECT session_user,has_table_privilege(current_user,'public."TestUsers"','SELECT') AS read,(SELECT pg_get_userbyid(relowner)=current_user FROM pg_class WHERE oid='public."TestUsers"'::regclass) AS owner,pg_has_role(current_user,'anon','SET') AS set_anon,pg_has_role(current_user,'authenticated','SET') AS set_authenticated`;
  assert.deepEqual(JSON.parse(JSON.stringify(operatorPrivileges)), {
    session_user: "postgres",
    read: true,
    owner: true,
    set_anon: true,
    set_authenticated: true,
  });
  const runtimeBefore = await runtimeSmoke(process.env.DATABASE_URL!);
  const apiBefore = await anonymousApiHead();
  assert([200, 206].includes(apiBefore.status));
  good(
    "Separate operator/target/trusted TLS verified; both original records and grants match recovery; A/B objects/history and fresh runtime healthy",
  );
  if (process.argv.includes("--preflight-only")) {
    console.log("Approval C preflight PASS; no database changes.");
    return;
  }
  stage = "exact-approved-atomic-revoke";
  assert.equal(
    sha(readFileSync("db/install/testusers-security-proposal.sql")),
    approvedHash,
  );
  attempted = true;
  await operator.unsafe(sqlBytes.toString("utf8")).simple();
  committed = true;
  good(
    "Exact C package committed; only reviewed TestUsers table grants revoked",
  );
  stage = "postflight-preservation-and-denials";
  const after = await observe();
  comparePostflight(after);
  const denied = await deniedRoleChecks();
  const apiAfter = await anonymousApiHead();
  assert([401, 403].includes(apiAfter.status));
  const runtimeAfter = await runtimeSmoke(process.env.DATABASE_URL!);
  assert.deepEqual(runtimeAfter, runtimeBefore);
  assert.deepEqual(await settings(), originalSettings);
  assert.equal(sha(readFileSync(".env.local")), environmentHash);
  const final = await observe();
  comparePostflight(final);
  verifyRecovery();
  good(
    "Two private record contents/definitions/sequence/policies preserved; role denials and anonymous Data API denial verified",
  );
  good(
    "Application metadata/history/runtime, managed metadata/Auth settings/accounts and private environment unchanged",
  );
  const permissionBefore = before.source.data.permission;
  const permissionAfter = final.source.data.permission;
  writeFileSync(
    "docs/evidence/supabase-approval-c-testusers-security-2026-10-09.json",
    JSON.stringify(
      {
        approval: "C",
        result: "PASS",
        verifiedAt: new Date().toISOString(),
        project,
        database: "postgres",
        operator: "postgres",
        sqlSha256: approvedHash,
        commitAcknowledged: committed,
        tlsCaAndHostnameVerified: hostnameVerified,
        separatePrivateOperatorConnection: true,
        recordPreservation: "PASS",
        testUsersRecords: 2,
        privateOriginalBackupContentMatched: true,
        definitionsConstraintsIndexesRlsPoliciesSequenceUnchanged: true,
        operatorAccessPreserved: true,
        expectedAclRemovalOnly: true,
        originalTableAndRelevantGrants: before.source.data.acl,
        grantsAfter: final.source.data.acl,
        originalPolicies: before.source.data.metadata.policies,
        policiesAfter: final.source.data.metadata.policies,
        permissionBefore,
        permissionAfter,
        additionalColumnPrivilegesBefore: before.extraPrivileges,
        additionalColumnPrivilegesAfter: final.extraPrivileges,
        hostedRoleContextDenials: denied,
        anonymousDataApiBefore: apiBefore,
        anonymousDataApiAfter: apiAfter,
        authenticatedDataApiJwtTestVerified: false,
        authenticatedDataApiLimit:
          "No existing end-user JWT/accounts; no users or tokens created under C. Authenticated PostgreSQL context and effective table/column grants verified.",
        applicationTables: 14,
        rlsApplicationTables: 14,
        expectedForeignKeys: 18,
        baselineMigrationEntries: 2,
        securityLedgerEntries: 1,
        foundationAndManagedMetadataUnchanged: true,
        authPublicSettingsUnchanged: true,
        authCountsUnchanged: true,
        authUsers: 0,
        restrictedRuntimeConnection: "PASS",
        runtimeRole: runtimeAfter.identity.current_user,
        runtimeDrizzleAndHostnameVerified: runtimeAfter.hostnameVerified,
        originalMigrationFilesAndLedgersUnchanged: true,
        sequenceAndServiceRolePrivilegesNotRevoked: true,
        schemaDefaultsUnchanged: true,
        noProductionTestUsersDependencyFound: true,
        existingTestUsersDiagnosticDependency:
          "Permission-aware aggregate readiness inventory, used only by operator/test scripts; unchanged from reviewed B",
        applicationEnvironmentUnchanged: true,
        encryptedArchiveReverified: true,
        approvalARepeated: false,
        approvalBRepeated: false,
        authActivated: false,
        accountsCreated: false,
        seedsInserted: false,
        checks,
        failedChecks: [],
        limitations: [
          "Sequence privileges and service_role privileges remain as explicitly excluded",
          "No real authenticated JWT Data API test; no account creation authorized",
          "Unrelated managed row bodies/routine bodies not exported or independently hashed",
          "Recovery archive is the original pre-install scoped TestUsers snapshot; expanded coverage/off-device recovery remain separate",
          "MCP OAuth refresh unavailable; direct strict TLS PostgreSQL used",
        ],
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    "Approval C PASS; repository checks/documentation publication follow. Auth remains unchanged.",
  );
}
if (process.argv[1]?.endsWith("execute-approved-testusers-security.ts"))
  main()
    .catch(async (error) => {
      if (attempted && !committed && operator && before) {
        try {
          await operator.unsafe("ROLLBACK").simple();
          assert.deepEqual(await observe(), before);
          rollbackVerified = true;
        } catch {
          rollbackVerified = false;
        }
      }
      const failure = {
        approvalC: "FAIL",
        stage,
        code:
          typeof error?.code === "string" &&
          /^[A-Z0-9_]{3,50}$/.test(error.code)
            ? error.code
            : "REDACTED",
        attempted,
        commitAcknowledged: committed,
        rollbackVerified,
        automaticRemediationAttempted: false,
        checks,
      };
      console.error(JSON.stringify(failure));
      writeFileSync(
        "docs/evidence/supabase-approval-c-testusers-security-failure-2026-10-09.json",
        JSON.stringify(failure, null, 2) + "\n",
      );
      process.exitCode = 1;
    })
    .finally(async () => {
      await operator?.end({ timeout: 5 });
    });
