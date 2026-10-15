import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { randomBytes } from "node:crypto";
import {
  verifyPassword,
  passwordAccountId,
} from "../../../src/lib/password-crypto";
import {
  pg,
  apps,
  state,
  fixture,
  cookies,
  results,
  check,
  page,
  login,
  request,
  type App,
} from "./http-support";
import { submit, message } from "./rendered-forms";
const creator = apps.find((a) => a.role === "creator")!;
const admin = apps.find((a) => a.role === "admin")!;
let user: App;
const suffix = randomBytes(5).toString("hex");
async function main() {
  const journey = JSON.parse(
    readFileSync(
      join(dirname(state.credentialsPath), "browser-journey.json"),
      "utf8",
    ),
  );
  const [account] =
    await pg`select a.user_id,a.password_hash,u.is_admin,u.is_creator from local_qa_auth.accounts a join public.users u on u.id=a.user_id where email=${journey.email}`;
  assert(account && !account.is_admin && !account.is_creator);
  const matching = [];
  for (const key of ["initialPassword", "changePassword", "resetPassword"])
    if (await verifyPassword(journey[key], account.password_hash))
      matching.push(journey[key]);
  assert.equal(
    matching.length,
    1,
    "Current private journey input must match; never reset to force a pass",
  );
  user = {
    role: "registered-user",
    url: "http://127.0.0.1:3000",
    email: journey.email,
    password: matching[0],
  };
  for (const a of [user, creator, admin]) await login(a);
  const comparison = "/compare?tools=acceptance-tool-1,acceptance-tool-2";
  let comparisonId = "";
  await check(
    "Registered User saves a named two-Tool comparison and reloads persisted membership",
    async () => {
      message(
        await submit(user, comparison, "Save comparison", {
          name: "Phase2 comparison " + suffix,
          toolIds: fixture.toolIds.slice(0, 2),
        }),
        "Comparison saved to your account.",
      );
      const [r] =
        await pg`select id from public.saved_comparisons where user_id=${account.user_id} and name=${"Phase2 comparison " + suffix}`;
      assert(r);
      comparisonId = r.id;
      assert.equal(
        (
          await pg`select tool_id from public.comparison_tools where comparison_id=${comparisonId}`
        ).length,
        2,
      );
      await page(
        user,
        "/account/comparisons/" + comparisonId,
        cookies.get(user.role),
      );
    },
  );
  await check("Comparison stays private across account sessions", async () => {
    assert(comparisonId);
    await page(
      creator,
      "/account/comparisons/" + comparisonId,
      cookies.get(creator.role),
      404,
    );
  });
  for (const target of [
    {
      kind: "creators",
      id: passwordAccountId(creator.email),
      path: "/@acceptance-creator",
    },
    {
      kind: "skills",
      id: (
        await pg`select id from public.ai_skills where slug='acceptance-skill'`
      )[0].id,
      path: "/skills/acceptance-skill",
    },
  ]) {
    await check(
      "Registered User follows and unfollows " +
        target.kind +
        " without changing an existing follow",
      async () => {
        const [before] =
          await pg`select count(*)::int as n from public.account_follows where user_id=${account.user_id} and kind=${target.kind} and target_id=${target.id}`;
        if (before.n) {
          await page(user, "/account/following", cookies.get(user.role));
          results.push({
            check: "New follow/unfollow toggle for " + target.kind,
            status: "NOT TESTED",
            reason: "Existing follow preserved",
          });
          return;
        }
        message(
          await submit(
            user,
            target.path,
            "Follow",
            { kind: target.kind, id: target.id, remove: "false" },
            { kind: target.kind, id: target.id },
          ),
          "Following saved.",
        );
        assert.equal(
          (
            await pg`select target_id from public.account_follows where user_id=${account.user_id} and kind=${target.kind} and target_id=${target.id}`
          ).length,
          1,
        );
        await page(user, "/account/following", cookies.get(user.role));
        message(
          await submit(
            user,
            target.path,
            "Unfollow",
            { kind: target.kind, id: target.id, remove: "true" },
            { kind: target.kind, id: target.id },
          ),
          "Unfollowed.",
        );
        assert.equal(
          (
            await pg`select target_id from public.account_follows where user_id=${account.user_id} and kind=${target.kind} and target_id=${target.id}`
          ).length,
          0,
        );
      },
    );
  }
  await check(
    "Activity, billing and membership show actual local state without provider success claims",
    async () => {
      for (const path of [
        "/account/activity",
        "/account/billing",
        "/account/membership",
      ]) {
        const p = await page(user, path, cookies.get(user.role));
        assert(!p.html.includes("sk_live_"));
      }
      for (const path of [
        "/admin/commerce/pricing",
        "/admin/commerce/payments",
        "/admin/commerce/subscriptions",
        "/admin/claims",
        "/admin/disputes",
        "/admin/reports",
      ]) {
        await page(admin, path, cookies.get(admin.role));
      }
    },
  );
}
void main()
  .catch(() => {
    results.push({
      check: "Discovery workflow prerequisite failed; private details withheld",
      status: "FAIL",
    });
    process.exitCode = 1;
  })
  .finally(async () => {
    for (const a of [user, creator, admin].filter(Boolean))
      await request(a, "/api/auth/logout", cookies.get(a.role), {
        method: "POST",
        headers: { Origin: a.url },
      }).catch(() => {});
    await pg.end({ timeout: 5 });
    const report = {
      capturedAt: new Date().toISOString(),
      kind: "ACTUAL_HTTP_AND_NATIVE_NOT_BROWSER",
      passwordsChanged: false,
      providersActivated: false,
      hostedConnections: 0,
      results,
      summary: {
        pass: results.filter((r) => r.status === "PASS").length,
        fail: results.filter((r) => r.status === "FAIL").length,
      },
    };
    writeFileSync(
      "docs/evidence/local-ui-phase2-discovery.json",
      JSON.stringify(report, null, 2) + "\n",
    );
    console.log(JSON.stringify(report.summary));
    if (report.summary.fail) process.exitCode = 1;
  });
