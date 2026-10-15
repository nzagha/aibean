// Archive only this task's uniquely named synthetic content through product
// actions. Retain every row/reference; never touch original fixture content.
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { pg, apps, cookies, login, request } from "./http-support";
import { submit, message } from "./rendered-forms";
import { passwordAccountId } from "../../../src/lib/password-crypto";
const creator = apps.find((a) => a.role === "creator")!,
  admin = apps.find((a) => a.role === "admin")!;
assert(
  process.argv.length === 2 ||
    (process.argv.length === 3 && process.argv[2] === "--events-only"),
);
async function main() {
  for (const a of [creator, admin]) await login(a);
  const start = JSON.parse(
    readFileSync("docs/evidence/local-ui-phase2-preflight.json", "utf8"),
  ).capturedAt;
  const counts: Record<string, number> = {};
  for (const [kind, table] of Object.entries({
    skills: "ai_skills",
    playbooks: "ai_playbooks",
    events: "public_events",
    resources: "creator_resources",
  })) {
    if (process.argv[2] === "--events-only" && kind !== "events") continue;
    const rows =
      await pg`select id,slug,title,status from ${pg("public." + table)} where user_id=${passwordAccountId(creator.email)} and created_at>=${start}::timestamptz and slug ~ ${"^phase2-" + kind + "-[a-f0-9]{10}$"} and status not in ('archived','canceled') order by created_at`;
    counts[kind] = 0;
    for (const row of rows) {
      assert.equal(row.title, "Phase2 " + kind + " " + row.slug.slice(-10));
      const adminPath = "/admin/content/" + kind + "/" + row.id;
      if (kind === "events")
        message(
          await submit(admin, adminPath, "Save moderation decision", {
            decision: "canceled",
            reason:
              "Cancel only this task's synthetic Event and preserve its records",
          }),
          "Editorial decision saved",
        );
      else {
        if (row.status === "draft")
          message(
            await submit(
              creator,
              "/creator/content/" + kind + "/" + row.id,
              "Submit for review",
            ),
            "Content submitted for editorial review.",
          );
        if (["draft", "pending"].includes(row.status))
          message(
            await submit(admin, adminPath, "Save moderation decision", {
              decision: "rejected",
              reason:
                "Retire only this task's synthetic test content while preserving every record",
            }),
            "Editorial decision saved",
          );
        message(
          await submit(admin, adminPath, "Save moderation decision", {
            decision: "archived",
            reason:
              "Archive only this task's synthetic content to free local QA quota",
          }),
          "Editorial decision saved",
        );
      }
      assert.equal(
        (await pg`select id from ${pg("public." + table)} where id=${row.id}`)
          .length,
        1,
      );
      counts[kind]++;
    }
  }
  const report = {
    status: "PASS",
    capturedAt: new Date().toISOString(),
    scope: "EXACT_TASK_GENERATED_SLUGS_AND_AUTHOR_AND_START_TIME",
    counts,
    recordsDeleted: 0,
    originalFixturesModified: false,
    paymentsSimulated: false,
    hostedConnections: 0,
  };
  writeFileSync(
    "docs/evidence/" +
      (process.argv[2] === "--events-only"
        ? "local-ui-phase2-event-retention.json"
        : "local-ui-phase2-test-content-retention.json"),
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(JSON.stringify(report));
}
void main()
  .catch(() => {
    console.error(
      "Task-content retirement stopped; no reset or deletion was attempted.",
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    for (const a of [creator, admin])
      await request(a, "/api/auth/logout", cookies.get(a.role), {
        method: "POST",
        headers: { Origin: a.url },
      }).catch(() => {});
    await pg.end({ timeout: 5 });
  });
