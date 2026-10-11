import test from "node:test";
import assert from "node:assert/strict";
import { creatorHandle } from "../src/lib/content/public-path";
test("public Creator and campaign routes accept literal and Next-encoded @ segments only", () => {
  assert.equal(creatorHandle("@synthetic-creator"), "synthetic-creator");
  assert.equal(creatorHandle("%40synthetic-creator"), "synthetic-creator");
  for (const input of [
    "synthetic-creator",
    "%2540synthetic-creator",
    "%40synthetic%2fadmin",
    "%40synthetic%5cadmin",
    "%40synthetic%00",
    "%not-valid",
    "@Uppercase",
    "@a",
    "@" + "a".repeat(31),
  ])
    assert.equal(creatorHandle(input), null);
});
