// Narrow diagnostic: only a new synthetic Tool, normal Admin session/actions.
import { randomBytes } from "node:crypto";
import { pg, apps, login, request, cookies, page } from "./http-support";
import { submit, message, form } from "./rendered-forms";
import { taxonomy } from "../../../src/lib/catalog/taxonomy";
import { JSDOM } from "jsdom";
const a = apps.find((a) => a.role === "admin")!;
async function main() {
  await login(a);
  const slug = "phase2-probe-" + randomBytes(6).toString("hex");
  message(
    await submit(a, "/admin/tools/new", "Create draft", {
      name: "Phase2 isolated publication probe",
      slug,
      website: "https://example.invalid/probe",
      bestFor: "Local acceptance probes",
      notBestFor: "Real production usage",
      description:
        "Synthetic private Tool used only to isolate local publication behavior.",
      features: "Synthetic probe feature",
      categoryId: taxonomy.categories[0].id,
      listingTypeId: "LST-01",
      pricing: "free",
    }),
    "Draft created.",
  );
  const [t] = await pg`select id from public.tools where slug=${slug}`;
  const p = await page(a, "/admin/tools/" + t.id, cookies.get(a.role));
  const defaults = form(p.html, "Save Tool content");
  console.log(
    JSON.stringify({
      formFields: Object.keys(defaults),
      fieldTypes: Object.fromEntries(
        Object.entries(defaults).map(([k, v]) => [
          k,
          Array.isArray(v) ? "array" : "string",
        ]),
      ),
    }),
  );
  const d = new JSDOM(p.html);
  console.log(
    JSON.stringify({
      streamedSegments: d.window.document.querySelectorAll(
        'div[hidden][id^="S:"]',
      ).length,
      controls: Array.from(d.window.document.querySelectorAll("select")).map(
        (e) => ({
          name: e.name,
          associatedForm: !!e.form,
          parentTag: e.parentElement?.tagName,
        }),
      ),
    }),
  );
  d.window.close();
  message(
    await submit(a, "/admin/tools/" + t.id, "Save Tool content", {
      description:
        "Updated synthetic private Tool used only to isolate local publication behavior.",
      reason: "Phase2 isolated diagnostic correction",
    }),
    "Tool content saved.",
  );
  message(
    await submit(a, "/admin/tools/" + t.id, "Update publication", {
      status: "published",
      reason: "Phase2 isolated diagnostic publication",
    }),
    "Publication status updated",
  );
  console.log("PASS: isolated native Admin edit and publication probe");
}
void main()
  .catch(() => {
    console.error(
      "Admin probe failed; inspect bounded public feedback evidence, never raw payloads.",
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await request(a, "/api/auth/logout", cookies.get(a.role), {
      method: "POST",
      headers: { Origin: a.url },
    }).catch(() => {});
    await pg.end({ timeout: 5 });
  });
