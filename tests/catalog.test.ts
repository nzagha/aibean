import test from "node:test";
import assert from "node:assert/strict";
import { demoTools } from "../src/data/demo-tools";
import {
  filterTools,
  updateComparison,
  safeReturnPath,
} from "../src/lib/catalog/filter";
import { taxonomy } from "../src/lib/catalog/taxonomy";
import { calculateToolScore } from "../src/lib/ranking";
import { safeWebUrl, reviewInput } from "../src/lib/validation";
test("taxonomy preserves counts, unique IDs and valid category references", () => {
  assert.equal(taxonomy.categories.length, 25);
  assert.equal(
    taxonomy.categories.reduce((s, c) => s + c.subcategories.length, 0),
    202,
  );
  assert.equal(taxonomy.industries.length, 18);
  assert.equal(taxonomy.useCases.length, 40);
  assert.equal(taxonomy.listingTypes.length, 16);
  for (const i of taxonomy.industries)
    for (const id of i.categoryIds)
      assert.ok(
        taxonomy.categories.some((c) => c.id === id),
        `${i.id} -> ${id}`,
      );
});
test("combined category, pricing and search filters return only matching tools", () => {
  assert.deepEqual(
    filterTools(demoTools, {
      category: "CAT-02",
      free: "true",
      q: "draft",
    }).map((t) => t.slug),
    ["draft-studio"],
  );
  assert.equal(
    filterTools(demoTools, { category: "CAT-02", pricing: "paid" }).length,
    0,
  );
});
test("industry discovery excludes general and suggested fits", () => {
  const t = {
    ...demoTools[0],
    industries: [{ id: "VER-09", fit: "general" as const, relevance: 100 }],
  };
  assert.equal(filterTools([t], { industry: "VER-09" }).length, 0);
  assert.equal(
    filterTools(demoTools, { industry: "VER-09" })[0].slug,
    "property-notes",
  );
});
test("unknown dates, future dates, and no reviews cannot pass trust filters", () => {
  assert.equal(filterTools(demoTools, { recency: "30" }).length, 0);
  assert.equal(filterTools(demoTools, { rating: "3" }).length, 0);
  assert.equal(filterTools(demoTools, { verified: "true" }).length, 0);
  const t = { ...demoTools[0], lastVerified: "2026-10-06T00:00:00Z" };
  assert.equal(
    filterTools([t], { recency: "30" }, Date.parse("2026-10-05")).length,
    0,
  );
});
test("comparison caps at four, removes selections, and deduplicates", () => {
  assert.deepEqual(updateComparison(["a", "b", "c", "d"], "e"), [
    "a",
    "b",
    "c",
    "d",
  ]);
  assert.deepEqual(updateComparison(["a", "b"], "a"), ["b"]);
  assert.deepEqual(updateComparison(["a", "a"], "b"), ["a", "b"]);
});
test("ranking ignores monetary and ownership fields", () => {
  const input = {
    editorial: 50,
    context: 50,
    verification: 50,
    completeness: 50,
    freshness: 50,
    reviews: 50,
    popularity: 50,
    engagement: 50,
    risk: 0,
    adjustment: 0,
  };
  assert.equal(calculateToolScore(input).score, 50);
  assert.deepEqual(
    calculateToolScore({
      ...input,
      paidClaim: true,
      subscription: 999,
    } as typeof input),
    calculateToolScore(input),
  );
});
test("rejects unsafe redirects, unsafe protocols, and invalid reviews", () => {
  for (const url of [
    "https://evil.test",
    "//evil.test",
    "/\\evil.test",
    "javascript:alert(1)",
  ])
    assert.equal(safeReturnPath(url), "/account");
  assert.equal(safeReturnPath("/tools/draft-studio"), "/tools/draft-studio");
  assert.equal(safeWebUrl.safeParse("javascript:alert(1)").success, false);
  assert.equal(
    safeWebUrl.safeParse("https://user:secret@example.com").success,
    false,
  );
  assert.equal(
    reviewInput.safeParse({
      toolId: "a",
      rating: 6,
      body: "This is a sufficiently long review.",
    }).success,
    false,
  );
});
