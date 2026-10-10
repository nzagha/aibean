// Owner-reviewed operation only. Defaults to offline inspection. No startup/CI hook.
// Hosted body export requires a separate exact-package owner authorization.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import {
  readFileSync,
  writeFileSync,
  readdirSync,
  existsSync,
  lstatSync,
} from "node:fs";
import { resolve, join, relative, isAbsolute } from "node:path";
import { checkServerIdentity, type PeerCertificate } from "node:tls";
import { config } from "dotenv";
import postgres from "postgres";
import { verifiedDatabaseConfig } from "../src/lib/db/tls-config";
import { assertRuntimeConnection } from "../src/lib/db/runtime-config";
import {
  recoveryProject,
  recoveryTables,
  recoverySequences,
  recoveryRelations,
  recoverySha,
  expandedDumpArguments,
  expandedPrivateSnapshot,
  guardedExpandedCapture,
  compareExpandedSnapshots,
  validateExpandedToc,
  localPrerequisiteGrants,
  maxArchiveBytes,
  applicationRoleContract,
  recoveryDatabaseEnvironment,
  type RecoveryQuery,
  type RecoveryRow,
} from "./expanded-recovery-scope";

export const recoveryManifestPath =
  "db/recovery/expanded-recovery-package-v2.json";
export const requiredRecoveryFiles = [
  ".gitattributes",
  "scripts/execute-expanded-recovery.ts",
  "scripts/expanded-recovery-scope.ts",
  "scripts/private-expanded-recovery.ps1",
  "scripts/private-backup-crypto.ps1",
  "scripts/private-runtime-credential.ps1",
  "db/recovery/expanded-recovery-local-prerequisites.sql",
  "src/lib/db/tls-config.ts",
  "src/lib/db/connection-config.ts",
  "src/lib/db/runtime-config.ts",
  "src/lib/supabase/config.ts",
  "scripts/test-expanded-recovery-executor.ts",
  "scripts/prepare-synthetic-recovery-test.ps1",
  "tests/expanded-recovery.test.ts",
].sort();
type Manifest = {
  packageId: string;
  targetProject: string;
  database: string;
  scope: string[];
  files: { path: string; sha256: string }[];
};
type PrivateProfile = {
  root: string;
  backups: string;
  postgresBin: string;
  sourceProject: string;
  database: string;
};
type LocalTarget = {
  name: string;
  directory: string;
  data: string;
  host: string;
  port: number;
  role: string;
  database: string;
  ca: string;
  packageSha256: string;
};
export function inspectRecoveryPackage(approvedSha?: string) {
  const bytes = readFileSync(recoveryManifestPath);
  const manifest = JSON.parse(bytes.toString("utf8")) as Manifest;
  const packageSha256 = recoverySha(bytes);
  if (approvedSha)
    assert.equal(
      packageSha256,
      approvedSha,
      "Reviewed recovery package hash differs",
    );
  assert.equal(manifest.packageId, "aibean-expanded-recovery-v2");
  assert.equal(manifest.targetProject, recoveryProject);
  assert.equal(manifest.database, "postgres");
  assert.deepEqual(manifest.scope, recoveryRelations);
  assert.deepEqual(
    manifest.files.map((file) => file.path).sort(),
    requiredRecoveryFiles,
  );
  for (const file of manifest.files)
    assert.equal(
      recoverySha(readFileSync(file.path)),
      file.sha256,
      "Reviewed recovery file hash differs",
    );
  return { manifest, packageSha256 };
}
const childEnvironment = () => {
  const env: NodeJS.ProcessEnv = { NODE_ENV: "production" };
  for (const key of [
    "PATH",
    "Path",
    "SystemRoot",
    "WINDIR",
    "COMSPEC",
    "PATHEXT",
    "USERPROFILE",
    "APPDATA",
    "LOCALAPPDATA",
    "TEMP",
    "TMP",
    "ProgramData",
    "ProgramFiles",
    "HOMEDRIVE",
    "HOMEPATH",
    "OneDrive",
    "OneDriveConsumer",
    "OneDriveCommercial",
  ])
    if (process.env[key]) env[key] = process.env[key];
  return env;
};
const inside = (parent: string, file: string) => {
  const part = relative(resolve(parent), resolve(file));
  assert(
    part && !part.startsWith("..") && !isAbsolute(part),
    "Private path containment failed",
  );
};
let stage = "offline-package-inspection";
let attemptedExport = false;
let target: LocalTarget | undefined;
let source: ReturnType<typeof postgres> | undefined;
let local: ReturnType<typeof postgres> | undefined;
let retainedArchive = false;
const root = () => {
  assert(
    process.platform === "win32" &&
      process.env.AIBEAN_BACKUP_ROOT &&
      process.env.AIBEAN_BACKUP_POWERSHELL,
    "Existing private Windows recovery configuration required",
  );
  return resolve(process.env.AIBEAN_BACKUP_ROOT);
};
const bridge = (file: string, request: object) => {
  const result = spawnSync(
    process.env.AIBEAN_BACKUP_POWERSHELL!,
    [
      "-NoLogo",
      "-NoProfile",
      "-NonInteractive",
      "-File",
      resolve(file),
      "-Root",
      root(),
    ],
    {
      input: JSON.stringify(request),
      encoding: "utf8",
      windowsHide: true,
      timeout: 60000,
      maxBuffer: 16 * 1024 * 1024,
      env: childEnvironment(),
    },
  );
  assert.equal(
    result.status,
    0,
    "Private Windows operation failed; diagnostics redacted",
  );
  assert(!result.error);
  return result.stdout;
};
const crypto = (request: object) =>
  bridge("scripts/private-backup-crypto.ps1", request);
