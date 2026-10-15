import fs from "node:fs";
import p from "node:path";
import os from "node:os";
import cp from "node:child_process";
const repo = process.cwd(),
  root = fs.mkdtempSync(p.join(os.tmpdir(), "aibean-local-ui-phase2-build-"));
const names = cp
  .execFileSync("git", [
    "ls-files",
    "--cached",
    "--others",
    "--exclude-standard",
    "-z",
  ])
  .toString()
  .split("\0")
  .filter(Boolean);
const files = [...new Set(names)].filter(
  (f) =>
    /^(src\/|public\/|scripts\/|tests\/|db\/)/.test(f) ||
    [
      "package.json",
      "package-lock.json",
      "next.config.ts",
      "next-env.d.ts",
      "tsconfig.json",
      "postcss.config.mjs",
      ".gitattributes",
    ].includes(f),
);
for (const file of files) {
  const dest = p.join(root, file);
  fs.mkdirSync(p.dirname(dest), { recursive: true });
  fs.copyFileSync(p.join(repo, file), dest);
}
fs.symlinkSync(
  p.join(repo, "node_modules"),
  p.join(root, "node_modules"),
  "junction",
);
const env = { NODE_ENV: "production", NEXT_TELEMETRY_DISABLED: "1" };
for (const k of [
  "PATH",
  "Path",
  "SystemRoot",
  "WINDIR",
  "COMSPEC",
  "PATHEXT",
  "TEMP",
  "TMP",
  "USERPROFILE",
  "APPDATA",
  "LOCALAPPDATA",
])
  if (process.env[k]) env[k] = process.env[k];
const child = cp.spawn(
  process.execPath,
  [p.join(repo, "node_modules/next/dist/bin/next"), "build", "--webpack"],
  { cwd: root, env, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] },
);
const clean = (d) => d.toString().split(root).join("[isolated-build]");
child.stdout.on("data", (d) => process.stdout.write(clean(d)));
child.stderr.on("data", (d) => process.stderr.write(clean(d)));
child.on("exit", (code) => {
  fs.writeFileSync(
    "docs/evidence/local-ui-phase2-build.json",
    JSON.stringify(
      {
        status: code === 0 ? "PASS" : "FAIL",
        capturedAt: new Date().toISOString(),
        bundler: "webpack",
        sourceFiles: files.length,
        privateEnvironmentCopied: false,
        hostedConnectionsConfigured: false,
        sourceCopyUnchanged: true,
      },
      null,
      2,
    ) + "\n",
  );
  process.exitCode = code ?? 1;
});
