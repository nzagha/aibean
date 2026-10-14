import { test } from "node:test";
import assert from "node:assert/strict";
import {
  privateChildEnvironment,
  assertQaOrigin,
  qaPorts,
  qaCredentialPath,
} from "../scripts/local-website-qa/guards";
test("Local QA copies only OS bindings and blanks every owner environment key", () => {
  const env = privateChildEnvironment(
    {
      PATH: "os-path",
      DATABASE_URL: "hosted-secret",
      STRIPE_SECRET_KEY: "provider-secret",
      UNRELATED_SECRET: "private",
      NODE_ENV: "production",
    },
    ["DATABASE_URL", "STRIPE_SECRET_KEY", "NEXT_PUBLIC_SUPABASE_URL"],
  );
  assert.equal(env.PATH, "os-path");
  assert.equal(env.NODE_ENV, "development");
  assert.equal(env.DATABASE_URL, "");
  assert.equal(env.NEXT_PUBLIC_SUPABASE_URL, "");
  assert.equal(env.STRIPE_SECRET_KEY, "");
  assert.equal(env.UNRELATED_SECRET, undefined);
});
test("Private QA handoff cannot select an arbitrary file or omit Windows local storage", () => {
  assert.throws(() => qaCredentialPath("../private"));
  const previous = process.env.LOCALAPPDATA;
  try {
    delete process.env.LOCALAPPDATA;
    assert.throws(() => qaCredentialPath("a".repeat(32)));
    process.env.LOCALAPPDATA = "private-local-appdata";
    assert(qaCredentialPath("a".repeat(32)).endsWith("credentials.json"));
    assert(!qaCredentialPath("a".repeat(32)).includes("test-results"));
  } finally {
    if (previous === undefined) delete process.env.LOCALAPPDATA;
    else process.env.LOCALAPPDATA = previous;
  }
});
test("QA origins reject hosted, non-loopback, credentialed and unrelated endpoints", () => {
  for (const port of Object.values(qaPorts))
    assert.equal(
      assertQaOrigin("http://127.0.0.1:" + port),
      "http://127.0.0.1:" + port,
    );
  for (const value of [
    "https://yfknxidgphhepdtwazhn.supabase.co",
    "http://localhost:3000",
    "http://127.0.0.1:5432",
    "http://user:private@127.0.0.1:3000",
    "http://127.0.0.1:3000/private",
    "http://127.0.0.1:3000/?token=private",
  ])
    assert.throws(() => assertQaOrigin(value));
});