const lifecycle = (request: object) =>
  bridge("scripts/private-expanded-recovery.ps1", request);
const native = (
  profile: PrivateProfile,
  name: string,
  args: string[],
  env = childEnvironment(),
  input?: Buffer,
) => {
  const result = spawnSync(join(profile.postgresBin, `${name}.exe`), args, {
    env,
    input,
    windowsHide: true,
    timeout: 60000,
    maxBuffer: 16 * 1024 * 1024,
  });
  assert.equal(
    result.status,
    0,
    "Native recovery operation failed; diagnostics redacted",
  );
  assert(!result.error);
  assert.equal(
    result.stderr?.length || 0,
    0,
    "Native warning needs private review",
  );
  return result.stdout;
};
const q =
  (tx: { unsafe: (text: string) => PromiseLike<unknown> }): RecoveryQuery =>
  async (text: string) =>
    JSON.parse(JSON.stringify(await tx.unsafe(text)));
const pgEnvironment = (
  host: string,
  port: number,
  role: string,
  password: string,
  ca: string,
  readOnly: boolean,
) => ({
  ...childEnvironment(),
  PGHOST: host,
  PGPORT: String(port),
  PGDATABASE: "postgres",
  PGUSER: role,
  PGPASSWORD: password,
  PGSSLMODE: "verify-full",
  PGSSLROOTCERT: ca,
  PGCONNECT_TIMEOUT: "10",
  PGAPPNAME: readOnly
    ? "aibean-expanded-readonly-export"
    : "aibean-expanded-isolated-restore",
  PGCLIENTENCODING: "UTF8",
  PGOPTIONS: `-c statement_timeout=60000 -c lock_timeout=5000${readOnly ? " -c default_transaction_read_only=on" : ""}`,
});

