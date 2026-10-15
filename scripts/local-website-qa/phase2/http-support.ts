// Actual HTTP/server-action QA; credentials and cookies stay in memory only.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { JSDOM } from "jsdom";
import postgres from "postgres";
import { qaDatabaseConfig } from "../../../src/lib/local-qa-auth/config";
import { assertQaOrigin, qaCredentialPath } from "../guards";
import { createRequire } from "node:module";
const { encodeReply } = createRequire(__filename)(
  "next/dist/compiled/react-server-dom-turbopack/client.browser",
) as { encodeReply: (args: unknown[]) => Promise<string | FormData> };
type App = { role: string; url: string; email: string; password: string };
const state = JSON.parse(
  readFileSync("test-results/local-website-qa-active.json", "utf8"),
);
assert(/^[a-f0-9]{32}$/.test(state.run));
const fixture = JSON.parse(
  readFileSync(join(state.root, "browser-fixture.json"), "utf8"),
);
const credentials = JSON.parse(
  readFileSync(qaCredentialPath(state.run), "utf8"),
);
const manifest = JSON.parse(
  readFileSync(join(state.root, "runtime.json"), "utf8"),
);
assert.equal(state.run, fixture.run);
assert.equal(state.run, credentials.run);
const apps = (credentials.accounts as App[]).map((a) => ({
  ...a,
  url: "http://127.0.0.1:3000",
}));
assert.deepEqual(apps.map((a) => a.role).sort(), [
  "admin",
  "creator",
  "user",
  "vendor",
]);
assert.equal(new Set(apps.map((a) => a.password)).size, 4);
for (const a of apps) assertQaOrigin(a.url);
const cfg = qaDatabaseConfig({
  NODE_ENV: "development",
  AIBEAN_LOCAL_QA_AUTH: "1",
  AIBEAN_LOCAL_ACCEPTANCE_RUN: state.run,
  DATABASE_URL: manifest.connectionString,
})!;
const pg = postgres(cfg.connectionString, {
  ...cfg.options,
  onnotice: () => {},
});
const results: Record<string, unknown>[] = [];
const cookies = new Map<string, string>();
async function check(name: string, work: () => Promise<void>) {
  try {
    await work();
    results.push({ check: name, status: "PASS" });
  } catch {
    results.push({ check: name, status: "FAIL" });
  }
  console.log(JSON.stringify({ check: name, status: results.at(-1)!.status }));
}
async function request(
  a: App,
  path: string,
  cookie = "",
  options: RequestInit = {},
) {
  const r = await fetch(a.url + path, {
    ...options,
    headers: { ...(cookie ? { cookie } : {}), ...options.headers },
    redirect: "manual",
    signal: AbortSignal.timeout(90000),
  });
  const html = await r.text();
  const status = html.includes("NEXT_HTTP_ERROR_FALLBACK;404")
    ? 404
    : html.includes("NEXT_REDIRECT;")
      ? 307
      : r.status;
  return { r, html, status };
}
async function page(a: App, path: string, cookie = "", expected = 200) {
  const { r, html, status } = await request(a, path, cookie);
  assert(
    [expected, ...(expected === 307 ? [308] : [])].includes(status),
    "Unexpected route status",
  );
  assert(
    !/"digest"\s*:\s*"(?!NEXT_)[^"\n]+"/.test(html),
    "Server render error",
  );
  const dom = new JSDOM(html);
  const d = dom.window.document;
  if (expected === 200) assert(d.querySelector("main"));
  const unlabelled = Array.from(
    d.querySelectorAll<HTMLInputElement>(
      "input:not([type=hidden]),select,textarea",
    ),
  ).filter(
    (e) =>
      !e.closest("label") &&
      !e.getAttribute("aria-label") &&
      !e.getAttribute("aria-labelledby") &&
      !e.labels?.length,
  ).length;
  const nested = d.querySelectorAll("form form").length;
  results.push({
    route: path,
    persona: cookie ? a.role : "guest",
    status: "PASS",
    httpStatus: status,
    unlabelledControls: unlabelled,
    nestedForms: nested,
    kind: "HTTP_RENDER_ACCESS",
  });
  dom.window.close();
  return { html, r };
}
async function login(a: App) {
  const r = await fetch(a.url + "/api/auth/login", {
    method: "POST",
    headers: {
      origin: a.url,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      email: a.email,
      password: a.password,
      returnTo: "/account",
    }),
    redirect: "manual",
  });
  assert.equal(r.status, 303);
  assert.equal(r.headers.get("location"), a.url + "/account");
  const set = r.headers.get("set-cookie") || "";
  assert(set.includes("HttpOnly"));
  assert(/SameSite=strict/i.test(set));
  assert.equal(r.headers.get("cache-control"), "no-store");
  const cookie = set.split(";")[0];
  assert(cookie.startsWith("aibean_password_session="));
  cookies.set(a.role, cookie);
}
// Derive the action from the rendered RSC props, rather than hardcoding an action
// identifier or bypassing the actual framework/server authorization machinery.
function actionId(html: string, label: string) {
  const d = new JSDOM(html);
  let flight = "";
  for (const script of Array.from(d.window.document.scripts)) {
    const text = script.textContent || "";
    const p = text.indexOf("self.__next_f.push(");
    if (p < 0) continue;
    try {
      const tuple = JSON.parse(
        text.slice(p + "self.__next_f.push(".length).replace(/\)\s*;?\s*$/, ""),
      );
      if (tuple[0] === 1) flight += tuple[1];
    } catch {
      // Non-JSON framework scripts are not server-action metadata.
    }
  }
  d.window.close();
  const objects = new Map<string, unknown>();
  for (const line of flight.split("\n")) {
    const match = /^([a-f0-9]+):(\{|\[)/.exec(line);
    if (match)
      try {
        objects.set(match[1], JSON.parse(line.slice(match[1].length + 1)));
      } catch {
        // Ignore partial Flight records; only complete JSON nodes are traversed.
      }
  }
  let reference = "";
  const walk = (value: unknown) => {
    if (!value || typeof value !== "object") return;
    const v = value as Record<string, unknown>;
    if (
      v.label === label &&
      typeof v.action === "string" &&
      (v.action.startsWith("$F") || v.action.startsWith("$h"))
    )
      reference = v.action.slice(2);
    for (const child of Object.values(v)) walk(child);
  };
  for (const object of objects.values()) walk(object);
  const record = objects.get(reference) as
    { id?: string; bound?: unknown } | undefined;
  assert(
    record && /^[a-f0-9]{40,64}$/.test(record.id || ""),
    "Rendered action reference unavailable",
  );
  assert.equal(record.bound, null, "Only unbound rendered actions are used");
  return record.id!;
}
async function action(
  a: App,
  path: string,
  id: string,
  fields: Record<string, string | string[]>,
  origin = a.url,
) {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields))
    for (const item of Array.isArray(value) ? value : [value])
      form.append(key, item);
  const body = await encodeReply([{}, form]);
  return request(a, path, cookies.get(a.role) || "", {
    method: "POST",
    headers: { origin, "Next-Action": id, accept: "text/x-component" },
    body,
  });
}
export {
  pg,
  state,
  fixture,
  credentials,
  apps,
  cookies,
  results,
  check,
  request,
  page,
  login,
  actionId,
  action,
};
export type { App };
