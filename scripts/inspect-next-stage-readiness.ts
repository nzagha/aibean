// Read-only preparation. Never exports hosted row bodies or changes Auth/DB state.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { config } from "dotenv";
import postgres from "postgres";
import { verifiedDatabaseConfig } from "../src/lib/db/tls-config";
import {
  publicSupabaseConfig,
  SUPABASE_PROJECT_REF,
} from "../src/lib/supabase/config";
import {
  credential,
  installed,
  membership,
} from "./execute-approved-runtime-login";
import { verifyRecovery } from "./execute-approved-installation";
import { publicCatalogInventory } from "./inspect-public-backup-scope";

const sha = (value: Buffer) => createHash("sha256").update(value).digest("hex");
const evidencePath = "docs/evidence/supabase-next-stage-readiness.json";

async function main() {
  config({ path: ".env.local", quiet: true });
  const environmentBefore = sha(readFileSync(".env.local"));
  const original = verifyRecovery(); // Existing encrypted archive only; no new dump.
  const installation = JSON.parse(
    readFileSync("db/install/manifest.json", "utf8"),
  );
  const expectedFiles: Record<string, string> = {
    "db/install/reviewed-installation.sql": installation.installationSqlSha256,
    "db/install/identity-and-security.sql": installation.securitySqlSha256,
    "db/install/runtime-login-proposal.sql":
      "3c76ee6f5f203cbc3a140308a1360edb326ed5319fc3de9c3400c35b94e8b940",
    "db/install/testusers-security-proposal.sql":
      installation.optionalTestUsersSqlSha256,
  };
  for (const entry of installation.baselineMigrations)
    expectedFiles[entry.path] = entry.sha256;
  for (const [path, hash] of Object.entries(expectedFiles))
    assert.equal(sha(readFileSync(path)), hash);

  const operatorConnection = credential({ mode: "read-operator" });
  const parsed = new URL(operatorConnection);
  assert.equal(parsed.hostname, `db.${SUPABASE_PROJECT_REF}.supabase.co`);
  assert.equal(parsed.pathname, "/postgres");
  assert.equal(decodeURIComponent(parsed.username), "postgres");
  const connection = verifiedDatabaseConfig(operatorConnection);
  let hostnameVerified = false;
  const verifyHostname = connection.options.ssl.checkServerIdentity!;
  connection.options.ssl.checkServerIdentity = (host, certificate) => {
    const error = verifyHostname(host, certificate);
    if (!error) hostnameVerified = true;
    return error;
  };
  const client = postgres(connection.connectionString, connection.options);
  try {
    const result = await client.begin(
      "ISOLATION LEVEL REPEATABLE READ READ ONLY",
      async (tx) => {
        await tx.unsafe("SET LOCAL timezone='UTC'");
        await tx.unsafe("SET LOCAL statement_timeout='15s'");
        const q = async (text: string) =>
          JSON.parse(JSON.stringify(await tx.unsafe(text)));
        const [identity] = await q(
          "SELECT current_database() AS database,current_user AS operator,current_setting('server_version') AS server_version,current_setting('transaction_read_only') AS read_only,(SELECT ssl FROM pg_stat_ssl WHERE pid=pg_backend_pid()) AS tls",
        );
        assert.equal(identity.database, "postgres");
        assert.equal(identity.operator, "postgres");
        assert.equal(identity.read_only, "on");
        assert.equal(identity.tls, true);
        const foundation = await installed(q); // Catalog/history + counts only.
        await membership(q, true);
        const [counts] = await q(
          'SELECT (SELECT count(*)::int FROM public."TestUsers") AS testusers,(SELECT count(*)::int FROM public.users) AS application_users,(SELECT count(*)::int FROM aibean_private.user_identities) AS mappings,(SELECT count(*)::int FROM auth.users) AS auth_users,(SELECT count(*)::int FROM auth.identities) AS auth_identities',
        );
        assert.deepEqual(counts, {
          testusers: 2,
          application_users: 0,
          mappings: 0,
          auth_users: 0,
          auth_identities: 0,
        });
        // Compute continuity inside PostgreSQL. Only its private digest crosses
        // the connection; personal row bodies never leave the hosted database.
        const [continuity] = await q(
          "SELECT encode(sha256(convert_to(coalesce(string_agg(row_to_json(t)::text,E'\\n' ORDER BY id),''),'UTF8')),'hex') AS digest FROM public.\"TestUsers\" t",
        );
        assert.equal(continuity.digest, original.reference.dataDigest);
        const scopedCatalog = await publicCatalogInventory(async (statement) =>
          (await q(statement)).filter((row: Record<string, unknown>) => {
            if ("relname" in row)
              return ["TestUsers", "TestUsers_id_seq"].includes(
                String(row.relname),
              );
            if ("table_name" in row) return row.table_name === "TestUsers";
            if ("tablename" in row) return row.tablename === "TestUsers";
            return true;
          }),
        );
        for (const key of [
          "tables",
          "columns",
          "constraints",
          "indexes",
          "policies",
        ] as const)
          assert.deepEqual(
            scopedCatalog[key],
            original.reference.metadata[key],
          );
        const sequenceState = await q(
          'SELECT last_value::text,is_called FROM public."TestUsers_id_seq"',
        );
        assert.deepEqual(sequenceState, original.reference.sequenceState);
        const permissions = await q(
          "SELECT r.role,has_table_privilege(r.role,'public.\"TestUsers\"','SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') AS any_table_access,has_any_column_privilege(r.role,'public.\"TestUsers\"','SELECT,INSERT,UPDATE,REFERENCES') AS any_column_access,has_sequence_privilege(r.role,'public.\"TestUsers_id_seq\"','SELECT,USAGE,UPDATE') AS sequence_access FROM (VALUES ('anon'),('authenticated')) r(role) ORDER BY r.role",
        );
        assert(
          permissions.every(
            (row: { any_table_access: boolean; any_column_access: boolean }) =>
              !row.any_table_access && !row.any_column_access,
          ),
        );
        const objects = await q(
          "SELECT n.nspname AS schema,c.relname AS name,c.relkind AS kind,pg_get_userbyid(c.relowner) AS owner,c.relrowsecurity AS rls FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('public','drizzle','aibean_private') AND c.relkind IN ('r','p','S','v','m','f') ORDER BY 1,2",
        );
        assert.equal(
          objects.filter((row: { kind: string }) => row.kind === "r").length,
          18,
        );
        assert.equal(
          objects.filter((row: { kind: string }) => row.kind === "S").length,
          2,
        );
        assert.equal(objects.length, 20);
        return {
          identity,
          counts,
          permissions,
          objects,
          appTables: foundation.app,
          foreignKeys: foundation.foreignKeys.length,
          drizzleHistory: foundation.ledger,
          securityHistory: foundation.security,
        };
      },
    );
    assert(hostnameVerified);
    const { url, publishableKey } = publicSupabaseConfig();
    const response = await fetch(`${url}/auth/v1/settings`, {
      headers: { apikey: publishableKey },
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    assert(response.ok);
    const settings = await response.json();
    const publicAuth = {
      reachable: true,
      emailEnabled: settings.external?.email === true,
      confirmationRequired: settings.mailer_autoconfirm === false,
      signupEnabled: settings.disable_signup === false,
      phoneEnabled: settings.external?.phone === true,
      passkeysEnabled: settings.passkeys_enabled === true,
    };
    assert.equal(sha(readFileSync(".env.local")), environmentBefore);
    const evidence = {
      capturedAt: new Date().toISOString(),
      projectRef: SUPABASE_PROJECT_REF,
      status: "PASS",
      transaction: "REPEATABLE READ READ ONLY",
      hostnameVerified,
      ...result,
      publicAuth,
      testUsersPrivateContinuity: true,
      testUsersDefinitionsPoliciesAndSequenceStatePreserved: true,
      originalArchiveAccessibleAndIntegrityVerified: true,
      originalArchiveDecryptVerified: true,
      existingSqlAndMigrationChecksumsVerified: true,
      runtimeRoleAndMembershipVerified: true,
      environmentUnchanged: true,
      activeAuthMode: process.env.AIBEAN_AUTH_MODE || "implicit",
      candidateProviderGateEnabled:
        process.env.AIBEAN_SUPABASE_PROVIDER_TEST_APPROVED === "true",
      hostedRecordBodiesExported: false,
      hostedWrites: false,
      expandedExportExecuted: false,
      expandedRestoreExecuted: false,
      privateDigestPublished: false,
    };
    writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, {
      flag: "w",
    });
    console.log(JSON.stringify(evidence));
  } finally {
    await client.end({ timeout: 5 });
  }
}
main().catch(() => {
  // Assertions/driver errors may contain private hashes or connection strings.
  console.error(
    "Read-only next-stage inspection failed; private details redacted. No export or hosted writes were attempted.",
  );
  process.exitCode = 1;
});
