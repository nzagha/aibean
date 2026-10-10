import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { JSDOM } from "jsdom";
import { AdminToolFields } from "../src/components/admin-tool-fields";
import {
  AdminPages,
  ReasonField,
  ReviewGate,
} from "../src/components/admin-shared";
import { adminFixtureInput } from "./fixtures/admin-workflow-contract";
import { initialTool, refreshAfterCommit } from "../src/lib/admin/contracts";
import { normalizeAdminParams, adminFilters } from "../src/lib/admin/queries";
Object.assign(globalThis, { React });
test("Post-commit cache failure reports a saved change rather than claiming rollback", () => {
  const result = refreshAfterCommit(
    { message: "Draft saved.", href: "/admin/tools/synthetic" },
    () => {
      throw new Error("Synthetic cache failure");
    },
  );
  assert.match(result.message, /Draft saved/);
  assert.match(result.message, /do not repeat/);
  assert.equal(result.href, "/admin/tools/synthetic");
  assert.equal("error" in result, false);
});
test("Admin editor preserves structured fields and labels without accepting privileged flags", () => {
  const tool = initialTool("synthetic", adminFixtureInput);
  const doc = new JSDOM(
    renderToStaticMarkup(React.createElement(AdminToolFields, { tool })),
  ).window.document;
  for (const control of doc.querySelectorAll("input,select,textarea"))
    assert.ok(
      control.closest("label"),
      control.getAttribute("name") || "field",
    );
  assert.equal(
    doc.querySelector("input[name=name]")?.getAttribute("value"),
    tool.name,
  );
  assert.equal(
    doc.querySelector("textarea[name=features]")?.textContent,
    "Synthetic feature",
  );
  assert.equal(doc.querySelector("input[name=isAdmin]"), null);
  assert.equal(doc.querySelector("input[name=verified]"), null);
  assert.equal(doc.querySelectorAll("details").length, 2);
});
test("Admin pagination keeps filters, encodes values and offers only existing result pages", () => {
  const doc = new JSDOM(
    renderToStaticMarkup(
      React.createElement(AdminPages, {
        base: "/admin/tools",
        total: 42,
        params: { q: "safe & filter", status: "draft" },
        page: 2,
      }),
    ),
  ).window.document;
  const links = Array.from(doc.querySelectorAll("a"));
  assert.equal(links.length, 2);
  for (const a of links) {
    const u = new URL(a.href, "https://example.invalid");
    assert.equal(u.searchParams.get("q"), "safe & filter");
    assert.equal(u.searchParams.get("status"), "draft");
  }
  const last = new JSDOM(
    renderToStaticMarkup(
      React.createElement(AdminPages, {
        base: "/admin/tools",
        total: 42,
        params: {},
        page: 3,
      }),
    ),
  ).window.document;
  assert.equal(last.querySelectorAll("a").length, 1);
});
test("Admin unavailable operations offer no submit controls; malformed repeated filters are bounded", () => {
  const doc = new JSDOM(renderToStaticMarkup(React.createElement(ReviewGate)))
    .window.document;
  assert.equal(doc.querySelector("form,button"), null);
  assert.match(doc.body.textContent!, /separately reviewed/);
  const malformed = {
    q: ["one", "two"],
    page: "Infinity",
    sort: "injection",
  } as unknown as Parameters<typeof adminFilters>[0];
  assert.deepEqual(normalizeAdminParams(malformed), {
    page: "Infinity",
    sort: "injection",
  });
  assert.equal(adminFilters(malformed).page, 1);
  assert.equal(adminFilters(malformed).sort, "updated");
  const reason = new JSDOM(
    renderToStaticMarkup(React.createElement(ReasonField)),
  ).window.document.querySelector("textarea")!;
  assert.equal(reason.required, true);
  assert.equal(reason.minLength, 5);
});
