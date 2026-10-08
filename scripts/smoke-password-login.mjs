import assert from "node:assert/strict";
let input = "";
for await (const chunk of process.stdin) input += chunk;
const credentials = JSON.parse(input);
const base = process.env.SMOKE_URL || "http://127.0.0.1:3000";
const origin = new URL(base).origin;
async function login(
  email,
  password,
  returnTo = "/account",
  requestOrigin = origin,
) {
  return fetch(`${base}/api/auth/login`, {
    method: "POST",
    redirect: "manual",
    headers: {
      Origin: requestOrigin,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ email, password, returnTo }),
  });
}
const page = await fetch(`${base}/login`);
const html = await page.text();
assert.ok(html.includes('name="email"') && html.includes('name="password"'));
assert.ok(!html.includes(credentials.password));
const guest = await fetch(`${base}/account`, { redirect: "manual" });
assert.equal(guest.status, 307);
const crossOrigin = await login(
  credentials.email,
  credentials.password,
  "/account",
  "https://unrelated.example",
);
assert.equal(crossOrigin.status, 403);
const wrong = await login(credentials.email, "WrongPassword!42");
assert.equal(wrong.status, 303);
assert.ok(wrong.headers.get("location").includes("error=credentials"));
assert.equal(wrong.headers.get("set-cookie"), null);
const correct = await login(
  credentials.email,
  credentials.password,
  "https://unrelated.example",
);
assert.equal(correct.status, 303);
assert.equal(new URL(correct.headers.get("location")).pathname, "/account");
const setCookie = correct.headers.get("set-cookie");
assert.ok(setCookie?.includes("HttpOnly"));
assert.ok(setCookie?.toLowerCase().includes("samesite=lax"));
const cookie = setCookie.split(";")[0];
const account = await fetch(`${base}/account`, { headers: { Cookie: cookie } });
assert.equal(account.status, 200);
assert.ok((await account.text()).includes("You are signed in."));
const home = await fetch(`${base}/`, { headers: { Cookie: cookie } });
assert.ok(
  /<a(?=[^>]*href="\/account")(?=[^>]*class="button primary")[^>]*>Account<\/a>/.test(await home.text()),
);
const admin = await fetch(`${base}/admin`, {
  headers: { Cookie: cookie },
  redirect: "manual",
});
assert.equal(admin.status, 307);
assert.ok(admin.headers.get("location")?.startsWith("/account"));
const logout = await fetch(`${base}/api/auth/logout`, {
  method: "POST",
  redirect: "manual",
  headers: { Origin: origin, Cookie: cookie },
});
assert.equal(logout.status, 303);
assert.ok(logout.headers.get("set-cookie")?.includes("Max-Age=0"));
const cleared = await fetch(`${base}/account`, { redirect: "manual" });
assert.equal(cleared.status, 307);
console.log(
  "PASS login form, invalid credentials, CSRF rejection, signed session, safe return URL, authenticated account/header, admin exclusion and logout.",
);