function originalRecovery(profile: PrivateProfile) {
  assert.equal(crypto({ mode: "check" }), "OK");
  const receipts = readdirSync(profile.backups).filter((name) =>
    /^public-receipt-[a-z0-9-]+\.json$/.test(name),
  );
  assert.equal(
    receipts.length,
    1,
    "Retained original recovery receipt is not unique",
  );
  const receipt = JSON.parse(
    readFileSync(join(profile.backups, receipts[0]), "utf8"),
  );
  assert.equal(receipt.status, "PASS");
  assert.equal(receipt.sourceProject, recoveryProject);
  assert(/^public-before-install-[a-z0-9-]+\.cms$/.test(receipt.archiveName));
  assert(/^public-metadata-[a-z0-9-]+\.cms$/.test(receipt.metadataName));
  const evidence = JSON.parse(
    readFileSync(
      "docs/evidence/supabase-hosted-scoped-recovery-2026-10-09.json",
      "utf8",
    ),
  );
  assert.equal(evidence.recoveryGate, "PASS");
  assert.equal(
    recoverySha(readFileSync(join(profile.backups, receipt.archiveName))),
    evidence.encryptedArchiveSha256,
  );
  assert.equal(
    recoverySha(readFileSync(join(profile.backups, receipt.metadataName))),
    evidence.encryptedMetadataSha256,
  );
  const archive = Buffer.from(
    crypto({ mode: "decrypt", name: receipt.archiveName }),
    "base64",
  );
  assert.equal(recoverySha(archive), evidence.archiveSha256);
  archive.fill(0);
  const metadata = JSON.parse(
    Buffer.from(
      crypto({ mode: "decrypt", name: receipt.metadataName }),
      "base64",
    ).toString("utf8"),
  );
  assert.equal(metadata.sourceProject, recoveryProject);
  assert.equal(metadata.sourceDatabase, "postgres");
  return {
    dataDigest: metadata.snapshot.dataDigest as string,
    preserved: [receipts[0], receipt.archiveName, receipt.metadataName].map(
      (name) => ({
        name,
        hash: recoverySha(readFileSync(join(profile.backups, name))),
      }),
    ),
  };
}
async function checkSourceIdentity(tx: {
  unsafe: (text: string) => PromiseLike<unknown>;
}) {
  const [identity] = await q(tx)(
    "SELECT current_database() AS database,current_user AS role,current_setting('transaction_read_only') AS read_only,(SELECT ssl FROM pg_stat_ssl WHERE pid=pg_backend_pid()) AS tls",
  );
  assert.deepEqual(identity, {
    database: "postgres",
    role: "postgres",
    read_only: "on",
    tls: true,
  });
  const [counts] = await q(tx)(
    "SELECT (SELECT count(*)::int FROM auth.users) AS auth_users,(SELECT count(*)::int FROM auth.identities) AS auth_identities",
  );
  assert.equal(
    counts.auth_users,
    0,
    "Provider identity recovery scope needs renewed approval",
  );
  assert.equal(counts.auth_identities, 0);
  const [runtime] = await q(tx)(
    "SELECT rolcanlogin,rolsuper,rolbypassrls,rolcreatedb,rolcreaterole,rolreplication FROM pg_roles WHERE rolname='aibean_app_login'",
  );
  assert.deepEqual(runtime, {
    rolcanlogin: true,
    rolsuper: false,
    rolbypassrls: false,
    rolcreatedb: false,
    rolcreaterole: false,
    rolreplication: false,
  });
  const permissions = await q(tx)(
    `SELECT r.role,has_table_privilege(r.role,'public."TestUsers"','SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER,MAINTAIN') OR has_any_column_privilege(r.role,'public."TestUsers"','SELECT,INSERT,UPDATE,REFERENCES') AS access FROM (VALUES ('anon'),('authenticated')) r(role) ORDER BY 1`,
  );
  assert(
    permissions.every((row) => row.access === false),
    "Approval C table denial drift",
  );
  const runtimeContract = await applicationRoleContract(q(tx));
  const databaseEnvironment = await recoveryDatabaseEnvironment(q(tx));
  return {
    identity,
    counts,
    runtime,
    permissions,
    runtimeContract,
    databaseEnvironment,
  };
}

