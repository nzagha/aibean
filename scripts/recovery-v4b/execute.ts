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
import { inspectRecoveryPackage as inspectHistoricalRecovery } from "../execute-expanded-recovery";
import { reviewRelations } from "../admin-review-v1/core";
import { operationsRelations } from "../admin-operations-v2/core";
import {
  inspectMechanism as inspectOperations,
  mechanismFiles as operationsFiles,
} from "../admin-operations-v2/operator";
import {
  inspectRecoveryPackage as inspectV4a,
  requiredRecoveryFiles as v4aFiles,
} from "../recovery-v4a/execute";
import {
  inspectPriorCheckpoint,
  verifyPriorContinuity,
  type PriorCapture,
} from "./predecessor";
import {
  protectedRecovery,
  inspectMechanism as inspectReview,
  mechanismFiles as reviewFiles,
} from "../admin-review-v1/operator";
import {
  expandedMetadataPreflight as foundationPreflight,
  recoveryTables as foundationTables,
  qualifiedRelation as foundationRelation,
} from "../expanded-recovery-scope";
import {
  assertNativeResult,
  recoveryOperation,
  safeRecoveryDiagnostic,
  type ExportOperation,
} from "./diagnostics";
import { verifiedDatabaseConfig } from "../../src/lib/db/tls-config";
import { assertRuntimeConnection } from "../../src/lib/db/runtime-config";
import {
  recoveryProject,
  recoveryTables,
  recoverySequences,
  recoveryRelations,
  recoverySha,
  expandedDumpArguments,
  expandedPrivateSnapshot,
  expandedMetadataPreflight,
  guardedExpandedCapture,
  compareExpandedSnapshots,
  validateExpandedToc,
  localPrerequisiteGrants,
  maxArchiveBytes,
  applicationRoleContract,
  recoveryDatabaseEnvironment,
  type RecoveryQuery,
  type RecoveryRow,
} from "./scope";

