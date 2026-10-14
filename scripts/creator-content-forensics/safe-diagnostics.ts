// New local-only observer. It never changes an assertion or queries a database.
import assert from "node:assert/strict";
export const coveredPaths = [
  "foundation.foundation.catalog",
  "foundation.foundation.counts",
  "foundation.foundation.sequenceState",
  "foundation.foundation.ledgers",
  "foundation.foundation.security",
  "foundation.foundation.content",
  "foundation.foundation.originalTestUsersDigest",
  "foundation.foundation.accounts",
  "foundation.foundation.roles",
  "foundation.predecessor.catalog",
  "foundation.predecessor.data",
  "predecessor.catalog",
  "predecessor.data",
] as const;
export const referencePaths = [
  ...coveredPaths,
  "foundation.foundation.managed",
] as const;
const valueAt = (v: unknown, path: string): unknown =>
  path
    .split(".")
    .reduce(
      (v, k) =>
        v && typeof v === "object"
          ? (v as Record<string, unknown>)[k]
          : undefined,
      v,
    );
export function changedComponents(before: unknown, after: unknown) {
  return referencePaths.filter(
    (p) =>
      JSON.stringify(valueAt(before, p)) !== JSON.stringify(valueAt(after, p)),
  );
}
// Synthetic analogue of the private application checkpoint boundary. Managed
// catalog metadata is compared by the installer baseline, not the v4b snapshot.
export function assertSyntheticCheckpoint(before: unknown, after: unknown) {
  assert(
    coveredPaths.every(
      (p) =>
        JSON.stringify(valueAt(before, p)) ===
        JSON.stringify(valueAt(after, p)),
    ),
    "Synthetic checkpoint continuity differs",
  );
}
const allowedCodes = new Set([
  "ERR_ASSERTION",
  "42501",
  "P0001",
  "42P07",
  "42P01",
  "55P03",
  "57014",
  "57P01",
  "40001",
  "23505",
  "23503",
  "23514",
  "08006",
  "08001",
  "25P03",
  "25P04",
  "28P01",
  "53300",
  "CONNECT_TIMEOUT",
  "CONNECTION_CLOSED",
  "CONNECTION_ENDED",
  "CONNECTION_DESTROYED",
  "ECONNRESET",
  "ECONNREFUSED",
  "ETIMEDOUT",
]);
const allowedOperations = new Set([
  "CLIENT_CREATION",
  "CLIENT_FACTORY",
  "PREFLIGHT_BASELINE",
  "BASELINE_READ",
  "QUERY",
  "CONNECT",
  "SESSION_PID_PROBE",
  "OPERATOR_IDENTITY",
  "RUNTIME_IDENTITY",
  "EFFECTIVE_GRANTS",
  "PRIVATE_INTEGRITY_OR_MANAGED_METADATA",
  "CONSTRAINT_CATALOG",
  "INDEX_CATALOG",
  "RLS_POLICY_CATALOG",
  "RELATION_CATALOG",
  "CONTENT_LEDGER",
  "RUNTIME_EMPTY_SELECT",
  "AGGREGATE_COUNTS",
  "OTHER_REVIEWED_QUERY",
  "EXACT_REVIEWED_SQL",
  "native-tools",
  "clean",
  "managed-reference-drift",
  "baseline-before",
  "baseline-after",
  "connection-loss",
  "operator-timeout",
  "runtime-timeout",
  "statement-timeout",
  "idle-timeout",
  "catalog-mismatch",
  "grant-mismatch",
  "rollback",
  "cleanup-rejection",
  "factory-error",
  "runtime-identity",
  "concurrent",
]);
export type SafeDiagnostic = {
  operation: string;
  category: string;
  safeCode: string;
  assertionId: string | null;
};
export function diagnostic(operation: string, error: unknown): SafeDiagnostic {
  const e =
    error && typeof error === "object"
      ? (error as { code?: unknown; stack?: unknown })
      : {};
  const code = String(e.code ?? "");
  const stack = String(e.stack ?? ""); // Never serialize this string or assertion values.
  const assertionId =
    code === "ERR_ASSERTION"
      ? /at compareBaseline\s/.test(stack)
        ? "BASELINE_COMPARISON"
        : /at verifyStructure\s/.test(stack)
          ? "INSTALLED_STRUCTURE_ASSERTION"
          : /at effectivePermissions\s/.test(stack)
            ? "EFFECTIVE_PERMISSION_ASSERTION"
            : /at identity\s/.test(stack)
              ? "IDENTITY_ASSERTION"
              : /at inventory\s/.test(stack)
                ? "SCOPE_ASSERTION"
                : /at expandedMetadataPreflight\s/.test(stack)
                  ? "CHECKPOINT_METADATA_ASSERTION"
                  : operation === "RUNTIME_IDENTITY"
                    ? "RUNTIME_ROLE_TLS_ASSERTION"
                    : "UNLOCATED_ASSERTION"
      : null;
  return {
    operation: allowedOperations.has(operation)
      ? operation
      : "UNKNOWN_OPERATION",
    category:
      code === "ERR_ASSERTION"
        ? "ASSERTION"
        : /^[0-9A-Z]{5}$/.test(code) && allowedCodes.has(code)
          ? "POSTGRES_SQLSTATE"
          : allowedCodes.has(code)
            ? "TRANSPORT_OR_DRIVER"
            : "REDACTED",
    safeCode: allowedCodes.has(code) ? code : "REDACTED",
    assertionId,
  };
}
export function queryOperation(s: string) {
  if (s.includes("pg_backend_pid() AS pid")) return "SESSION_PID_PROBE";
  if (s.includes("current_database() AS database")) return "OPERATOR_IDENTITY";
  if (s.includes("current_user AS role")) return "RUNTIME_IDENTITY";
  if (s.includes("has_table_privilege")) return "EFFECTIVE_GRANTS";
  if (s.includes("AS digest")) return "PRIVATE_INTEGRITY_OR_MANAGED_METADATA";
  if (s.includes("pg_constraint")) return "CONSTRAINT_CATALOG";
  if (s.includes("pg_index")) return "INDEX_CATALOG";
  if (s.includes("pg_policies")) return "RLS_POLICY_CATALOG";
  if (s.includes("pg_class")) return "RELATION_CATALOG";
  if (s.includes("content_installations")) return "CONTENT_LEDGER";
  if (s.startsWith("SELECT 1 FROM public.")) return "RUNTIME_EMPTY_SELECT";
  if (s.includes("count(*)")) return "AGGREGATE_COUNTS";
  return "OTHER_REVIEWED_QUERY";
}
