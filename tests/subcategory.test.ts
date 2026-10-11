import test from "node:test";
import assert from "node:assert/strict";
import { resolveSubcategory } from "../src/lib/catalog/subcategory";
import { taxonomy } from "../src/lib/catalog/taxonomy";
test("Historical duplicate subcategory slugs require stable IDs or an explicit approved parent", () => {
  const duplicate = "knowledge-base-assistants";
  assert.equal(resolveSubcategory(duplicate), undefined);
  const matches = taxonomy.categories.flatMap((c) =>
    c.subcategories.filter((s) => s.slug === duplicate).map((s) => ({ c, s })),
  );
  assert.equal(matches.length, 2);
  for (const { c, s } of matches) {
    assert.equal(resolveSubcategory(s.id)?.subcategory.id, s.id);
    assert.equal(resolveSubcategory(duplicate, c.id)?.subcategory.id, s.id);
    assert.equal(resolveSubcategory(s.id, "invented"), undefined);
  }
  assert.equal(resolveSubcategory("invented"), undefined);
});
