// A NEW disposable loopback PostgreSQL cluster only. Never loads dotenv,
// accepts a supplied database URL or reuses/deletes an existing data directory.
import {
  spawn,
  spawnSync,
  execFileSync,
  type ChildProcess,
} from "node:child_process";
import { randomBytes, createHash } from "node:crypto";
import {
  mkdirSync,
  readFileSync,
  writeFileSync,
  existsSync,
  createWriteStream,
  cpSync,
  symlinkSync,
} from "node:fs";
import { resolve, join } from "node:path";
import { createServer } from "node:net";
import { checkServerIdentity, type PeerCertificate } from "node:tls";
import assert from "node:assert/strict";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { hashPassword, passwordAccountId } from "../../src/lib/password-crypto";
import { adminFixtureInput } from "../../tests/fixtures/admin-workflow-contract";
import {
  createAdminTool,
  transitionAdminTool,
} from "../../src/lib/admin/tool-workflows";
import { readAdminTool } from "../../src/lib/admin/queries";
import {
  saveContent,
  submitContent,
  moderateContent,
  saveProfile,
  submitProfile,
  moderateProfile,
} from "../../src/lib/content/workflows";
import { readContentDetail, readProfile } from "../../src/lib/content/queries";
import { updateOrganicRanking } from "../../src/lib/admin/catalog-controls";
import { mutateEngagement } from "../../src/lib/db/engagement-workflows";
import { saveCampaignBlocks } from "../../src/lib/creator-enhancements/presentation";
import { parse } from "dotenv";
import { privateChildEnvironment, qaCredentialPath } from "./guards";
assert.equal(
  process.argv.slice(2).length,
  0,
  "QA setup accepts no target URL or existing data directory",
);

const run = randomBytes(16).toString("hex");
const root = resolve("test-results", "product-acceptance-" + run);
const credentialsPath = qaCredentialPath(run);
const originalDeclarations = new Map(
  ["next-env.d.ts", "tsconfig.json"].map((path) => [
    path,
    readFileSync(path, "utf8"),
  ]),
);
function restoreGeneratedDeclarations() {
  for (const [path, original] of originalDeclarations) {
    const current = readFileSync(path, "utf8");
    if (current === original) continue;
    let generatedOnly: boolean;
    if (path === "next-env.d.ts") {
      const withoutGeneratedImports = (text: string) =>
        text
          .replace(
            /^import "\.\/(?:\.next|test-results\/product-acceptance-[a-f0-9]{32}\/next-(?:admin|user|creator|vendor))(?:\/dev)?\/types\/(?:routes|root-params)\.d\.ts";\r?\n/gm,
            "",
          )
          .replaceAll("\r\n", "\n");
      generatedOnly =
        withoutGeneratedImports(current) === withoutGeneratedImports(original);
    } else {
      const before = JSON.parse(original),
        after = JSON.parse(current);
      const beforeIncludes = before.include as string[],
        afterIncludes = after.include as string[];
      delete before.include;
      delete after.include;
      generatedOnly =
        JSON.stringify(before) === JSON.stringify(after) &&
        beforeIncludes.every((value) => afterIncludes.includes(value)) &&
        afterIncludes.every(
          (value) =>
            beforeIncludes.includes(value) ||
            value.startsWith(`test-results/product-acceptance-${run}/next-`),
        );
    }
    if (generatedOnly) writeFileSync(path, original);
    else
      console.warn(
        "Preserved a concurrently changed project declaration: " + path,
      );
  }
}
assert(!existsSync(root));
mkdirSync(root, { recursive: true, mode: 0o700 });
if (process.platform !== "win32")
  throw Error("This private handoff requires Windows ACL validation.");