export const recoveryManifestPath = "db/recovery/application-recovery-v4b.json";
export const requiredRecoveryFiles = [
  ...new Set([
    ...reviewFiles,
    ...operationsFiles,
    ...v4aFiles,
    "db/proposals/admin-operations-v2-readiness/mechanism.json",
    "db/recovery/application-recovery-v4a.json",
    "docs/evidence/admin-operations-v2-hosted-execute-result.json",
    "docs/evidence/admin-operations-v2-hosted-verify-result.json",
    "docs/evidence/application-recovery-v4a-hosted-result.json",
    ...JSON.parse(
      readFileSync("db/recovery/expanded-recovery-package-v3.json", "utf8"),
    ).files.map((f: { path: string }) => f.path),
    "docs/evidence/supabase-approval-a-installation-2026-10-09.json",
    "docs/evidence/supabase-approval-b-runtime-login-2026-10-09.json",
    "docs/evidence/supabase-approval-c-testusers-security-2026-10-09.json",
    "db/proposals/admin-review-v1-readiness/mechanism.json",
    "db/recovery/expanded-recovery-package-v3.json",
    "db/recovery/application-coverage-v4-design.json",
    "db/recovery/application-v4b-local-prerequisites.sql",
    "scripts/recovery-v4b/.gitattributes",
    ...[
      "execute.ts",
      "scope.ts",
      "diagnostics.ts",
      "private-crypto.ps1",
      "private-lifecycle.ps1",
      "native-test.ts",
      "prepare.ts",
      "predecessor.ts",
      "private-predecessor.ps1",
    ].map((n) => `scripts/recovery-v4b/${n}`),
    "scripts/prepare-synthetic-recovery-test.ps1",
    "scripts/recovery-v4b/unit.test.ts",
    "docs/evidence/admin-review-v1-hosted-execute-result.json",
    "docs/evidence/admin-review-v1-hosted-verify-result.json",
  ]),
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
  historicalBackups: string;
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
  inspectOperations(
    "31ee1f91bc5be3dd6ef9c11abcbbe5809502beee1dbbee45609193e0659507e2",
  );
  inspectV4a(
    "cafbf6932c2395cf1d9c5b889cac86ab67cef6b333e3fd8d12cb8c351bdaaa91",
  );
  inspectReview(
    "96f727fde749cc8ab56a647b7f9ed3dc750fb73bc4864c603f3502fbef94030b",
  );
  inspectHistoricalRecovery(
    "00943149054982c8b52f2ce6d38bae32c557960c37365ab447284010de8e7469",
  );
  const bytes = readFileSync(recoveryManifestPath);
  const manifest = JSON.parse(bytes.toString("utf8")) as Manifest;
  const packageSha256 = recoverySha(bytes);
  if (approvedSha)
    assert.equal(
      packageSha256,
      approvedSha,
      "Reviewed recovery package hash differs",
    );
  assert.equal(manifest.packageId, "aibean-application-recovery-v4b");
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
export const childEnvironment = () => {
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
  bridge("scripts/recovery-v4b/private-crypto.ps1", request);
const lifecycle = (request: object) =>
  bridge("scripts/recovery-v4b/private-lifecycle.ps1", request);
export const native = (
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
  assertNativeResult(result);
  return result.stdout;
};
const q =
  (tx: { unsafe: (text: string) => PromiseLike<unknown> }): RecoveryQuery =>
  async (text: string) =>
    JSON.parse(JSON.stringify(await tx.unsafe(text)));
export const pgEnvironment = (
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
    ? "aibean-v4b-readonly-export"
    : "aibean-v4b-isolated-restore",
  PGCLIENTENCODING: "UTF8",
  PGOPTIONS: `-c statement_timeout=60000 -c lock_timeout=5000${readOnly ? " -c default_transaction_read_only=on" : ""}`,
});

function originalRecovery(profile: PrivateProfile) {
  const reference = protectedRecovery();
  const names = readdirSync(profile.historicalBackups).filter((n) =>
    /^(public-receipt|expanded-receipt)-[a-z0-9-]+\.json$/.test(n),
  );
  assert.equal(names.length, 2);
  const preserved = names.flatMap((name) => {
    const receipt = JSON.parse(
      readFileSync(join(profile.historicalBackups, name), "utf8"),
    );
    assert.equal(receipt.status, "PASS");
    return [name, receipt.archiveName, receipt.metadataName].map((name) => ({
      name,
      hash: recoverySha(readFileSync(join(profile.historicalBackups, name))),
    }));
  });
  return {
    dataDigest: reference.originalTestUsersDigest,
    preserved,
    foundationReference: reference,
  };
}
async function checkFoundationContinuity(
  q: RecoveryQuery,
  reference: ReturnType<typeof protectedRecovery>,
) {
  const additions = [...reviewRelations, ...operationsRelations];
  const names = additions.map((n) => n.split(".")[1]);
  const filtered: RecoveryQuery = async (s) =>
    (await q(s)).filter(
      (r) =>
        !names.includes(
          String(
            r.relation ?? r.object ?? (r.kind === "r" ? r.name : undefined),
          ),
        ) && !additions.includes(String(r.schema) + "." + String(r.name)),
    );
  const now = await foundationPreflight(filtered);
  for (const key of [
    "catalog",
    "counts",
    "sequenceState",
    "ledgers",
    "security",
  ] as const)
    assert.deepEqual(now[key], reference[key]);
  for (const table of foundationTables) {
    const [r] = await q(
      `SELECT encode(sha256(convert_to(coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text COLLATE "C"),''),'UTF8')),'hex') AS digest FROM ${foundationRelation(table)} t`,
    );
    assert.equal(r.digest, reference.content[table]);
  }
}
async function checkSourceIdentity(tx: {
  unsafe: (text: string) => PromiseLike<unknown>;
}) {
  const [identity] = await q(tx)(
    "SELECT current_database() AS database,current_user AS role,session_user AS session_role,current_setting('transaction_read_only') AS read_only,(SELECT ssl FROM pg_stat_ssl WHERE pid=pg_backend_pid()) AS tls",
  );
  assert.deepEqual(identity, {
    database: "postgres",
    role: "postgres",
    session_role: "postgres",
    read_only: "on",
    tls: true,
  });
  const [version] = await q(tx)(
    "SELECT current_setting('server_version_num')::int AS version",
  );
  assert(Number(version.version) >= 170000 && Number(version.version) < 180000);
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
  stage = "private-preflight";
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
  assert(
    !existsSync("docs/evidence/application-recovery-v4b-hosted-result.json"),
    "Prior execution evidence; stop without retry",
  );
  config({ path: ".env.local", quiet: true });
  assertRuntimeConnection(process.env.DATABASE_URL);
  const envHash = recoverySha(readFileSync(".env.local"));
  const namespace = JSON.parse(
    lifecycle({ mode: "prepare-namespace", approvedPackage: approvedSha }),
  );
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
  profile.historicalBackups = profile.backups;
  profile.backups = namespace.backups;
  assert.equal(namespace.packageSha256, approvedSha);
  inside(root(), profile.backups);
  assert(!lstatSync(profile.backups).isSymbolicLink());
  assert(
    !readdirSync(profile.backups).some((name) => /^v4b-/.test(name)),
    "An expanded recovery point already exists; never repeat it silently",
  );
  const original = originalRecovery(profile);
  const prior = inspectPriorCheckpoint(
    root(),
    bridge,
    (bytes) =>
      native(
        profile,
        "pg_restore",
        ["--list"],
        childEnvironment(),
        bytes,
      ).toString("utf8"),
    JSON.parse(
      readFileSync(
        "docs/evidence/application-recovery-v4a-hosted-result.json",
        "utf8",
      ),
    ),
  );
  assert.equal(crypto({ mode: "check" }), "OK");
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
      application_name: "aibean-v4b-readonly-export",
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
    priorCapture: prior.capture,
    historicalPreserved: prior.preserved,
    environmentUnchanged: () =>
      recoverySha(readFileSync(".env.local")) === envHash,
    lifecycle,
    crypto,
    native,
  });
  writeFileSync(
    "docs/evidence/application-recovery-v4b-hosted-result.json",
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
  priorCapture: PriorCapture;
  historicalPreserved: () => void;
  // Native harness only: verified loopback fixtures with bounded ordinary User/Operations records.
  // The hosted CLI never supplies this field; it cannot be enabled by flags/environment.
  syntheticReference?: Awaited<ReturnType<typeof expandedPrivateSnapshot>>;
  onSourceQuery?: (text: string) => void;
  onExportOperation?: (
    operation: ExportOperation,
    state: "start" | "pass",
  ) => void;
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
  context.historicalPreserved();
  assert.equal(context.crypto({ mode: "check" }), "OK");
  const syntheticRecords = Boolean(context.syntheticReference);
  const captureSnapshot = (query: RecoveryQuery) =>
    expandedPrivateSnapshot(query, syntheticRecords);
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
  const privateBuffers: Buffer[] = [];
  const completedExportOperations: ExportOperation[] = [];
  let succeeded = false;
  const exportStep = <T>(
    operation: ExportOperation,
    work: () => T | Promise<T>,
  ) => {
    stage = `approved-scoped-export:${operation}`;
    return recoveryOperation(operation, work, (id, state) => {
      context.onExportOperation?.(id, state);
      if (state === "pass") completedExportOperations.push(id);
    });
  };
  try {
    stage = "source-readonly-preflight";
    let capture:
      Awaited<ReturnType<typeof expandedPrivateSnapshot>> | undefined;
    let originalIdentity:
      Awaited<ReturnType<typeof checkSourceIdentity>> | undefined;
    let restoredEnvironment: RecoveryRow | undefined;
    const id = `${new Date().toISOString().replace(/[^0-9]/g, "")}-${randomBytes(5).toString("hex")}`;
    const archiveName = `v4b-application-${id}.cms`,
      metadataName = `v4b-metadata-${id}.cms`,
      receiptName = `v4b-receipt-${id}.json`;
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
        if (context.syntheticReference) {
          const metadata = await expandedMetadataPreflight(
            sourceQuery(tx),
            true,
          );
          for (const key of [
            "catalog",
            "counts",
            "sequenceState",
            "ledgers",
            "security",
            "reviewHistory",
            "operationsHistory",
          ] as const)
            assert.deepEqual(
              metadata[key],
              context.syntheticReference[key],
              "Synthetic metadata continuity drift",
            );
        } else {
          await expandedMetadataPreflight(sourceQuery(tx));
          await checkFoundationContinuity(
            sourceQuery(tx),
            original.foundationReference,
          );
          await verifyPriorContinuity(sourceQuery(tx), context.priorCapture);
        }
        capture = await guardedExpandedCapture(
          sourceQuery(tx),
          async () => {
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
                application_name: "aibean-v4b-isolated-restore",
                timezone: "UTC",
                statement_timeout: 60000,
                lock_timeout: 5000,
              },
              onnotice: () => {},
            });
            await verifyLocalRecoveryTarget(
              q(local!),
              () => localHostnameVerified,
            );
            const pristine = await q(local!)(
              "SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('public','drizzle','aibean_private','auth') AND c.relkind IN ('r','p','S','v','m','f')",
            );
            assert.equal(pristine.length, 0);
          },
          syntheticRecords,
        );
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
        const [snapshot] = await exportStep("snapshot-export", () =>
          q(tx)("SELECT pg_export_snapshot() AS snapshot"),
        );
        let archive = await exportStep("native-dump", () => {
          attemptedExport = true;
          return native(
            profile,
            "pg_dump",
            expandedDumpArguments(String(snapshot.snapshot)),
            sourceEnv,
          );
        });
        privateBuffers.push(archive);
        await exportStep("archive-bounds", () =>
          assert(archive.length > 0 && archive.length <= maxArchiveBytes),
        );
        await exportStep("archive-header", () =>
          assert.equal(archive.subarray(0, 5).toString("ascii"), "PGDMP"),
        );
        const toc = await exportStep("archive-toc", () =>
          native(
            profile,
            "pg_restore",
            ["--list"],
            childEnvironment(),
            archive,
          ).toString("utf8"),
        );
        const ddl = await exportStep("archive-schema", () =>
          native(
            profile,
            "pg_restore",
            ["--schema-only", "--file=-"],
            childEnvironment(),
            archive,
          ).toString("utf8"),
        );
        archiveEntries = await exportStep("archive-allowlist", () =>
          validateExpandedToc(toc, ddl, capture!.catalog),
        );
        await exportStep("snapshot-integrity", async () =>
          compareExpandedSnapshots(
            capture!,
            await captureSnapshot(sourceQuery(tx)),
          ),
        );
        archiveHash = recoverySha(archive);
        await exportStep("archive-encrypt", () =>
          assert.equal(
            crypto({
              mode: "encrypt",
              name: archiveName,
              base64: archive.toString("base64"),
            }),
            "OK",
          ),
        );
        retainedArchive = true;
        const metadata = Buffer.from(
          JSON.stringify({
            version: 5,
            sourceProject: recoveryProject,
            sourceDatabase: "postgres",
            packageSha256: approvedSha,
            archiveSha256: archiveHash,
            capture,
            sourceIdentity: originalIdentity,
            createdAt: new Date().toISOString(),
          }),
        );
        privateBuffers.push(metadata);
        await exportStep("metadata-bounds", () =>
          assert(metadata.length <= maxArchiveBytes),
        );
        await exportStep("metadata-encrypt", () =>
          assert.equal(
            crypto({
              mode: "encrypt",
              name: metadataName,
              base64: metadata.toString("base64"),
            }),
            "OK",
          ),
        );
        await exportStep("ciphertext-hashes", () => {
          cipherHash = recoverySha(
            readFileSync(join(profile.backups, archiveName)),
          );
          metadataCipherHash = recoverySha(
            readFileSync(join(profile.backups, metadataName)),
          );
        });
        await exportStep("metadata-decrypt", () => {
          const decryptedMetadata = Buffer.from(
            crypto({ mode: "decrypt", name: metadataName }),
            "base64",
          );
          privateBuffers.push(decryptedMetadata);
          assert.equal(recoverySha(decryptedMetadata), recoverySha(metadata));
          decryptedMetadata.fill(0);
        });
        metadata.fill(0);
        archive.fill(0);
        archive = await exportStep("archive-decrypt", () =>
          Buffer.from(crypto({ mode: "decrypt", name: archiveName }), "base64"),
        );
        privateBuffers.push(archive);
        await exportStep("archive-integrity", () =>
          assert.equal(recoverySha(archive), archiveHash),
        );
        stage = "isolated-restore";
        await exportStep("local-prerequisites", async () => {
          await local!
            .unsafe(
              readFileSync(
                "db/recovery/application-v4b-local-prerequisites.sql",
                "utf8",
              ),
            )
            .simple();
        });
        restoredEnvironment = await recoveryDatabaseEnvironment(q(local!));
        await exportStep("native-restore", () =>
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
              target!.port,
              target!.role,
              password,
              target!.ca,
              false,
            ),
            archive,
          ),
        );
        archive.fill(0);
        await exportStep("permissions-replay", () =>
          local!.begin(async (localTx) => {
            for (const statement of localPrerequisiteGrants(capture!.catalog))
              await localTx.unsafe(statement);
          }),
        );
        stage = "private-restore-validation";
        await exportStep("restore-integrity", () =>
          local!.begin(
            "ISOLATION LEVEL REPEATABLE READ READ ONLY",
            async (localTx) => {
              await localTx
                .unsafe(
                  "SET LOCAL timezone='UTC'; SET LOCAL search_path=public,pg_catalog",
                )
                .simple();
              compareExpandedSnapshots(
                capture!,
                await captureSnapshot(q(localTx)),
              );
            },
          ),
        );
        await exportStep("restored-role-contract", async () => {
          const localRoles = await q(local!)(
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
            await local!.begin("READ ONLY", async (localTx) => {
              await localTx.unsafe(`SET LOCAL ROLE ${role}`);
              const permission = await q(localTx)(
                `SELECT has_table_privilege(current_user,'public."TestUsers"','SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER,MAINTAIN') OR has_any_column_privilege(current_user,'public."TestUsers"','SELECT,INSERT,UPDATE,REFERENCES') AS access`,
              );
              assert.equal(permission[0].access, false);
            });
          }
          const restoredRuntimeContract = await applicationRoleContract(
            q(local!),
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
          await local!.begin("READ ONLY", async (localTx) => {
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
              (
                await q(local!)("SELECT count(*)::int AS count FROM auth.users")
              )[0].count,
            ),
            0,
          );
        });
        compareExpandedSnapshots(
          capture,
          await captureSnapshot(sourceQuery(tx)),
        );
      },
    );
    assert(capture && target && local && originalIdentity);
    stage = "fresh-source-continuity";
    await exportStep("fresh-source-continuity", () =>
      source.begin("ISOLATION LEVEL REPEATABLE READ READ ONLY", async (tx) => {
        await tx
          .unsafe(
            "SET LOCAL timezone='UTC'; SET LOCAL search_path=public,pg_catalog",
          )
          .simple();
        assert.deepEqual(await checkSourceIdentity(tx), originalIdentity);
        compareExpandedSnapshots(
          capture!,
          await captureSnapshot(sourceQuery(tx)),
        );
      }),
    );
    await exportStep("retention-integrity", () => {
      context.historicalPreserved();
      assert(environmentUnchanged(), "Private environment changed");
      for (const preserved of original.preserved)
        assert.equal(
          recoverySha(
            readFileSync(join(profile.historicalBackups, preserved.name)),
          ),
          preserved.hash,
        );
      const finalArchive = Buffer.from(
        crypto({ mode: "decrypt", name: archiveName }),
        "base64",
      );
      assert.equal(recoverySha(finalArchive), archiveHash);
      finalArchive.fill(0);
    });
    await exportStep("local-shutdown", async () => {
      await local!.end({ timeout: 5 });
      local = undefined;
      assert.equal(
        lifecycle({ mode: "stop-target", target: target!.name }),
        "OK",
      );
    });
    const receipt = {
      version: 5,
      namespace: "v4b",
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
      targetStoppedRetained: true,
    };
    stage = "approved-scoped-export:receipt-persist";
    await persistRecoveryReceipt(
      join(profile.backups, receiptName),
      receipt,
      context.onExportOperation,
    );
    completedExportOperations.push("receipt-persist");
    succeeded = true;
    const publicResult = {
      recoveryGate: "PASS",
      verifiedAt: receipt.verifiedAt,
      project: recoveryProject,
      database: "postgres",
      packageSha256: approvedSha,
      selectedTables: 29,
      selectedSequences: 2,
      completedExportOperations,
      archiveEntries,
      archiveSha256: archiveHash,
      encryptedArchiveSha256: cipherHash,
      encryptedMetadataSha256: metadataCipherHash,
      recordCounts: capture.counts,
      testUsersRecords: 2,
      identityMappings: 0,
      rlsApplicationTables: 23,
      foreignKeys: 42,
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
      transientLocalRecoveryDisposed: false,
      verifiedLocalTargetStoppedAndRetained: true,
      priorV3ArchivePreserved: true,
      priorV4aArchiveAndRetainedTargetsPreserved: true,
      operationsLedgerEntries: 1,
      reviewLedgerEntries: 1,
      sourceWrites: false,
      authSettingsChanged: false,
      authAccountsCreated: false,
      mailSent: false,
    };
    return publicResult;
  } finally {
    for (const buffer of privateBuffers) buffer.fill(0);
    await Promise.allSettled([local?.end({ timeout: 5 })]);
    local = undefined;
    if (!succeeded && target && existsSync(target.directory))
      assert.equal(
        lifecycle({ mode: "stop-target", target: target.name }),
        "OK",
      );
    if (!succeeded) context.historicalPreserved();
  }
}

