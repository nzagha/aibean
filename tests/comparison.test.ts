import test from "node:test";
import assert from "node:assert/strict";
import { demoTools } from "../src/data/demo-tools";
import {
  comparisonContext,
  comparisonRanks,
  comparisonVerdict,
} from "../src/lib/catalog/comparison";
import type { Tool } from "../src/lib/catalog/types";
import { calculateToolScore } from "../src/lib/ranking";
import { weights as defaultWeights } from "../src/lib/ranking";
const now = Date.parse("2026-10-11T12:00:00Z");
function reviewed(source: Tool, id: string, editorial: number): Tool {
  const factors = {
    editorial,
    context: 80,
    verification: 30,
    completeness: 80,
    freshness: 20,
    reviews: 0,
    popularity: 0,
    engagement: 0,
    risk: 0,
    adjustment: 0,
  };
  const scored = calculateToolScore(factors, {
    weights: defaultWeights,
    version: "1",
  });
  return {
    ...source,
    id,
    name: id,
    demo: false,
    verified: true,
    lastVerified: "2026-10-10",
    organicRanking: {
      score: scored.score,
      explanation: scored.explanation,
      factors,
      weights: defaultWeights,
      version: "1",
      reviewedAt: "2026-10-10",
    },
  };
}
test("comparison context rejects unknown taxonomy and ranking does not invent scores", () => {
  assert.equal(
    comparisonContext({ category: "injected", industry: ["VER-01"] }).category,
    undefined,
  );
  const tool = { ...demoTools[0], organicRanking: undefined };
  assert.equal(
    comparisonRanks([tool], [tool], {})[0].label,
    "Not reviewed yet",
  );
});
test("comparison verdict requires verified current comparable context; payments cannot alter rank", () => {
  const a = reviewed(demoTools[0], "Higher editorial", 100),
    b = reviewed(demoTools[0], "Lower editorial", 20);
  const context = { category: a.categoryId };
  assert.match(
    comparisonVerdict([a, b], [a, b], context, now),
    /Higher editorial has the highest/,
  );
  assert.match(
    comparisonVerdict([a, b], [a, b], {}, now),
    /needs a shared context/,
  );
  for (const changed of [
    { demo: true },
    { verified: false },
    { lastVerified: "invalid" },
    { lastVerified: "2020-01-01" },
    { lastVerified: "2027-01-01" },
    { organicRanking: { ...a.organicRanking!, version: "2" } },
  ])
    assert.match(
      comparisonVerdict(
        [a, { ...b, ...changed }],
        [a, { ...b, ...changed }],
        context,
        now,
      ),
      /needs a shared context/,
    );
  assert.equal(
    comparisonRanks([a, b], [a], { category: "no-match" })[0].label,
    "Outside selected context",
  );
  assert.deepEqual(
    comparisonRanks([a, b], [a, b], context),
    comparisonRanks(
      [Object.assign({}, a, { sponsored: true, paid: 99999 }), b],
      [a, b],
      context,
    ),
  );
});
