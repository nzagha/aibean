import assert from "node:assert/strict";
import { test } from "node:test";
import {
  assertNativeResult,
  exportOperations,
  recoveryOperation,
  safeRecoveryDiagnostic,
  RecoveryOperationFailure,
} from "../scripts/recovery-diagnostics";
import { pgEnvironment } from "../scripts/execute-expanded-recovery";

test("recovery diagnostics never serialize private messages, paths, values, stacks or assertion payloads", async () => {
  const secret = "synthetic-private-record-password-path-environment";
  for (const error of [
    new Error(secret),
    {
      code: secret,
      message: secret,
      actual: secret,
      expected: secret,
      cause: { message: secret },
    },
    { code: "42501", detail: secret },
  ]) {
    await assert.rejects(
      recoveryOperation("archive-allowlist", () => {
        throw error;
      }),
      (caught) => {
        const d = safeRecoveryDiagnostic(caught);
        assert.equal(d.operation, "archive-allowlist");
        assert.equal(d.assertionId, "archive-allowlist.failed");
        assert(!JSON.stringify(d).includes(secret));
        assert(Object.keys(d).length <= 4);
        if (error && "code" in error && error.code === "42501")
          assert.equal(d.sqlState, "42501");
        return true;
      },
    );
  }
  const injected = new RecoveryOperationFailure({
    operation: "outside-export",
    assertionId: secret,
    category: "validation",
  });
  assert(!JSON.stringify(safeRecoveryDiagnostic(injected)).includes(secret));
});
test("all export boundaries stop before work on injection and identify only their bounded operation", async () => {
  assert.equal(new Set(exportOperations).size, 15);
  for (const operation of exportOperations) {
    let called = false;
    await assert.rejects(
      recoveryOperation(
        operation,
        () => {
          called = true;
        },
        () => {
          throw new Error("private");
        },
      ),
      (error) => {
        assert.deepEqual(safeRecoveryDiagnostic(error), {
          operation,
          assertionId: `${operation}.failed`,
          category: "validation",
        });
        return true;
      },
    );
    assert.equal(called, false);
  }
});
test("native process diagnostics keep nonzero exits, warnings, timeouts and buffer overflow fail-closed", () => {
  for (const [result, category] of [
    [{ status: 1, stderr: "private" }, "nonzero-exit"],
    [{ status: 0, stderr: "private warning" }, "unexpected-stderr"],
    [
      {
        status: null,
        error: Object.assign(new Error("private"), { code: "ETIMEDOUT" }),
      },
      "timeout",
    ],
    [
      {
        status: null,
        error: Object.assign(new Error("private"), { code: "ENOBUFS" }),
      },
      "buffer-limit",
    ],
    [
      {
        status: null,
        error: Object.assign(new Error("private"), { code: "ENOENT" }),
      },
      "spawn-failed",
    ],
  ] as const)
    assert.throws(
      () => assertNativeResult(result),
      (error) => safeRecoveryDiagnostic(error).category === category,
    );
  assert.doesNotThrow(() =>
    assertNativeResult({ status: 0, stderr: Buffer.alloc(0) }),
  );
});
test("native export environment overrides inherited PostgreSQL settings and preserves strict source read-only TLS", () => {
  const env = pgEnvironment(
    "127.0.0.1",
    54321,
    "postgres",
    "synthetic",
    "synthetic-ca",
    true,
  );
  assert.equal(env.PGSSLMODE, "verify-full");
  assert.equal(env.PGDATABASE, "postgres");
  assert.equal(env.PGCONNECT_TIMEOUT, "10");
  assert.equal(env.PGCLIENTENCODING, "UTF8");
  assert.match(env.PGOPTIONS, /default_transaction_read_only=on/);
  assert.match(env.PGOPTIONS, /statement_timeout=60000/);
  assert.match(env.PGOPTIONS, /lock_timeout=5000/);
  assert(!("DATABASE_URL" in env));
  assert(!("PGSERVICE" in env));
  assert(!("PGSSLKEY" in env));
});
