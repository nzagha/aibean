// Explicitly authorized operator task only. Not called by the app or CI.
// No hosted writes, migration SQL, managed-schema export or provider activation.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import {
  readFileSync,
  writeFileSync,
  existsSync,
  readdirSync,
  rmSync,
  lstatSync,
} from "node:fs";
import { resolve, join, relative, dirname, isAbsolute } from "node:path";
import { checkServerIdentity, type PeerCertificate } from "node:tls";
import { config } from "dotenv";
import postgres from "postgres";
import { publicCatalogInventory } from "./inspect-public-backup-scope";
import { verifiedDatabaseConfig } from "../src/lib/db/tls-config";

type Client = ReturnType<typeof postgres>;
type Query = (text: string) => Promise<Record<string, unknown>[]>;
type Profile = {
  version: number;
  root: string;
  backups: string;
  recovery: string;
  data: string;
  postgresBin: string;
  port: number;
  ca: string;
  role: string;
  database: string;
  sourceProject: string;
  recoveryDisposedAt?: string;
};
const root = resolve(process.env.AIBEAN_BACKUP_ROOT || "");
const powershell = process.env.AIBEAN_BACKUP_POWERSHELL;
// A retry reuses the original encrypted archive; it never re-exports records.
const resumeName = process.argv
  .find((arg) => arg.startsWith("--resume-receipt="))
  ?.split("=")[1];
const MAX_BYTES = 16 * 1024 * 1024;
const sha = (value: string | Buffer) =>
  createHash("sha256").update(value).digest("hex");
let stage = "configuration";
let running = false;
let passed = false;
const clients: Client[] = [];
let profile: Profile;
const outcomes: string[] = [];
const childBase: NodeJS.ProcessEnv = { NODE_ENV: "production" };
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
]) {
  if (process.env[key]) childBase[key] = process.env[key];
}
const expectedHashes = {
  "db/install/reviewed-installation.sql":
    "72818e1233ab51ebbac861a822d89ee0d52d4c12ee32a193746c631bdf639b0c",
  "db/install/runtime-login-proposal.sql":
    "3c76ee6f5f203cbc3a140308a1360edb326ed5319fc3de9c3400c35b94e8b940",
  "db/install/testusers-security-proposal.sql":
    "0c53e6cb250512624d4a73135e8ea122eb8573b8be494b9dbe55ac9bb29985db",
  "db/migrations/0000_numerous_skullbuster.sql":
    "b58134b31944656eda45a6ba929fcdb66a5ec4e66e01a8cfd3d8d9b16d4f4468",
  "db/migrations/0001_hesitant_hardball.sql":
    "168fd0b654a75e1174052fc444893a66362f89bb3d1cdaec3bbfe9fcbf4f4df1",
};

