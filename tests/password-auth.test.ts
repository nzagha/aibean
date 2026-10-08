import test from "node:test";
import assert from "node:assert/strict";
import { validPassword } from "../src/lib/password-policy";
import {
  hashPassword,
  verifyPassword,
  passwordAccountId,
  signPasswordSession,
  verifyPasswordSession,
  SESSION_SECONDS,
} from "../src/lib/password-crypto";

test("password policy requires length, uppercase, number, and a special character", async () => {
  assert.equal(validPassword("Valid!42"), true);
  for (const value of [
    "Ab!1",
    "lowercase!42",
    "Uppercase!",
    "NoSymbol42",
    "Upper42 ",
    "A!1".repeat(50),
  ])
    assert.equal(validPassword(value), false);
  await assert.rejects(hashPassword("weak"));
});
test("passwords use randomized salts and reject incorrect or malformed credentials", async () => {
  const first = await hashPassword("Valid!42");
  const second = await hashPassword("Valid!42");
  assert.notEqual(first, second);
  assert.equal(await verifyPassword("Valid!42", first), true);
  assert.equal(await verifyPassword("Wrong!42", first), false);
  assert.equal(await verifyPassword("Valid!42", "malformed"), false);
});
test("password sessions reject forgery, expiration, identity changes and rotated credentials", async () => {
  const id = passwordAccountId(" TEST@example.com ");
  assert.equal(id, passwordAccountId("test@example.com"));
  const secret = "a".repeat(96);
  const hash = await hashPassword("Valid!42");
  const now = 1_800_000_000_000;
  const token = signPasswordSession(id, secret, hash, now);
  assert.equal(verifyPasswordSession(token, id, secret, hash, now), true);
  assert.equal(
    verifyPasswordSession(token + "x", id, secret, hash, now),
    false,
  );
  assert.equal(
    verifyPasswordSession(token, "another-account", secret, hash, now),
    false,
  );
  assert.equal(
    verifyPasswordSession(token, id, "b".repeat(96), hash, now),
    false,
  );
  assert.equal(
    verifyPasswordSession(
      token,
      id,
      secret,
      await hashPassword("Changed!42"),
      now,
    ),
    false,
  );
  assert.equal(
    verifyPasswordSession(
      token,
      id,
      secret,
      hash,
      now + SESSION_SECONDS * 1000,
    ),
    false,
  );
  assert.equal(
    verifyPasswordSession("not-a-session", id, secret, hash, now),
    false,
  );
});