const privateAcl = spawnSync(
  "powershell.exe",
  [
    "-NoLogo",
    "-NoProfile",
    "-NonInteractive",
    "-File",
    resolve("scripts/local-website-qa/protect-fixture.ps1"),
    "-Root",
    root,
  ],
  { encoding: "utf8", windowsHide: true },
);
assert.equal(privateAcl.status, 0, "Private fixture ACL protection failed");
assert(privateAcl.stdout.includes("PRIVATE_OWNER_AND_SYSTEM_ONLY"));
const envFingerprint = existsSync(".env.local") ? shaFile(".env.local") : null;
function shaFile(path: string) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}
const bin = process.env.PG_TEST_BIN;
if (!bin)
  throw Error("PG_TEST_BIN is required for a new native PostgreSQL fixture.");
const exe = (s: string) =>
  join(bin, s + (process.platform === "win32" ? ".exe" : ""));
const pgRun = (s: string, args: string[]) => {
  const r = spawnSync(s, args, {
    encoding: "utf8",
    timeout: 60000,
    windowsHide: true,
    stdio: s.includes("pg_ctl") ? "ignore" : "pipe",
  });
  if (r.status !== 0)
    throw Error("Local fixture command failed: " + s.split(/[\\/]/).pop());
};
async function freePort() {
  const s = createServer();
  await new Promise<void>((r) => s.listen(0, "127.0.0.1", r));
  const port = (s.address() as { port: number }).port;
  await new Promise<void>((r, j) => s.close((e) => (e ? j(e) : r())));
  return port;
}
const password = randomBytes(32).toString("hex");
const ca = join(root, "fixture-ca.crt"),
  key = join(root, "fixture-server.key");
const directory = join(root, "cluster");
const servers: ChildProcess[] = [];
const connections: ReturnType<typeof postgres>[] = [];
let running = false;
const expiresAt = Date.now() + 110 * 60_000;
const sha = (s: Buffer | string) =>
  createHash("sha256").update(s).digest("hex");
