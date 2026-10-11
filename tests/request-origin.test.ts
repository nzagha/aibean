import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { requestOrigin, isSameOrigin } from "../src/lib/request-origin";
test("NextURL loopback normalization preserves actual Host for local POSTs and redirects", () => {
  const request = new NextRequest("http://127.0.0.1:45123/api/auth/login", {
    headers: { host: "127.0.0.1:45123", origin: "http://127.0.0.1:45123" },
  });
  assert.equal(request.nextUrl.hostname, "localhost");
  assert.equal(requestOrigin(request), "http://127.0.0.1:45123");
  assert.equal(isSameOrigin(request), true);
});
test("origin check rejects cross-origin, missing origin, malformed Host and spoofed forwarded hosts", () => {
  assert.throws(() =>
    requestOrigin(
      new Request("http://evil.invalid/", {
        headers: { host: "evil.invalid" },
      }),
      "https://aibean.io",
    ),
  );
  for (const origin of ["http://evil.invalid", "null", ""]) {
    const request = new Request("http://localhost:45123/api/auth/login", {
      headers: {
        host: "127.0.0.1:45123",
        origin,
        "x-forwarded-host": "evil.invalid",
      },
    });
    assert.equal(isSameOrigin(request), false);
    assert.equal(requestOrigin(request), "http://127.0.0.1:45123");
  }
  for (const host of [
    "good.invalid@evil.invalid",
    "good.invalid/path",
    "good.invalid\\evil.invalid",
  ])
    assert.equal(
      isSameOrigin(
        new Request("http://localhost/", {
          headers: { host, origin: "http://evil.invalid" },
        }),
      ),
      false,
    );
  assert.equal(
    requestOrigin(
      new Request("http://aibean.io/", { headers: { host: "aibean.io" } }),
      "https://aibean.io",
    ),
    "https://aibean.io",
  );
});