function inside(parent: string, path: string) {
  const part = relative(resolve(parent), resolve(path));
  assert(part && !part.startsWith("..") && !isAbsolute(part));
}
function paths() {
  assert(
    process.platform === "win32" &&
      process.env.AIBEAN_BACKUP_ROOT &&
      powershell,
  );
  profile = JSON.parse(
    readFileSync(join(root, "preparation.json"), "utf8").replace(/^\uFEFF/, ""),
  );
  assert.equal(resolve(profile.root), root);
  assert.equal(profile.version, 1);
  assert.equal(profile.sourceProject, "yfknxidgphhepdtwazhn");
  assert.equal(profile.database, "postgres");
  assert.equal(profile.role, "recovery_operator");
  assert(profile.port > 1024 && profile.port < 65536);
  assert(!profile.recoveryDisposedAt, "Never reuse a disposed target");
  for (const path of [profile.backups, profile.recovery, profile.data])
    inside(root, path);
  assert.equal(dirname(resolve(profile.data)), resolve(profile.recovery));
  assert(/^Recovery-[a-f0-9]{32}$/.test(relative(root, profile.recovery)));
  for (const path of [root, profile.backups, profile.recovery, profile.data])
    assert(!lstatSync(path).isSymbolicLink());
  for (const [file, expected] of Object.entries(expectedHashes))
    assert.equal(sha(readFileSync(file)), expected);
}
function native(
  name: string,
  args: string[],
  env: NodeJS.ProcessEnv = childBase,
  input?: Buffer,
) {
  const result = spawnSync(join(profile.postgresBin, `${name}.exe`), args, {
    windowsHide: true,
    env,
    timeout: 60000,
    maxBuffer: MAX_BYTES,
    input,
    stdio: name === "pg_ctl" ? "ignore" : "pipe",
  });
  // Do not forward raw pg_dump/restore stderr: COPY errors may contain values.
  if (result.status !== 0) {
    const message = result.stderr?.toString("utf8") || "";
    const reason = /transaction is read-only/.test(message)
      ? "READONLY"
      : /permission denied/.test(message)
        ? "PERMISSION"
        : /snapshot/.test(message)
          ? "SNAPSHOT"
          : /SSL|certificate/.test(message)
            ? "TLS"
            : /invalid option|unrecognized option/.test(message)
              ? "OPTION"
              : /unsupported version/.test(message)
                ? "VERSION"
                : "REDACTED";
    throw Object.assign(new Error("Native operation failed"), {
      code: `NATIVE_${name.toUpperCase()}_${reason}`,
    });
  }
  assert(!result.error);
  if (name === "pg_dump")
    assert.equal(
      result.stderr?.length || 0,
      0,
      "Dump warning requires private review",
    );
  return result.stdout || Buffer.alloc(0);
}
function bridge(request: Record<string, unknown>) {
  const result = spawnSync(
    powershell!,
    [
      "-NoLogo",
      "-NoProfile",
      "-NonInteractive",
      "-File",
      resolve("scripts/private-backup-crypto.ps1"),
      "-Root",
      root,
    ],
    {
      input: JSON.stringify(request),
      encoding: "utf8",
      windowsHide: true,
      timeout: 30000,
      maxBuffer: MAX_BYTES,
      env: childBase,
    },
  );
  assert.equal(
    result.status,
    0,
    "Windows crypto operation failed; diagnostics redacted",
  );
  assert(!result.error);
  return result.stdout;
}
function encrypt(name: string, value: Buffer) {
  assert(value.length < MAX_BYTES / 2);
  assert.equal(
    bridge({ mode: "encrypt", name, base64: value.toString("base64") }),
    "OK",
  );
  const decoded = Buffer.from(bridge({ mode: "decrypt", name }), "base64");
  assert.equal(sha(decoded), sha(value));
  decoded.fill(0);
}
function pgEnvironment(
  host: string,
  port: number,
  user: string,
  password: string,
  ca: string,
  readOnly: boolean,
) {
  return {
    ...childBase,
    PGHOST: host,
    PGPORT: String(port),
    PGUSER: user,
    PGPASSWORD: password,
    PGDATABASE: "postgres",
    PGSSLMODE: "verify-full",
    PGSSLROOTCERT: ca,
    PGCONNECT_TIMEOUT: "10",
    PGCLIENTENCODING: "UTF8",
    PGAPPNAME: "aibean-approved-scoped-recovery",
    PGOPTIONS: readOnly ? "-c default_transaction_read_only=on" : "",
  };
}
function query(db: { unsafe: (text: string) => PromiseLike<unknown> }): Query {
  return async (text) => JSON.parse(JSON.stringify(await db.unsafe(text)));
}
function good(name: string) {
  outcomes.push(name);
  console.log(`PASS ${name}`);
}
function assertScope(
  catalog: Awaited<ReturnType<typeof publicCatalogInventory>>,
) {
  assert.deepEqual(
    catalog.tables.map((row) => [row.relname, row.relkind]),
    [
      ["TestUsers", "r"],
      ["TestUsers_id_seq", "S"],
    ],
  );
  assert.deepEqual(
    catalog.columns.map((row) => row.column_name),
    ["id", "created_at", "email", "age", "name"],
  );
  assert.equal(catalog.publicFunctionCount[0].count, 0);
  assert(
    Object.values(catalog.additionalPublicObjects[0]).every(
      (count) => count === 0,
    ),
  );
  assert.equal(catalog.testUsersCount[0].count, 2);
  assert.equal(catalog.constraints.length, 2);
  assert.equal(catalog.indexes.length, 2);
  assert.equal(catalog.policies.length, 2);
  assert.equal(catalog.tables[0].relrowsecurity, true);
}
const metadataKeys = [
  "tables",
  "columns",
  "constraints",
  "indexes",
  "policies",
] as const;
export async function snapshot(q: Query) {
  const catalog = await publicCatalogInventory(q);
  assertScope(catalog);
  const acl = await q(`SELECT 'schema' AS kind,n.nspname AS object,'' AS column,
    CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END AS grantee,
    pg_get_userbyid(a.grantor) AS grantor,a.privilege_type,a.is_grantable
    FROM pg_namespace n CROSS JOIN LATERAL aclexplode(coalesce(n.nspacl,acldefault('n',n.nspowner))) a WHERE n.nspname='public'
    UNION ALL SELECT CASE WHEN c.relkind='S' THEN 'sequence' ELSE 'table' END,c.relname,'',CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,pg_get_userbyid(a.grantor),a.privilege_type,a.is_grantable
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace CROSS JOIN LATERAL aclexplode(coalesce(c.relacl,acldefault(CASE WHEN c.relkind='S' THEN 'S'::"char" ELSE 'r'::"char" END,c.relowner))) a WHERE n.nspname='public' AND c.relkind IN ('r','S')
    UNION ALL SELECT 'column',c.relname,t.attname,CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,pg_get_userbyid(a.grantor),a.privilege_type,a.is_grantable
    FROM pg_attribute t JOIN pg_class c ON c.oid=t.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace CROSS JOIN LATERAL aclexplode(t.attacl) a WHERE n.nspname='public' AND t.attnum>0 AND NOT t.attisdropped
    UNION ALL SELECT 'default-'||d.defaclobjtype::text,pg_get_userbyid(d.defaclrole),'',CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,pg_get_userbyid(a.grantor),a.privilege_type,a.is_grantable
    FROM pg_default_acl d JOIN pg_namespace n ON n.oid=d.defaclnamespace CROSS JOIN LATERAL aclexplode(d.defaclacl) a WHERE n.nspname='public'
    ORDER BY 1,2,3,4,5,6,7`);
  const details =
    await q(`SELECT c.relname,c.relforcerowsecurity,a.attname,format_type(a.atttypid,a.atttypmod) AS type,a.attnotnull,a.attidentity,a.attgenerated,pg_get_expr(d.adbin,d.adrelid) AS expression,co.collname AS collation
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_attribute a ON a.attrelid=c.oid LEFT JOIN pg_attrdef d ON d.adrelid=c.oid AND d.adnum=a.attnum LEFT JOIN pg_collation co ON co.oid=a.attcollation WHERE n.nspname='public' AND c.relname='TestUsers' AND a.attnum>0 AND NOT a.attisdropped ORDER BY a.attnum`);
  const sequence = await q(
    `SELECT format_type(s.seqtypid,NULL) AS type,s.seqstart::text,s.seqincrement::text,s.seqmax::text,s.seqmin::text,s.seqcache::text,s.seqcycle FROM pg_sequence s JOIN pg_class c ON c.oid=s.seqrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' ORDER BY c.relname`,
  );
  const sequenceState = await q(
    'SELECT last_value::text,is_called FROM public."TestUsers_id_seq"',
  );
  const permission =
    await q(`SELECT r.role,has_schema_privilege(r.role,'public','USAGE') AS schema_usage,has_schema_privilege(r.role,'public','CREATE') AS schema_create,
    has_table_privilege(r.role,'public."TestUsers"','SELECT') AS table_select,has_table_privilege(r.role,'public."TestUsers"','INSERT') AS table_insert,has_table_privilege(r.role,'public."TestUsers"','UPDATE') AS table_update,has_table_privilege(r.role,'public."TestUsers"','DELETE') AS table_delete,has_table_privilege(r.role,'public."TestUsers"','TRUNCATE') AS table_truncate,has_table_privilege(r.role,'public."TestUsers"','REFERENCES') AS table_references,has_table_privilege(r.role,'public."TestUsers"','TRIGGER') AS table_trigger,
    has_sequence_privilege(r.role,'public."TestUsers_id_seq"','SELECT') AS sequence_select,has_sequence_privilege(r.role,'public."TestUsers_id_seq"','UPDATE') AS sequence_update,has_sequence_privilege(r.role,'public."TestUsers_id_seq"','USAGE') AS sequence_usage
    FROM (VALUES ('anon'),('authenticated'),('service_role'),('dashboard_user'),('postgres')) r(role) ORDER BY r.role`);
  // Authorized records remain solely in memory; only the digest goes into encrypted private metadata.
  const rows = await q(
    'SELECT row_to_json(t)::text AS row FROM public."TestUsers" t ORDER BY id',
  );
  const dataDigest = sha(rows.map((row) => String(row.row)).join("\n"));
  const metadata = Object.fromEntries(
    metadataKeys.map((key) => [key, catalog[key]]),
  );
  return {
    catalog,
    metadata,
    acl,
    details,
    sequence,
    sequenceState,
    permission,
    dataDigest,
  };
}
function equivalent(
  a: Awaited<ReturnType<typeof snapshot>>,
  b: Awaited<ReturnType<typeof snapshot>>,
) {
  for (const key of [
    "metadata",
    "acl",
    "details",
    "sequence",
    "sequenceState",
    "permission",
    "dataDigest",
  ] as const) {
    try {
      // Managed Linux and Windows collations can order identical ACL rows
      // differently. Compare a deterministic multiset, including grantors.
      if (key === "acl") {
        assert.deepEqual(
          b.acl.map((row) => JSON.stringify(row)).sort(),
          a.acl.map((row) => JSON.stringify(row)).sort(),
        );
      } else assert.deepEqual(b[key], a[key]);
    } catch {
      throw Object.assign(new Error("Private comparison failed"), {
        code: `MISMATCH_${key.toUpperCase()}`,
      });
    }
  }
}
function inspectArchive(archive: Buffer) {
  assert.equal(archive.subarray(0, 5).toString("ascii"), "PGDMP");
  const toc = native("pg_restore", ["--list"], childBase, archive).toString(
    "utf8",
  );
  const data = [...toc.matchAll(/^\d+; \d+ \d+ TABLE DATA (\S+) (\S+) /gm)];
  assert.equal(data.length, 1);
  assert.equal(data[0][1], "public");
  assert.equal(data[0][2], "TestUsers");
  const entries = toc.split(/\r?\n/).filter((line) => /^\d+;/.test(line));
  assert(
    !entries.some((line) =>
      /\b(auth|storage|vault|realtime|extensions|graphql|graphql_public)\b|\b(FUNCTION|PROCEDURE|EXTENSION|DOMAIN|OPERATOR|COLLATION|CONVERSION|TRIGGER|RULE)\b/.test(
        line,
      ),
    ),
  );
  assert(
    entries.some((line) => /SEQUENCE SET public TestUsers_id_seq /.test(line)),
  );
  const ddl = native(
    "pg_restore",
    ["--schema-only", "--file=-"],
    childBase,
    archive,
  ).toString("utf8");
  assert(
    !/CREATE\s+(FUNCTION|PROCEDURE|EXTENSION)|ALTER\s+SYSTEM|COPY[\s\S]*?PROGRAM|SECURITY\s+DEFINER/i.test(
      ddl,
    ),
  );
  return entries.length;
}
async function main() {
  paths();
  assert.equal(bridge({ mode: "check" }), "OK");
  const version = native("pg_dump", ["--version"]).toString("utf8").trim();
  assert(version.includes("17.11"));
  if (process.argv.includes("--self-test")) {
    stage = "synthetic-crypto-test";
    const name = `synthetic-probe-${randomBytes(5).toString("hex")}.cms`;
    const sample = randomBytes(32768);
    encrypt(name, sample);
    sample.fill(0);
    const probe = resolve(profile.backups, name);
    inside(profile.backups, probe);
    rmSync(probe);
    good("Existing certificate binary roundtrip and private path/ACL guards");
    return;
  }
  assert(process.argv.includes("--approved-scoped-export"));
  stage = "source-and-local-preflight";
  config({ path: ".env.local", quiet: true });
  const verified = verifiedDatabaseConfig();
  const url = new URL(verified.connectionString);
  assert.equal(url.hostname, "db.yfknxidgphhepdtwazhn.supabase.co");
  assert.equal(url.port || "5432", "5432");
  assert.equal(decodeURIComponent(url.username), "postgres");
  const sourceEnv = pgEnvironment(
    url.hostname,
    5432,
    "postgres",
    decodeURIComponent(url.password),
    process.env.DATABASE_CA_CERT_PATH!,
    true,
  );
  const source = postgres(verified.connectionString, {
    ...verified.options,
    onnotice: () => {},
    connection: {
      application_name: "aibean-approved-readonly-backup",
      timezone: "UTC",
    },
  });
  clients.push(source);
  assert(!existsSync(join(profile.data, "postmaster.pid")));
  const existing = readdirSync(profile.backups).filter((name) =>
    /^public-before-install-.*\.cms$/.test(name),
  );
  if (resumeName) assert(/^public-receipt-[a-z0-9-]+\.json$/.test(resumeName));
  else
    assert.equal(
      existing.length,
      0,
      "Existing hosted backup must be verified/resumed; never silently repeated",
    );
  // These settings apply only to the owned disposable server. Avoid row-bearing error logs.
  const configFile = join(profile.data, "postgresql.conf");
  writeFileSync(
    configFile,
    readFileSync(configFile, "utf8") +
      "\nlog_min_messages='panic'\nlog_error_verbosity='terse'\n",
  );
  native("pg_ctl", [
    "-D",
    profile.data,
    "-l",
    join(profile.recovery, "server.log"),
    "-w",
    "-t",
    "15",
    "start",
  ]);
  running = true;
  const localPassword = bridge({ mode: "local-password" });
  const localEnv = pgEnvironment(
    "127.0.0.1",
    profile.port,
    profile.role,
    localPassword,
    profile.ca,
    false,
  );
  const local = postgres({
    host: "127.0.0.1",
    port: profile.port,
    username: profile.role,
    password: localPassword,
    database: "postgres",
    max: 1,
    prepare: false,
    connect_timeout: 10,
    ssl: {
      ca: readFileSync(profile.ca, "utf8"),
      rejectUnauthorized: true,
      servername: "localhost",
      checkServerIdentity: (_host: string, cert: PeerCertificate) =>
        checkServerIdentity("127.0.0.1", cert),
    },
    connection: {
      application_name: "aibean-isolated-scoped-restore",
      timezone: "UTC",
    },
    onnotice: () => {},
  });
  clients.push(local);
  const localIdentity =
    await local`SELECT current_user AS role,current_setting('server_version') AS version,(SELECT ssl FROM pg_stat_ssl WHERE pid=pg_backend_pid()) AS tls`;
  assert.equal(localIdentity[0].role, profile.role);
  assert.equal(localIdentity[0].version, "17.11");
  assert.equal(localIdentity[0].tls, true);
  const targetTables =
    await local`SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p') ORDER BY c.relname`;
  const targetRoles =
    await local`SELECT rolname,rolcanlogin,rolsuper,rolcreatedb,rolcreaterole,rolreplication,rolbypassrls FROM pg_roles WHERE rolname NOT LIKE 'pg_%' AND rolname<>${profile.role} ORDER BY rolname`;
  if (resumeName) {
    assert(
      targetTables.length === 0 ||
        (targetTables.length === 1 && targetTables[0].relname === "TestUsers"),
    );
    assert(targetRoles.length === 0 || targetRoles.length === 6);
    for (const role of targetRoles) {
      assert(
        [
          "anon",
          "authenticated",
          "dashboard_user",
          "postgres",
          "service_role",
          "supabase_admin",
        ].includes(role.rolname),
      );
      assert(
        !role.rolcanlogin &&
          !role.rolsuper &&
          !role.rolcreatedb &&
          !role.rolcreaterole &&
          !role.rolreplication,
      );
      assert.equal(role.rolbypassrls, role.rolname === "service_role");
    }
  } else {
    assert.equal(targetTables.length, 0);
    assert.equal(targetRoles.length, 0);
  }
  good("Exact source configuration and owned verified-TLS local target");
  const id =
    new Date().toISOString().replace(/[^0-9]/g, "") +
    "-" +
    randomBytes(3).toString("hex");
  const previousReceipt = resumeName
    ? JSON.parse(readFileSync(join(profile.backups, resumeName), "utf8"))
    : null;
  const archiveName =
    previousReceipt?.archiveName || `public-before-install-${id}.cms`;
  const metadataName =
    previousReceipt?.metadataName || `public-metadata-${id}.cms`;
  assert(/^public-before-install-[a-z0-9-]+\.cms$/.test(archiveName));
  assert(/^public-metadata-[a-z0-9-]+\.cms$/.test(metadataName));
  const receipt = join(
    profile.backups,
    resumeName || `public-receipt-${id}.json`,
  );
  let archive: Buffer = Buffer.alloc(0);
  let publicEvidence: Record<string, unknown> = {};
  await source.begin(
    "ISOLATION LEVEL REPEATABLE READ READ ONLY",
    async (tx) => {
      await tx.unsafe("SET LOCAL timezone='UTC'");
      const before = await snapshot(query(tx));
      assert.equal(before.catalog.identity[0].database, "postgres");
      assert.equal(before.catalog.identity[0].read_only, "on");
      assert.equal(before.catalog.identity[0].tls, true);
      assert.equal(before.catalog.authUsersCount[0].count, 0);
      assert.equal(before.catalog.ledgers[0].drizzle, null);
      assert.equal(before.catalog.ledgers[0].supabase, null);
      good(
        "Authorized public object inventory, two records and read-only source session",
      );
      let privateMetadata;
      let privateReceipt;
      stage = "scoped-pg-dump";
      if (previousReceipt) {
        assert.equal(previousReceipt.sourceProject, profile.sourceProject);
        assert.equal(
          sha(readFileSync(join(profile.backups, archiveName))),
          previousReceipt.ciphertextSha256,
        );
        privateMetadata = JSON.parse(
          Buffer.from(
            bridge({ mode: "decrypt", name: metadataName }),
            "base64",
          ).toString("utf8"),
        );
        equivalent(privateMetadata.snapshot, before);
        archive = Buffer.from(
          bridge({ mode: "decrypt", name: archiveName }),
          "base64",
        );
        assert.equal(sha(archive), previousReceipt.archiveSha256);
        privateReceipt = previousReceipt;
      } else {
        const exported = await tx`SELECT pg_export_snapshot() AS snapshot`;
        archive = native(
          "pg_dump",
          [
            "--no-password",
            "--format=custom",
            "--schema=public",
            "--strict-names",
            "--no-large-objects",
            "--lock-wait-timeout=5s",
            `--snapshot=${exported[0].snapshot}`,
          ],
          sourceEnv,
        );
      }
      const archiveSha256 = sha(archive);
      stage = "archive-content-inspection";
      const archiveEntries = inspectArchive(archive);
      stage = "snapshot-sequence-postdump";
      assert.deepEqual(
        await query(tx)(
          'SELECT last_value::text,is_called FROM public."TestUsers_id_seq"',
        ),
        before.sequenceState,
      );
      stage = "encrypt-and-verify";
      if (!previousReceipt) {
        encrypt(archiveName, archive);
        privateMetadata = {
          capturedAt: new Date().toISOString(),
          sourceProject: profile.sourceProject,
          sourceDatabase: "postgres",
          archiveName,
          archiveSha256,
          snapshot: before,
          roleInformation: before.catalog.necessaryRoles,
          exclusions: [
            "credentials",
            "role passwords/hashes",
            "managed schema data",
            "global role replay",
          ],
        };
        // Catalog-only managed counts/role descriptors are not secrets; no managed row bodies are queried.
        encrypt(
          metadataName,
          Buffer.from(JSON.stringify(privateMetadata), "utf8"),
        );
        const ciphertextSha256 = sha(
          readFileSync(join(profile.backups, archiveName)),
        );
        privateReceipt = {
          capturedAt: privateMetadata.capturedAt,
          archiveName,
          metadataName,
          archiveSha256,
          ciphertextSha256,
          sourceProject: profile.sourceProject,
          status: "CAPTURED; RESTORE PENDING",
        };
        writeFileSync(receipt, JSON.stringify(privateReceipt, null, 2) + "\n", {
          flag: "wx",
        });
      }
      const ciphertextSha256 = sha(
        readFileSync(join(profile.backups, archiveName)),
      );
      assert(privateMetadata && privateReceipt);
      archive.fill(0);
      archive = Buffer.from(
        bridge({ mode: "decrypt", name: archiveName }),
        "base64",
      );
      assert.equal(sha(archive), archiveSha256);
      assert.equal(inspectArchive(archive), archiveEntries);
      good(
        "Encrypted hosted archive, certificate decryption, SHA-256 and archive scope inspection",
      );
      stage = "isolated-restore";
      if (targetRoles.length === 0)
        await local.begin(async (ltx) => {
          for (const role of [
            "anon",
            "authenticated",
            "dashboard_user",
            "postgres",
            "service_role",
            "supabase_admin",
          ]) {
            // Minimal name surrogates only, no passwords or platform administrator replay.
            await ltx.unsafe(
              `CREATE ROLE ${role} NOLOGIN INHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION ${role === "service_role" ? "BYPASSRLS" : "NOBYPASSRLS"}`,
            );
          }
          await ltx.unsafe("ALTER DATABASE postgres OWNER TO postgres");
          // Confirmed empty owned target only; neither this client nor libpq points at Supabase.
          await ltx.unsafe("DROP SCHEMA public");
        });
      if (targetTables.length === 0)
        native(
          "pg_restore",
          [
            "--no-password",
            "--exit-on-error",
            "--single-transaction",
            "--dbname=postgres",
          ],
          localEnv,
          archive,
        );
      stage = "private-data-and-metadata-comparison";
      // The inspection helper expects auth.users for a count; provide no fake managed schema.
      const localQ: Query = async (text) => {
        if (text === "SELECT count(*)::int AS count FROM auth.users")
          return [{ count: 0 }];
        return query(local)(text);
      };
      let restored = await snapshot(localQ);
      // pg_dump's public schema recreation assumes its initial PUBLIC USAGE
      // baseline. A freshly created schema lacks that baseline. Replay only
      // this exact observed grant in the owned disposable target, never source.
      const normalized = (row: Record<string, unknown>) => JSON.stringify(row);
      const missing = before.acl.filter(
        (row) => !restored.acl.map(normalized).includes(normalized(row)),
      );
      const extra = restored.acl.filter(
        (row) => !before.acl.map(normalized).includes(normalized(row)),
      );
      let publicUsageReplayed = false;
      if (missing.length === 1 && extra.length === 0) {
        assert.deepEqual(missing[0], {
          kind: "schema",
          object: "public",
          column: "",
          grantee: "PUBLIC",
          grantor: "pg_database_owner",
          privilege_type: "USAGE",
          is_grantable: false,
        });
        await local.unsafe("GRANT USAGE ON SCHEMA public TO PUBLIC");
        restored = await snapshot(localQ);
        publicUsageReplayed = true;
      } else if (
        missing.length === 0 &&
        extra.length === 0 &&
        before.acl.some(
          (row) =>
            row.kind === "schema" &&
            row.grantee === "PUBLIC" &&
            row.privilege_type === "USAGE" &&
            row.grantor === "pg_database_owner",
        )
      ) {
        // Resumption may already contain the verified baseline grant.
        await local.unsafe("GRANT USAGE ON SCHEMA public TO PUBLIC");
        restored = await snapshot(localQ);
        publicUsageReplayed = true;
      }
      equivalent(before, restored);
      good(
        "Both real records, columns, constraints, indexes, sequence, RLS and effective grants preserved",
      );
      stage = "native-role-behavior";
      for (const role of ["anon", "authenticated", "service_role"]) {
        stage = `native-role-behavior-${role}`;
        await local.begin("READ ONLY", async (rtx) => {
          await rtx.unsafe(`SET LOCAL ROLE ${role}`);
          assert.equal((await rtx`SELECT current_user AS role`)[0].role, role);
          assert.equal(
            (
              await rtx.unsafe(
                'SELECT count(*)::int AS count FROM public."TestUsers"',
              )
            )[0].count,
            2,
          );
        });
      }
      stage = "native-role-behavior-dashboard_user";
      // postgres-js rejects the enclosing transaction after a SQL error, even
      // when its query rejection is handled inside the callback.
      await assert.rejects(
        local.begin("READ ONLY", async (rtx) => {
          await rtx.unsafe("SET LOCAL ROLE dashboard_user");
          await rtx.unsafe('SELECT count(*) FROM public."TestUsers"');
        }),
        (error: { code?: string }) => error.code === "42501",
      );
      good(
        "Actual local role switching preserves browser/public exposure and dashboard denial",
      );
      equivalent(before, await snapshot(query(tx)));
      good(
        "Source snapshot, sequence state and metadata unchanged during capture/rehearsal",
      );
      publicEvidence = {
        capturedAt: privateMetadata.capturedAt,
        sourceProject: profile.sourceProject,
        sourceDatabase: "postgres",
        sourceVersion: before.catalog.identity[0].server_version,
        backupClientVersion: version,
        restoreVersion: "17.11",
        sourceReadOnly: true,
        sourceTlsVerified: true,
        scopedObjects: ["public.TestUsers", "public.TestUsers_id_seq"],
        sourceRecordCount: 2,
        restoredRecordCount: 2,
        archiveSha256,
        encryptedArchiveSha256: ciphertextSha256,
        archiveEntries,
        archiveScopeInspected: true,
        decryptionVerified: true,
        encryptedMetadataVerified: true,
        privateContentDigestMatched: true,
        definitionsConstraintsIndexesSequenceMatched: true,
        schemaTableColumnSequenceDefaultAclMatched: true,
        rlsMatched: true,
        effectivePermissionChecksMatched: true,
        publicSchemaBaselineUsageExplicitlyRestored: publicUsageReplayed,
        realLocalRoleTestsPassed: true,
        hostedApplicationTablesAbsent: 14,
        originalSqlHashes: expectedHashes,
        hostedApplicationMigrationExecuted: false,
        managedRoleReplayPerformed: false,
        roleSurrogates:
          "NOLOGIN names; no elevated admin flags; service_role BYPASSRLS only to match scoped behavior",
        platformDifferences: [
          "Windows 17.11 versus managed Linux 17.6",
          "Managed Auth/platform services excluded",
          "Global managed memberships, login passwords and database-wide ACLs not replayed",
          "postgres/supabase_admin/dashboard administrator flags deliberately not reproduced",
        ],
        independentDeviceKeyRecovery: "NOT VERIFIED",
        offDeviceCopy: "NOT CONFIGURED",
        hostedRecordsOrCredentialsDisplayed: false,
        backupContentsUploaded: false,
      };
      writeFileSync(
        receipt,
        JSON.stringify(
          {
            ...privateReceipt,
            status: "RESTORE VERIFIED; SOURCE POSTCHECK PENDING",
          },
          null,
          2,
        ) + "\n",
      );
    },
  );
  stage = "fresh-source-continuity-check";
  const metadata = JSON.parse(
    Buffer.from(
      bridge({ mode: "decrypt", name: metadataName }),
      "base64",
    ).toString("utf8"),
  );
  await source.begin(
    "ISOLATION LEVEL REPEATABLE READ READ ONLY",
    async (tx) => {
      await tx.unsafe("SET LOCAL timezone='UTC'");
      const after = await snapshot(query(tx));
      equivalent(metadata.snapshot, after);
      assert.equal(after.catalog.authUsersCount[0].count, 0);
      assert.equal(after.catalog.ledgers[0].drizzle, null);
      assert.equal(after.catalog.ledgers[0].supabase, null);
    },
  );
  good(
    "Fresh hosted transaction confirms unchanged private data, counts, structure, grants and absent aiBean tables",
  );
  for (const client of clients) await client.end({ timeout: 5 });
  clients.length = 0;
  stage = "stop-and-remove-approved-transient-data";
  native("pg_ctl", [
    "-D",
    profile.data,
    "-w",
    "-t",
    "15",
    "-m",
    "fast",
    "stop",
  ]);
  running = false;
  assert(!existsSync(join(profile.data, "postmaster.pid")));
  // Revalidate the exact directory immediately before recursive removal.
  inside(profile.recovery, profile.data);
  assert.equal(relative(profile.recovery, profile.data), "data");
  assert(!lstatSync(profile.data).isSymbolicLink());
  assert.equal(bridge({ mode: "check" }), "OK");
  rmSync(profile.data, {
    recursive: true,
    force: false,
    maxRetries: 3,
    retryDelay: 200,
  });
  const log = join(profile.recovery, "server.log");
  if (existsSync(log)) {
    inside(profile.recovery, log);
    assert(!lstatSync(log).isSymbolicLink());
    rmSync(log);
  }
  assert(!existsSync(profile.data));
  profile.recoveryDisposedAt = new Date().toISOString();
  writeFileSync(
    join(root, "preparation.json"),
    JSON.stringify(profile, null, 2) + "\n",
  );
  good(
    "Owned local cluster stopped and only approved transient data/log removed; ciphertext retained",
  );
  publicEvidence = {
    ...publicEvidence,
    verifiedAt: new Date().toISOString(),
    sourceUnchanged: true,
    transientRecoveryDataRemoved: true,
    encryptedBackupPreserved: true,
    recoveryGate: "PASS",
    outcomes,
  };
  writeFileSync(
    receipt,
    JSON.stringify(
      {
        ...JSON.parse(readFileSync(receipt, "utf8")),
        status: "PASS",
        evidence: publicEvidence,
      },
      null,
      2,
    ) + "\n",
  );
  writeFileSync(
    "docs/evidence/supabase-hosted-scoped-recovery-2026-10-09.json",
    JSON.stringify(publicEvidence, null, 2) + "\n",
  );
  archive.fill(0);
  passed = true;
  console.log(JSON.stringify(publicEvidence, null, 2));
}
if (process.argv[1]?.endsWith("execute-scoped-backup.ts"))
  main()
    .catch((error) => {
      // Assertion actual/expected, SQL text/details, row values and paths are never emitted.
      const code =
        typeof error?.code === "string" && /^[A-Z0-9_]{3,50}$/.test(error.code)
          ? error.code
          : "REDACTED";
      console.error(
        JSON.stringify({
          recoveryGate: "FAIL",
          stage,
          code,
          hostedWritesAttempted: false,
          backupPreservedIfCreated: true,
        }),
      );
      process.exitCode = 1;
    })
    .finally(async () => {
      await Promise.allSettled(
        clients.map((client) => client.end({ timeout: 5 })),
      );
      if (running) {
        try {
          native("pg_ctl", [
            "-D",
            profile.data,
            "-w",
            "-t",
            "15",
            "-m",
            "fast",
            "stop",
          ]);
        } catch {
          console.error("Owned recovery shutdown needs private review.");
        }
      }
      if (!passed && !process.argv.includes("--self-test"))
        console.log(
          "No transient recovery data was deleted on failure; any encrypted archive remains private.",
        );
    });
