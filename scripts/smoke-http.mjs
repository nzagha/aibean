import assert from "node:assert/strict";
const base = process.env.SMOKE_URL || "http://127.0.0.1:3000";
const checks = [
  ["/", "Featured AI Tools"],
  ["/featured", "$99"],
  ["/tools", "Draft Studio"],
  ["/tools?category=CAT-02&free=true", "Draft Studio"],
  ["/tools?q=no-match-zz", "No tools match these filters."],
  ["/tools?verified=true", "No tools match these filters."],
  ["/tools/draft-studio", "Not yet verified"],
  ["/industries/real-estate-and-property", "Property Notes"],
  ["/compare?tools=draft-studio,code-compass", "See the differences."],
  ["/compare?tools=bad,missing", "Choose 2–4"],
  ["/skills", "Make the next task easier."],
  ["/playbooks", "From first step to finished work."],
  ["/events", "Find your next room."],
  ["/creators", "Learn from people who do the work."],
  ["/login", "Welcome back."],
];
for (const [path, text] of checks) {
  const response = await fetch(base + path, {
    signal: AbortSignal.timeout(30000),
  });
  assert.equal(response.status, 200, path);
  const body = await response.text();
  assert.ok(body.includes(text), `${path}: missing expected page content`);
  console.log("PASS", path);
}
for (const path of [
  "/account",
  "/admin",
  "/pricing",
  "/vendor",
  "/creator",
  "/submit/tool",
  "/claim/draft-studio",
  "/featured/manage",
]) {
  const response = await fetch(base + path, {
    redirect: "manual",
    signal: AbortSignal.timeout(30000),
  });
  assert.equal(response.status, 307, path);
  assert.ok(
    response.headers.get("location")?.startsWith("/login?returnTo="),
    path,
  );
  console.log("PASS guest blocked", path);
}
const webhook = await fetch(base + "/api/billing/webhook", {
  method: "POST",
  body: "{}",
});
assert.equal(webhook.status, 503);
console.log("PASS unconfigured billing fails closed");
const missing = await fetch(base + "/tools/unknown-tool");
assert.ok([200, 404].includes(missing.status));
const missingHtml = await missing.text();
assert.ok(missingHtml.includes("A little off track"));
assert.ok(missingHtml.includes("noindex"));
console.log(
  "PASS unknown tool not-found UI and noindex (streamed responses may be 200)",
);