async function execute(approvedSha: string) {
  inspectRecoveryPackage(approvedSha);
  assert(
    process.env.AIBEAN_BACKUP_OPENSSL,
    "Reviewed OpenSSL path required privately",
  );
  const branch = spawnSync("git", ["branch", "--show-current"], {
    encoding: "utf8",
    windowsHide: true,
  });
  assert.equal(branch.status, 0);
  assert.equal(branch.stdout.trim(), "codex/supabase-foundation");
  for (const [name, key] of [
    ["A", "approvalA"],
    ["B", "approvalB"],
    ["C", "result"],
  ]) {
    const file =
      name === "A"
        ? "docs/evidence/supabase-approval-a-installation-2026-10-09.json"
        : name === "B"
          ? "docs/evidence/supabase-approval-b-runtime-login-2026-10-09.json"
          : "docs/evidence/supabase-approval-c-testusers-security-2026-10-09.json";
    const evidence = JSON.parse(readFileSync(file, "utf8"));
    assert.equal(
      evidence[key] || evidence.result,
      "PASS",
      "Foundation authorization evidence required",
    );
  }
  config({ path: ".env.local", quiet: true });
  assertRuntimeConnection(process.env.DATABASE_URL);
  const envHash = recoverySha(readFileSync(".env.local"));
  assert.equal(lifecycle({ mode: "check" }), "OK");
  const profile = JSON.parse(
    readFileSync(join(root(), "preparation.json"), "utf8").replace(
      /^\uFEFF/,
      "",
    ),
  ) as PrivateProfile;
  assert.equal(resolve(profile.root), root());
  assert.equal(profile.sourceProject, recoveryProject);
  assert.equal(profile.database, "postgres");
  inside(root(), profile.backups);
  assert(!lstatSync(profile.backups).isSymbolicLink());
  assert(
    !readdirSync(profile.backups).some((name) =>
      /^(expanded-application|expanded-receipt|expanded-metadata)-/.test(name),
    ),
    "An expanded recovery point already exists; never repeat it silently",
  );
  const original = originalRecovery(profile);
  assert(
    native(profile, "pg_dump", ["--version"]).toString().includes("17.11"),
  );
  const operatorUrl = bridge("scripts/private-runtime-credential.ps1", {
    mode: "read-operator",
  });
  const connection = verifiedDatabaseConfig(
    operatorUrl,
    process.env.DATABASE_CA_CERT_PATH,
  );
  const parsed = new URL(connection.connectionString);
  assert.equal(parsed.hostname, `db.${recoveryProject}.supabase.co`);
  assert.equal(parsed.pathname, "/postgres");
  assert.equal(parsed.port || "5432", "5432");
  assert.equal(decodeURIComponent(parsed.username), "postgres");
  let sourceHostnameVerified = false;
  const verifier = connection.options.ssl.checkServerIdentity!;
  connection.options.ssl.checkServerIdentity = (host, cert) => {
    const error = verifier(host, cert);
    if (!error) sourceHostnameVerified = true;
    return error;
  };
  source = postgres(connection.connectionString, {
    ...connection.options,
    onnotice: () => {},
    connection: {
      application_name: "aibean-expanded-readonly-export",
      timezone: "UTC",
      default_transaction_read_only: true,
      statement_timeout: 60000,
      lock_timeout: 5000,
    },
  });
  const sourceEnv = pgEnvironment(
    parsed.hostname,
    5432,
    "postgres",
    decodeURIComponent(parsed.password),
    process.env.DATABASE_CA_CERT_PATH!,
    true,
  );
  const publicResult = await executePreparedRecovery({
    approvedSha,
    source,
    sourceEnv,
    sourceHostnameVerified: () => sourceHostnameVerified,
    profile,
    privateRoot: root(),
    openssl: process.env.AIBEAN_BACKUP_OPENSSL!,
    original,
    environmentUnchanged: () =>
      recoverySha(readFileSync(".env.local")) === envHash,
    lifecycle,
    crypto,
    native,
  });
  writeFileSync(
    "docs/evidence/supabase-expanded-application-recovery-result.json",
    JSON.stringify(publicResult, null, 2) + "\n",
  );
  console.log(JSON.stringify(publicResult));
}

// The production CLI and synthetic native harness share this entire operation.
// Transport adapters are supplied only by code, never by CLI/environment flags.
// Production's credential/project/storage envelope above remains mandatory.
export type PreparedRecoveryContext = {
  approvedSha: string;
  source: ReturnType<typeof postgres>;
  sourceEnv: NodeJS.ProcessEnv;
  sourceHostnameVerified: () => boolean;
  profile: PrivateProfile;
  privateRoot: string;
  openssl: string;
  original: ReturnType<typeof originalRecovery>;
  environmentUnchanged: () => boolean;
  lifecycle: typeof lifecycle;
  crypto: typeof crypto;
  native: typeof native;
  onSourceQuery?: (text: string) => void;
};
export const localRecoveryIdentitySql =
  "SELECT current_user AS role,current_database() AS database,host(inet_server_addr()) AS host,current_setting('server_version') AS version,(SELECT ssl FROM pg_stat_ssl WHERE pid=pg_backend_pid()) AS tls";
