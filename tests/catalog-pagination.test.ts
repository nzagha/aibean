import test from "node:test";
import assert from "node:assert/strict";
import { catalogPage, catalogPageHref } from "../src/lib/catalog/pagination";

test("Filtered Tool pagination retains context and bounds empty, invalid and final pages", () => {
  const catalog = Array.from({ length: 45 }, (_, i) => i + 1);
  assert.deepEqual(
    catalogPage(catalog, { page: "2" }).shown,
    catalog.slice(20, 40),
  );
  const last = catalogPage(catalog, { page: "999999" });
  assert.equal(last.page, 3);
  assert.deepEqual(last.shown, [41, 42, 43, 44, 45]);
  for (const page of ["-1", "invalid", ["2", "3"]])
    assert.equal(catalogPage(catalog, { page }).page, 1);
  assert.deepEqual(catalogPage([], { page: "2" }), {
    page: 1,
    pages: 1,
    shown: [],
  });
  const url = new URL(
    catalogPageHref(
      {
        q: "AI & design",
        industry: "IND-01",
        category: "CAT-01",
        useCase: "UC-001",
        page: "1",
        excluded: ["unsafe"],
      },
      2,
    ),
    "https://example.invalid",
  );
  assert.equal(url.searchParams.get("q"), "AI & design");
  assert.equal(url.searchParams.get("industry"), "IND-01");
  assert.equal(url.searchParams.get("category"), "CAT-01");
  assert.equal(url.searchParams.get("useCase"), "UC-001");
  assert.equal(url.searchParams.get("page"), "2");
  assert.equal(url.searchParams.has("excluded"), false);
});