async function main() {
  for (const appPort of [3000, 3002, 3003, 3004]) {
    const listener = createServer();
    await new Promise<void>((ok, fail) => {
      listener.once("error", () =>
        fail(
          Error(
            "An expected QA port is occupied; no process will be terminated.",
          ),
        ),
      );
      listener.listen(appPort, "127.0.0.1", ok);
    });
    await new Promise<void>((r) => listener.close(() => r()));
  }
  pgRun(process.env.PG_TEST_OPENSSL || "openssl", [
    "req",
    "-x509",
    "-newkey",
    "rsa:2048",
    "-nodes",
    "-days",
    "2",
    "-subj",
    "/CN=localhost",
    "-addext",
    "subjectAltName=DNS:localhost,IP:127.0.0.1",
    "-addext",
    "basicConstraints=critical,CA:TRUE",
    "-keyout",
    key,
    "-out",
    ca,
  ]);
  const pw = join(root, "bootstrap-password");
  writeFileSync(pw, password, { mode: 0o600 });
  pgRun(exe("initdb"), [
    "-D",
    directory,
    "-U",
    "cluster_admin",
    "--pwfile",
    pw,
    "--auth-host=scram-sha-256",
    "--auth-local=scram-sha-256",
    "--encoding=UTF8",
    "--no-locale",
  ]);
  const port = await freePort();
  assert(![5432, 6543].includes(port));
  const pgPath = (p: string) => p.replace(/\\/g, "/").replace(/'/g, "''");
  writeFileSync(
    join(directory, "postgresql.conf"),
    `listen_addresses='127.0.0.1'\nport=${port}\ncluster_name='aibean-acceptance-${run}'\nssl=on\nssl_cert_file='${pgPath(ca)}'\nssl_key_file='${pgPath(key)}'\npassword_encryption='scram-sha-256'\nlog_statement='none'\nlog_min_error_statement='panic'\n`,
  );
  writeFileSync(
    join(directory, "pg_hba.conf"),
    "hostssl all all 127.0.0.1/32 scram-sha-256\nhostnossl all all 127.0.0.1/32 reject\n",
  );
  pgRun(exe("pg_ctl"), [
    "-D",
    directory,
    "-l",
    join(root, "postgres.log"),
    "-w",
    "start",
  ]);
  running = true;
  const connect = (username: string) => {
    const c = postgres({
      host: "127.0.0.1",
      port,
      database: "postgres",
      username,
      password,
      max: 1,
      prepare: false,
      ssl: {
        ca: readFileSync(ca, "utf8"),
        rejectUnauthorized: true,
        servername: "localhost",
        checkServerIdentity: (_host: string, p: PeerCertificate) =>
          checkServerIdentity("127.0.0.1", p),
      },
      onnotice: () => {},
    });
    connections.push(c);
    return c;
  };
  const admin = connect("cluster_admin");
  await admin.unsafe(
    `CREATE ROLE postgres LOGIN NOSUPERUSER BYPASSRLS CREATEDB CREATEROLE PASSWORD '${password}'; CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS; GRANT CREATE ON DATABASE postgres TO postgres; ALTER SCHEMA public OWNER TO postgres; REVOKE CREATE ON SCHEMA public FROM PUBLIC; CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY); GRANT USAGE ON SCHEMA auth TO postgres; GRANT SELECT,REFERENCES ON auth.users TO postgres;`,
  );
  const operator = connect("postgres");
  for (const manifestPath of [
    "db/install/manifest.json",
    "db/proposals/admin-review-v1.manifest.json",
    "db/proposals/admin-operations-v2/manifest.json",
    "db/proposals/creator-content-v1/manifest.json",
    "db/proposals/creator-files-v1/manifest.json",
    "db/proposals/discovery-v1/manifest.json",
    "db/proposals/pricing-v1/manifest.json",
    "db/proposals/affiliate-creator-v1/manifest.json",
  ]) {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    const path = manifest.sqlPath || "db/install/reviewed-installation.sql";
    const body = readFileSync(path, "utf8").replace(/\r\n/g, "\n");
    const expected = manifest.sqlSha256 || manifest.installationSqlSha256;
    assert.equal(
      sha(body),
      expected,
      "Exact reviewed fixture installation hash",
    );
    const setting = (
      {
        "admin-review-v1": "review",
        "admin-operations-v2": "operations",
        "creator-content-v1": "content",
        "creator-files-v1": "files",
        "discovery-v1": "discovery",
        "pricing-v1": "pricing",
        "affiliate-creator-v1": "affiliate_creator",
      } as Record<string, string>
    )[manifest.packageId];
    if (setting)
      await operator`SELECT set_config(${"aibean." + setting + "_install_sha256"},${expected},false)`;
    await operator.unsafe(body);
  }
  await admin.unsafe(
    `CREATE ROLE aibean_app_login LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION NOINHERIT PASSWORD '${password}'; GRANT aibean_runtime TO aibean_app_login; ALTER ROLE aibean_app_login SET role='aibean_runtime';`,
  );
  const runtime = connect("aibean_app_login");
  const database = drizzle(runtime);
  const email = "qa-admin@local-aibean.invalid",
    userEmail = "qa-user@local-aibean.invalid";
  const creatorEmail = "qa-creator@local-aibean.invalid",
    vendorEmail = "qa-vendor@local-aibean.invalid";
  const creator = passwordAccountId(creatorEmail),
    vendor = passwordAccountId(vendorEmail);
  const peerCreator = passwordAccountId("other-creator@local-aibean.invalid"),
    peerVendor = passwordAccountId("other-vendor@local-aibean.invalid");
  const actor = passwordAccountId(email),
    user = passwordAccountId(userEmail);
  await operator`INSERT INTO public.users(id,is_admin,is_creator) VALUES(${actor},true,false),(${user},false,false),(${creator},false,true),(${vendor},false,false)`;
  await operator`INSERT INTO public.users(id,is_admin,is_creator) VALUES(${peerCreator},false,true),(${peerVendor},false,false)`;
  await operator`INSERT INTO public.creator_applications(id,user_id,name,bio,links,status,reviewer_id,review_reason,reviewed_at) VALUES(${randomBytes(16).toString("hex")},${creator},'Local QA Creator','Synthetic approved local-only Creator persona','[]','approved',${actor},'Explicit owner-authorized isolated QA capability fixture',now())`;
  for (const [id, role] of [
    [actor, "admin"],
    [user, "ordinary-user"],
    [creator, "approved-creator"],
    [vendor, "tool-scoped-vendor"],
  ])
    await operator`INSERT INTO public.audit_logs(id,actor_id,action,entity_id,detail) VALUES(${randomBytes(16).toString("hex")},${actor},'local-qa.fixture-provisioned',${id},${JSON.stringify({ role, scope: "fresh-disposable-loopback-only", registrationPrivilegeGrant: false })})`;
  await operator`INSERT INTO public.taxonomy(id,kind,name,slug,data) VALUES(${adminFixtureInput.categoryId},'category','Acceptance synthetic category','acceptance-category','{}')`;
  process.env.AIBEAN_REVIEW_WORKFLOWS = "1";
  process.env.AIBEAN_COMMERCE_WORKFLOWS = "1";
  process.env.AIBEAN_CONTENT_WORKFLOWS = "1";
  process.env.AIBEAN_PRICING_WORKFLOWS = "true";
  process.env.AIBEAN_DISCOVERY_WORKFLOWS = "true";
  process.env.AIBEAN_AFFILIATE_CREATOR_WORKFLOWS = "true";
  const tools = [] as string[];
  for (let i = 1; i <= 2; i++) {
    const id = await createAdminTool(database, actor, {
      ...adminFixtureInput,
      name: `Acceptance synthetic Tool ${i}`,
      slug: `acceptance-tool-${i}`,
    });
    const row = await readAdminTool(database, actor, id);
    await transitionAdminTool(database, actor, {
      toolId: id,
      revision: row!.revision,
      status: "published",
      reason: "Synthetic local acceptance publication",
    });
    tools.push(id);
    const ranked = await readAdminTool(database, actor, id);
    await updateOrganicRanking(database, actor, {
      toolId: id,
      revision: ranked!.revision,
      reason: "Synthetic organic ranking acceptance",
      editorial: 70,
      context: 80,
      verification: 30,
      completeness: 80,
      freshness: 20,
      reviews: 0,
      popularity: 0,
      engagement: 0,
      risk: 0,
      adjustment: 0,
    });
  }
  await operator`INSERT INTO public.vendor_access(tool_id,user_id) VALUES(${tools[0]},${vendor})`;
  await operator`INSERT INTO public.vendor_access(tool_id,user_id) VALUES(${tools[1]},${peerVendor})`;
  await saveProfile(database, creator, {
    handle: "acceptance-creator",
    displayName: "Acceptance synthetic Creator",
    bio: "Synthetic local Creator profile for disposable acceptance testing.",
    website: "https://example.invalid",
  });
  await submitProfile(
    database,
    creator,
    (await readProfile(database, creator))!.revision,
  );
  await moderateProfile(database, actor, {
    id: creator,
    revision: (await readProfile(database, creator))!.revision,
    decision: "published",
    reason: "Synthetic profile acceptance",
  });
  const base = {
    title: "Acceptance synthetic Skill",
    slug: "acceptance-skill",
    summary: "Synthetic content for disposable local product acceptance only.",
    categoryId: adminFixtureInput.categoryId,
    useCaseIds: [],
    industryIds: [],
    toolIds: tools,
    outcome: "A concrete synthetic workflow outcome.",
    instructions:
      "Follow the synthetic steps in this disposable test environment.",
    prompts: "",
    examples: "",
  };
  const peerDraftId = await saveContent(database, peerCreator, "skills", {
    ...base,
    title: "Other Creator private synthetic draft",
    slug: "other-creator-private-draft",
  });
  let skillId = "";
  for (const [kind, input] of [
    ["skills", base],
    [
      "playbooks",
      {
        ...base,
        title: "Acceptance synthetic Playbook",
        slug: "acceptance-playbook",
        audience: "Synthetic local testers",
        difficulty: "beginner",
        minutes: 10,
        steps: [
          {
            title: "First synthetic step",
            instruction:
              "Inspect the synthetic Tool and its public description.",
          },
        ],
        skillIds: [],
      },
    ],
    [
      "events",
      {
        ...base,
        title: "Acceptance synthetic Event",
        slug: "acceptance-event",
        description: base.summary,
        organizer: "Synthetic organizer",
        eventType: "workshop",
        format: "virtual",
        venue: "",
        city: "",
        country: "",
        virtualUrl: "https://example.invalid/room",
        registrationUrl: "https://example.invalid/register",
        startsAt: "2027-01-01T12:00:00Z",
        endsAt: "2027-01-01T13:00:00Z",
        timezone: "UTC",
      },
    ],
    [
      "resources",
      {
        ...base,
        title: "Acceptance synthetic resource",
        slug: "acceptance-resource",
        destination: "https://example.invalid/resource",
        disclosure: "Synthetic external destination for isolated acceptance.",
        skillId: null,
        playbookId: null,
      },
    ],
  ] as const) {
    const id = await saveContent(
      database,
      creator,
      kind,
      kind === "playbooks"
        ? { ...input, skillIds: [skillId] }
        : kind === "resources"
          ? { ...input, skillId }
          : input,
    );
    if (kind === "skills") skillId = id;
    let row = await readContentDetail(database, creator, kind, id, "owner");
    if (kind === "resources") {
      await saveCampaignBlocks(database, creator, id, row!.revision, [
        {
          kind: "tools",
          targetId: tools[0],
          title: "Campaign Tool",
          description: "Synthetic canonical Tool reference",
        },
        {
          kind: "skills",
          targetId: skillId,
          title: "Campaign Skill",
          description: "Synthetic implementation reference",
        },
      ]);
      row = await readContentDetail(database, creator, kind, id, "owner");
    }
    await submitContent(database, creator, kind, id, row!.revision);
    row = await readContentDetail(database, creator, kind, id, "owner");
    await moderateContent(database, actor, kind, {
      id,
      revision: row!.revision,
      decision: "published",
      reason: "Synthetic content acceptance publication",
    });
  }
  await mutateEngagement(database, user, {
    operation: "create-stack",
    name: "Acceptance synthetic private Stack",
  });
  // Private fixture metadata is ignored by Git, contains only newly generated
  // local credentials, and is never included in sanitized result documents.
  const connectionString = `postgresql://aibean_app_login:${password}@127.0.0.1:${port}/postgres`;
  writeFileSync(
    join(root, "runtime.json"),
    JSON.stringify({
      run,
      expiresAt,
      database: "postgres",
      username: "aibean_app_login",
      connectionString,
      caSha256: sha(readFileSync(ca, "utf8")),
    }),
    { mode: 0o600 },
  );
  const environments = [] as { role: string; url: string; email: string }[];
  const credentials: {
    role: string;
    email: string;
    password: string;
    url: string;
  }[] = [];
  const serverActionsKey = randomBytes(32).toString("base64");
  const sourceFiles = execFileSync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
    { windowsHide: true },
  )
    .toString()
    .split("\0")
    .filter(
      (path) =>
        /^(src\/|public\/|db\/)/.test(path) ||
        [
          "package.json",
          "package-lock.json",
          "next.config.ts",
          "next-env.d.ts",
          "tsconfig.json",
          "postcss.config.mjs",
        ].includes(path),
    );
  for (const [role, identity, appPort] of [
    ["user", userEmail, 3000],
    ["admin", email, 3002],
    ["creator", creatorEmail, 3003],
    ["vendor", vendorEmail, 3004],
  ] as const) {
    const loginPassword = "Qa9!" + randomBytes(32).toString("hex"),
      loginHash = await hashPassword(loginPassword),
      secret = randomBytes(48).toString("hex");
    // Independent source snapshots avoid four dev processes rewriting the same
    // root TypeScript declarations. No .env/provider/private source is copied.
    const appRoot = join(root, "source-" + role);
    mkdirSync(appRoot);
    for (const path of sourceFiles) {
      const destination = join(appRoot, path);
      mkdirSync(resolve(destination, ".."), { recursive: true });
      cpSync(path, destination);
    }
    symlinkSync(
      resolve("node_modules"),
      join(appRoot, "node_modules"),
      "junction",
    );
    const runtimeRoot = join(
      appRoot,
      "test-results",
      "product-acceptance-" + run,
    );
    mkdirSync(runtimeRoot, { recursive: true });
    cpSync(join(root, "runtime.json"), join(runtimeRoot, "runtime.json"));
    cpSync(ca, join(runtimeRoot, "fixture-ca.crt"));
    // Turbopack's filesystem root must contain the shared dependency junction.
    writeFileSync(
      join(appRoot, "next.config.ts"),
      readFileSync("next.config.ts", "utf8").replace(
        "  devIndicators: false,",
        `  turbopack: { root: ${JSON.stringify(process.cwd())} },\n  devIndicators: false,`,
      ),
    );
    const fileKeys: string[] = [];
    // Next dev reads .env.local. Override its KEY NAMES with empty values,
    // preventing any private existing project/provider config from being used.
    for (const file of [
      ".env",
      ".env.local",
      ".env.development",
      ".env.development.local",
    ])
      if (existsSync(file))
        fileKeys.push(...Object.keys(parse(readFileSync(file))));
    const env = privateChildEnvironment(process.env, fileKeys);
    Object.assign(env, {
      NODE_ENV: "development",
      AIBEAN_LOCAL_ACCEPTANCE_RUN: run,
      AIBEAN_LOCAL_ACCEPTANCE_ROLE: role,
      NEXT_PUBLIC_APP_URL: "http://127.0.0.1:" + appPort,
      NEXT_TELEMETRY_DISABLED: "1",
      NEXT_SERVER_ACTIONS_ENCRYPTION_KEY: serverActionsKey,
      DATABASE_URL: connectionString,
      DATABASE_CA_CERT_PATH: ca,
      AIBEAN_AUTH_MODE: "password",
      LOCAL_LOGIN_EMAIL: identity,
      LOCAL_LOGIN_PASSWORD_HASH: loginHash,
      LOCAL_SESSION_SECRET: secret,
      AIBEAN_DEMO_MODE: "false",
      AIBEAN_REVIEW_WORKFLOWS: "1",
      AIBEAN_COMMERCE_WORKFLOWS: "1",
      AIBEAN_CONTENT_WORKFLOWS: "1",
      AIBEAN_DISCOVERY_WORKFLOWS: "true",
      AIBEAN_PRICING_WORKFLOWS: "true",
      AIBEAN_AFFILIATE_CREATOR_WORKFLOWS: "true",
      AIBEAN_AFFILIATE_APPROVED_PROGRAMS: "",
      AIBEAN_AFFILIATE_PROVIDER_VERIFIED: "",
      AIBEAN_AFFILIATE_RECEIPT_KEYS: "",
      AIBEAN_ANALYTICS_SECRET: randomBytes(32).toString("hex"),
      AIBEAN_RESOURCE_UPLOADS: "",
      AIBEAN_SUPABASE_PROVIDER_TEST_APPROVED: "",
      STRIPE_SECRET_KEY: "",
      STRIPE_WEBHOOK_SECRET: "",
    });
    const child = spawn(
      process.execPath,
      [
        resolve("node_modules/next/dist/bin/next"),
        "dev",
        "--hostname",
        "127.0.0.1",
        "--port",
        String(appPort),
      ],
      {
        cwd: appRoot,
        env,
        windowsHide: true,
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    const log = createWriteStream(join(root, role + "-app.log"));
    child.stdout!.pipe(log);
    child.stderr!.pipe(log);
    servers.push(child);
    // Next writes root type/config declarations during startup. Start each
    // fixture server in sequence so those generated writes cannot collide.
    await new Promise<void>((resolveReady, rejectReady) => {
      const timer = setTimeout(
        () => rejectReady(Error("Synthetic app did not become ready.")),
        60000,
      );
      child.once("error", (error) => {
        clearTimeout(timer);
        rejectReady(error);
      });
      child.once("exit", () => {
        clearTimeout(timer);
        rejectReady(Error("Synthetic app exited before readiness."));
      });
      child.stdout!.on("data", (chunk) => {
        if (String(chunk).includes("Ready in")) {
          clearTimeout(timer);
          resolveReady();
        }
      });
    });
    environments.push({
      role,
      url: "http://127.0.0.1:" + appPort,
      email: identity,
    });
    credentials.push({
      role,
      email: identity,
      password: loginPassword,
      url: "http://127.0.0.1:" + appPort,
    });
  }
  restoreGeneratedDeclarations();
  const privateCredentialRoot = resolve(credentialsPath, "..");
  assert(
    !existsSync(privateCredentialRoot),
    "Never replace an existing private credential handoff",
  );
  mkdirSync(privateCredentialRoot, { recursive: true });
  execFileSync(
    "powershell.exe",
    [
      "-NoProfile",
      "-File",
      "scripts/local-website-qa/protect-credentials.ps1",
      "-Root",
      privateCredentialRoot,
    ],
    { stdio: "pipe", windowsHide: true },
  );
  writeFileSync(
    credentialsPath,
    JSON.stringify(
      {
        notice: "Private synthetic local QA credentials; never publish",
        run,
        expiresAt,
        accounts: credentials,
      },
      null,
      2,
    ),
  );
  writeFileSync(
    join(root, "browser-fixture.json"),
    JSON.stringify({
      run,
      environments,
      toolIds: tools,
      peerDraftId,
      runnerPid: process.pid,
      serverPids: servers.map((s) => s.pid),
      expiresAt,
    }),
  );
  assert.equal(
    envFingerprint,
    existsSync(".env.local") ? shaFile(".env.local") : null,
    "Private original environment changed",
  );
  writeFileSync(
    "test-results/local-website-qa-active.json",
    JSON.stringify({
      run,
      root,
      credentialsPath,
      expiresAt,
      runnerPid: process.pid,
      environments,
    }),
  );
  console.log(
    JSON.stringify(
      {
        run,
        environments,
        expiresAt,
        privateAcl: "OWNER_AND_SYSTEM_ONLY",
        originalEnvUnchanged: true,
      },
      null,
      2,
    ),
  );
  console.log(
    "Synthetic development fixture started; write STOP to shut down only these new processes.",
  );
  while (Date.now() < expiresAt && !existsSync(join(root, "STOP")))
    await new Promise((r) => setTimeout(r, 1000));
}
main()
  .catch((error) => {
    writeFileSync(
      join(root, "fixture-error.log"),
      String(error?.stack || error),
    );
    console.error(
      "Disposable product acceptance fixture failed; inspect ignored synthetic logs at " +
        root,
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    for (const child of servers) {
      if (child.pid && child.exitCode === null && child.signalCode === null) {
        if (process.platform === "win32")
          spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
            windowsHide: true,
            stdio: "ignore",
          });
        else child.kill("SIGTERM");
      }
    }
    for (const connection of connections) await connection.end({ timeout: 5 });
    if (running)
      pgRun(exe("pg_ctl"), ["-D", directory, "-m", "fast", "-w", "stop"]);
    restoreGeneratedDeclarations();
    console.log(
      "New local acceptance processes stopped; fixture evidence retained, no existing targets touched.",
    );
  });
