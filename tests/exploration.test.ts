import test from "node:test";
import assert from "node:assert/strict";
import {
  EMPTY_EXPLORATION,
  parseExploration,
  inspectNode,
  explorationProgress,
} from "../src/lib/exploration";
import { parseFilterPreferences } from "../src/lib/filter-preferences";

test("exploration starts at 20, rewards only distinct inspections, and stops at 100", () => {
  let state = EMPTY_EXPLORATION;
  assert.equal(explorationProgress(state), 20);
  state = inspectNode(state, "tool:demo-draft");
  assert.equal(explorationProgress(state), 30);
  state = inspectNode(state, "tool:demo-draft");
  assert.equal(explorationProgress(state), 30);
  for (let i = 0; i < 20; i++) state = inspectNode(state, `category:${i}`);
  assert.equal(explorationProgress(state), 100);
});
test("stored exploration is sanitized and bounded without trusting arbitrary data", () => {
  assert.deepEqual(parseExploration(null), EMPTY_EXPLORATION);
  assert.deepEqual(
    parseExploration({
      inspected: ["tool:one", "tool:one", 4, "<script>"],
      expanded: ["tool:one:detail-0"],
    }),
    { inspected: ["tool:one"], expanded: ["tool:one:detail-0"] },
  );
  assert.equal(
    parseExploration({
      inspected: Array.from({ length: 500 }, (_, i) => `tool:${i}`),
    }).inspected.length,
    200,
  );
});
test("filter preferences preserve structured choices without storing search text or arbitrary fields", () => {
  assert.deepEqual(
    parseFilterPreferences({
      filters: {
        q: "personal search",
        category: "CAT-02",
        free: "true",
        secret: "private",
      },
      expanded: true,
    }),
    { filters: { category: "CAT-02", free: "true" }, expanded: true },
  );
});