export function assertLocalRecoveryIdentity(
  identity: RecoveryRow,
  hostnameVerified: boolean,
) {
  assert.deepEqual(identity, {
    role: "recovery_operator",
    database: "postgres",
    host: "127.0.0.1",
    version: "17.11",
    tls: true,
  });
  assert(hostnameVerified, "Local TLS hostname verification required");
}
export async function verifyLocalRecoveryTarget(
  query: RecoveryQuery,
  hostnameVerified: () => boolean,
) {
  const [identity] = await query(localRecoveryIdentitySql);
  assertLocalRecoveryIdentity(identity, hostnameVerified());
}
function resetPreparedState() {
  target = undefined;
  local = undefined;
  attemptedExport = false;
  retainedArchive = false;
}
export async function executePreparedRecovery(
  context: PreparedRecoveryContext,
) {
  inspectRecoveryPackage(context.approvedSha);
  const {
    approvedSha,
    source,
    sourceEnv,
    sourceHostnameVerified,
    profile,
    openssl,
    original,
    environmentUnchanged,
    lifecycle,
    crypto,
    native,
  } = context;
  const root = () => resolve(context.privateRoot);
  const sourceQuery =
    (tx: { unsafe: (text: string) => PromiseLike<unknown> }): RecoveryQuery =>
    async (text) => {
      context.onSourceQuery?.(text);
      return q(tx)(text);
    };
  resetPreparedState();
  try {
    stage = "source-readonly-preflight";
    let capture:
      Awaited<ReturnType<typeof expandedPrivateSnapshot>> | undefined;
    let originalIdentity:
      Awaited<ReturnType<typeof checkSourceIdentity>> | undefined;
    let restoredEnvironment: RecoveryRow | undefined;
    const id = `${new Date().toISOString().replace(/[^0-9]/g, "")}-${randomBytes(5).toString("hex")}`;
    const archiveName = `expanded-application-${id}.cms`,
      metadataName = `expanded-metadata-${id}.cms`,
      receiptName = `expanded-receipt-${id}.json`;
    let archiveHash = "",
      cipherHash = "",
      metadataCipherHash = "",
      archiveEntries = 0;
    await source.begin(
      "ISOLATION LEVEL REPEATABLE READ READ ONLY",
      async (tx) => {
        await tx
          .unsafe(
            "SET LOCAL timezone='UTC'; SET LOCAL search_path=public,pg_catalog",
          )
          .simple();
        originalIdentity = await checkSourceIdentity(tx);
        assert(
          sourceHostnameVerified(),
          "Source TLS hostname verification required",
        );
        capture = await guardedExpandedCapture(sourceQuery(tx), async () => {
          stage = "new-local-target-preparation";
          target = JSON.parse(
            lifecycle({
              mode: "prepare-target",
              approvedPackage: approvedSha,
              openssl: openssl,
            }),
          );
          assert(target);
          inside(root(), target.directory);
          inside(target.directory, target.data);
          inside(target.directory, target.ca);
          assert(!lstatSync(target.ca).isSymbolicLink());
          assert.equal(target.host, "127.0.0.1");
          assert.equal(target.role, "recovery_operator");
          assert.equal(target.database, "postgres");
          assert.equal(target.packageSha256, approvedSha);
          assert.equal(
            lifecycle({ mode: "start-target", target: target.name }),
            "OK",
          );
          const password = lifecycle({
            mode: "target-password",
            target: target.name,
          });
          let localHostnameVerified = false;
          local = postgres({
            host: "127.0.0.1",
            port: target.port,
            database: "postgres",
            username: target.role,
            password,
            max: 1,
            prepare: false,
            connect_timeout: 10,
            ssl: {
              ca: readFileSync(target.ca, "utf8"),
              rejectUnauthorized: true,
              servername: "localhost",
              checkServerIdentity: (_host: string, cert: PeerCertificate) => {
                const error = checkServerIdentity("127.0.0.1", cert);
                if (!error) localHostnameVerified = true;
                return error;
              },
            },
            connection: {
              application_name: "aibean-expanded-isolated-restore",
              timezone: "UTC",
              statement_timeout: 60000,
              lock_timeout: 5000,
            },
            onnotice: () => {},
          });
          await verifyLocalRecoveryTarget(
            q(local),
            () => localHostnameVerified,
          );
          const pristine = await q(local)(
            "SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('public','drizzle','aibean_private','auth') AND c.relkind IN ('r','p','S','v','m','f')",
          );
          assert.equal(pristine.length, 0);
        });
        assert.equal(
          capture.originalTestUsersDigest,
          original.dataDigest,
          "TestUsers private continuity drift",
        );
        assert(local && target);
        const password = lifecycle({
          mode: "target-password",
          target: target.name,
        });
        const [snapshot] = await q(tx)(
          "SELECT pg_export_snapshot() AS snapshot",
        );
        stage = "approved-scoped-export";
        attemptedExport = true;
        let archive = native(
          profile,
          "pg_dump",
          expandedDumpArguments(String(snapshot.snapshot)),
          sourceEnv,
        );
        assert(archive.length > 0 && archive.length <= maxArchiveBytes);
        assert.equal(archive.subarray(0, 5).toString("ascii"), "PGDMP");
        archiveEntries = validateExpandedToc(
          native(
            profile,
            "pg_restore",
            ["--list"],
            childEnvironment(),
            archive,
          ).toString("utf8"),
          native(
            profile,
            "pg_restore",
            ["--schema-only", "--file=-"],
            childEnvironment(),
            archive,
          ).toString("utf8"),
          capture.catalog,
        );
        compareExpandedSnapshots(
          capture,
          await expandedPrivateSnapshot(sourceQuery(tx)),
        );
        archiveHash = recoverySha(archive);
        assert.equal(
          crypto({
            mode: "encrypt",
            name: archiveName,
            base64: archive.toString("base64"),
          }),
          "OK",
        );
        retainedArchive = true;
        const metadata = Buffer.from(
          JSON.stringify({
            version: 1,
            sourceProject: recoveryProject,
            sourceDatabase: "postgres",
            packageSha256: approvedSha,
            archiveSha256: archiveHash,
            capture,
            sourceIdentity: originalIdentity,
            createdAt: new Date().toISOString(),
          }),
        );
        assert(metadata.length <= maxArchiveBytes);
        assert.equal(
          crypto({
            mode: "encrypt",
            name: metadataName,
            base64: metadata.toString("base64"),
          }),
          "OK",
        );
        cipherHash = recoverySha(
          readFileSync(join(profile.backups, archiveName)),
        );
        metadataCipherHash = recoverySha(
          readFileSync(join(profile.backups, metadataName)),
        );
        const decryptedMetadata = Buffer.from(
          crypto({ mode: "decrypt", name: metadataName }),
          "base64",
        );
        assert.equal(recoverySha(decryptedMetadata), recoverySha(metadata));
        decryptedMetadata.fill(0);
        metadata.fill(0);
        archive.fill(0);
        archive = Buffer.from(
          crypto({ mode: "decrypt", name: archiveName }),
          "base64",
        );
        assert.equal(recoverySha(archive), archiveHash);
        stage = "isolated-restore";
        await local
          .unsafe(
            readFileSync(
              "db/recovery/expanded-recovery-local-prerequisites.sql",
              "utf8",
            ),
          )
          .simple();
        restoredEnvironment = await recoveryDatabaseEnvironment(q(local));
        native(
          profile,
          "pg_restore",
          [
            "--no-password",
            "--exit-on-error",
            "--single-transaction",
            "--dbname=postgres",
          ],
          pgEnvironment(
            "127.0.0.1",
            target.port,
            target.role,
            password,
            target.ca,
            false,
          ),
          archive,
        );
        archive.fill(0);
        await local.begin(async (localTx) => {
          for (const statement of localPrerequisiteGrants(capture!.catalog))
            await localTx.unsafe(statement);
        });
        stage = "private-restore-validation";
        await local.begin(
          "ISOLATION LEVEL REPEATABLE READ READ ONLY",
          async (localTx) => {
            await localTx
              .unsafe(
                "SET LOCAL timezone='UTC'; SET LOCAL search_path=public,pg_catalog",
              )
              .simple();
            compareExpandedSnapshots(
              capture!,
              await expandedPrivateSnapshot(q(localTx)),
            );
          },
        );
        const localRoles = await q(local)(
          "SELECT rolname,rolcanlogin,rolsuper,rolcreatedb,rolcreaterole,rolreplication FROM pg_roles WHERE rolname IN ('postgres','supabase_admin','anon','authenticated','dashboard_user','service_role','aibean_runtime','aibean_app_login') ORDER BY 1",
        );
        assert.equal(localRoles.length, 8);
        assert(
          localRoles.every(
            (role) =>
              role.rolcanlogin === false &&
              role.rolsuper === false &&
              role.rolcreatedb === false &&
              role.rolcreaterole === false &&
              role.rolreplication === false,
          ),
        );
        for (const role of ["anon", "authenticated"]) {
          await local.begin("READ ONLY", async (localTx) => {
            await localTx.unsafe(`SET LOCAL ROLE ${role}`);
            const permission = await q(localTx)(
              `SELECT has_table_privilege(current_user,'public."TestUsers"','SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER,MAINTAIN') OR has_any_column_privilege(current_user,'public."TestUsers"','SELECT,INSERT,UPDATE,REFERENCES') AS access`,
            );
            assert.equal(permission[0].access, false);
          });
        }
        const restoredRuntimeContract = await applicationRoleContract(
          q(local),
          true,
        );
        assert.deepEqual(
          restoredRuntimeContract.inherited,
          originalIdentity!.runtimeContract.inherited,
        );
        assert.deepEqual(
          restoredRuntimeContract.restrictions,
          originalIdentity!.runtimeContract.restrictions,
        );
        assert.deepEqual(
          restoredRuntimeContract.roles.map((role) => ({
            ...role,
            rolcanlogin: false,
          })),
          originalIdentity!.runtimeContract.roles.map((role) => ({
            ...role,
            rolcanlogin: false,
          })),
        );
        await local.begin("READ ONLY", async (localTx) => {
          await localTx.unsafe("SET LOCAL ROLE aibean_app_login");
          assert.equal(
            Number(
              (
                await q(localTx)(
                  "SELECT count(*)::int AS count FROM public.users",
                )
              )[0].count,
            ),
            capture!.counts["public.users"],
          );
        });
        assert.equal(
          Number(
            (await q(local)("SELECT count(*)::int AS count FROM auth.users"))[0]
              .count,
          ),
          0,
        );
        compareExpandedSnapshots(
          capture,
          await expandedPrivateSnapshot(sourceQuery(tx)),
        );
      },
    );
    assert(capture && target && local && originalIdentity);
    stage = "fresh-source-continuity";
    await source.begin(
      "ISOLATION LEVEL REPEATABLE READ READ ONLY",
      async (tx) => {
        await tx
          .unsafe(
            "SET LOCAL timezone='UTC'; SET LOCAL search_path=public,pg_catalog",
          )
          .simple();
        assert.deepEqual(await checkSourceIdentity(tx), originalIdentity);
        compareExpandedSnapshots(
          capture!,
          await expandedPrivateSnapshot(sourceQuery(tx)),
        );
      },
    );
    assert(environmentUnchanged(), "Private environment changed");
    for (const preserved of original.preserved)
      assert.equal(
        recoverySha(readFileSync(join(profile.backups, preserved.name))),
        preserved.hash,
      );
    const finalArchive = Buffer.from(
      crypto({ mode: "decrypt", name: archiveName }),
      "base64",
    );
    assert.equal(recoverySha(finalArchive), archiveHash);
    finalArchive.fill(0);
    const receipt = {
      version: 1,
      status: "PASS",
      sourceProject: recoveryProject,
      sourceDatabase: "postgres",
      packageSha256: approvedSha,
      archiveName,
      metadataName,
      archiveSha256: archiveHash,
      ciphertextSha256: cipherHash,
      metadataCiphertextSha256: metadataCipherHash,
      verifiedAt: new Date().toISOString(),
    };
    assert(!existsSync(join(profile.backups, receiptName)));
    writeFileSync(
      join(profile.backups, receiptName),
      JSON.stringify(receipt, null, 2),
      { flag: "wx" },
    );
    writeFileSync(
      join(target.directory, "completed.json"),
      JSON.stringify({
        result: "PASS",
        target: target.name,
        packageSha256: approvedSha,
      }),
      { flag: "wx" },
    );
    await local.end({ timeout: 5 });
    local = undefined;
    stage = "approved-transient-disposal";
    assert.equal(lifecycle({ mode: "stop-target", target: target.name }), "OK");
    assert.equal(
      lifecycle({
        mode: "dispose-passed-target",
        target: target.name,
        approvedPackage: approvedSha,
        validationPassed: true,
      }),
      "OK",
    );
    const publicResult = {
      recoveryGate: "PASS",
      verifiedAt: receipt.verifiedAt,
      project: recoveryProject,
      database: "postgres",
      packageSha256: approvedSha,
      selectedTables: 18,
      selectedSequences: 2,
      archiveEntries,
      archiveSha256: archiveHash,
      encryptedArchiveSha256: cipherHash,
      encryptedMetadataSha256: metadataCipherHash,
      recordCounts: capture.counts,
      testUsersRecords: 2,
      identityMappings: 0,
      rlsApplicationTables: 14,
      foreignKeys: 18,
      drizzleEntries: 2,
      securityLedgerEntries: 1,
      sourceAndRestoredPrivateIntegrityMatch: true,
      ownersAclSchemasDefaultGrantsRlsPoliciesMatch: true,
      sourceUnchanged: true,
      originalArchivePreserved: true,
      envUnchanged: true,
      strictSourceAndLocalTlsHostnameVerified: true,
      localNoLoginRoleSurrogates: true,
      managedAuthExported: false,
      realHostedAuthRecovered: false,
      localAuthStructuralFixtureOnly: true,
      sourceDatabaseEnvironment: originalIdentity.databaseEnvironment,
      localDatabaseEnvironment: restoredEnvironment,
      managedEnvironmentRecreated: false,
      transientLocalRecoveryDisposed: true,
      sourceWrites: false,
      authSettingsChanged: false,
      authAccountsCreated: false,
      mailSent: false,
    };
    return publicResult;
  } finally {
    await Promise.allSettled([local?.end({ timeout: 5 })]);
    local = undefined;
    if (target && existsSync(target.directory))
      assert.equal(
        lifecycle({ mode: "stop-target", target: target.name }),
        "OK",
      );
  }
}