// All fallible observers run before the create-new PASS write. No shutdown or
// preservation assertion can fail after publishing a successful receipt.
export async function persistRecoveryReceipt(
  file: string,
  receipt: object,
  observe?: PreparedRecoveryContext["onExportOperation"],
) {
  await recoveryOperation("receipt-persist", () => {
    assert(!existsSync(file));
    observe?.("receipt-persist", "start");
    const bytes = JSON.stringify(receipt, null, 2);
    observe?.("receipt-persist", "pass");
    writeFileSync(file, bytes, { flag: "wx" });
  });
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
if (process.argv[1]?.replaceAll("\\", "/").endsWith("/recovery-v4b/execute.ts"))
  main()
    .catch((error: unknown) => {
      console.error(
        JSON.stringify({
          recoveryGate: "FAIL",
          stage,
          hostedExportAttempted: attemptedExport,
          encryptedArchiveRetained: retainedArchive,
          sourceWrites: false,
          automaticResetOrRepeat: false,
          transientTargetRetainedOnFailure: Boolean(target),
          diagnostic: safeRecoveryDiagnostic(error),
          details:
            "Private diagnostics redacted; reviewed recovery decision required",
        }),
      );
      const failure = {
        recoveryGate: "FAIL",
        stage,
        package: "application-recovery-v4b",
        diagnostic: safeRecoveryDiagnostic(error),
        hostedExportAttempted: attemptedExport,
        encryptedArchiveRetained: retainedArchive,
        sourceWrites: false,
        automaticResetOrRepeat: false,
        transientTargetRetainedOnFailure: Boolean(target),
      };
      const file = "docs/evidence/application-recovery-v4b-hosted-result.json";
      if (stage !== "offline-package-inspection" && !existsSync(file))
        writeFileSync(file, JSON.stringify(failure, null, 2) + "\n", {
          flag: "wx",
        });
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