async function main() {
  const args = process.argv.slice(2);
  const approved = args
    .find((arg) => arg.startsWith("--execute-approved="))
    ?.slice("--execute-approved=".length);
  assert(
    args.every(
      (arg) =>
        arg === "--inspect" || /^--execute-approved=[a-f0-9]{64}$/.test(arg),
    ) && args.length <= 1,
    "Unsupported recovery operation; export requires exact approval hash",
  );
  if (!approved) {
    const result = inspectRecoveryPackage();
    console.log(
      JSON.stringify({
        packageStatus: "READY_FOR_REVIEW",
        packageSha256: result.packageSha256,
        targetProject: recoveryProject,
        database: "postgres",
        tables: recoveryTables.length,
        sequences: recoverySequences.length,
        hostedExport: "NOT EXECUTED",
        isolatedRestore: "NOT EXECUTED",
        sourceWrites: false,
      }),
    );
    return;
  }
  await execute(approved);
}
if (process.argv[1]?.endsWith("execute-expanded-recovery.ts"))
  main()
    .catch(() => {
      console.error(
        JSON.stringify({
          recoveryGate: "FAIL",
          stage,
          hostedExportAttempted: attemptedExport,
          encryptedArchiveRetained: retainedArchive,
          sourceWrites: false,
          automaticResetOrRepeat: false,
          transientTargetRetainedOnFailure: Boolean(target),
          details:
            "Private diagnostics redacted; reviewed recovery decision required",
        }),
      );
      process.exitCode = 1;
    })
    .finally(async () => {
      await Promise.allSettled([
        source?.end({ timeout: 5 }),
        local?.end({ timeout: 5 }),
      ]);
      if (target && existsSync(target.directory)) {
        try {
          assert.equal(
            lifecycle({ mode: "stop-target", target: target.name }),
            "OK",
          );
        } catch {
          console.error(
            "Owned recovery shutdown needs private operator review.",
          );
        }
      }
    });
