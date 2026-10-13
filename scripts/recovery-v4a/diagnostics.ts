// Public diagnostics are constructed from closed identifiers, never error text.
export const exportOperations = [
  "snapshot-export",
  "native-dump",
  "archive-bounds",
  "archive-header",
  "archive-toc",
  "archive-schema",
  "archive-allowlist",
  "snapshot-integrity",
  "archive-encrypt",
  "metadata-bounds",
  "metadata-encrypt",
  "ciphertext-hashes",
  "metadata-decrypt",
  "archive-decrypt",
  "archive-integrity",
  "local-prerequisites",
  "native-restore",
  "permissions-replay",
  "restore-integrity",
  "restored-role-contract",
  "fresh-source-continuity",
  "retention-integrity",
  "local-shutdown",
  "receipt-persist",
] as const;
export type ExportOperation = (typeof exportOperations)[number];
export type ProcessCategory =
  | "timeout"
  | "buffer-limit"
  | "spawn-failed"
  | "nonzero-exit"
  | "unexpected-stderr";
export type SafeRecoveryDiagnostic = {
  operation: ExportOperation | "outside-export";
  assertionId: string;
  category: "validation" | "postgres" | ProcessCategory;
  sqlState?: string;
};
const sqlStates = new Set([
  "42501",
  "57014",
  "08006",
  "08001",
  "28P01",
  "25006",
  "42P01",
  "3F000",
  "55000",
  "40001",
  "40P01",
  "53100",
  "53200",
]);
const processCategories = new Set<ProcessCategory>([
  "timeout",
  "buffer-limit",
  "spawn-failed",
  "nonzero-exit",
  "unexpected-stderr",
]);
export class NativeRecoveryFailure extends Error {
  constructor(readonly category: ProcessCategory) {
    super("Native recovery failed; protected details withheld");
  }
}
export class RecoveryOperationFailure extends Error {
  constructor(readonly diagnostic: SafeRecoveryDiagnostic) {
    super("Recovery operation failed; protected details withheld");
  }
}
export function safeRecoveryDiagnostic(
  error: unknown,
  operation: ExportOperation | "outside-export" = "outside-export",
): SafeRecoveryDiagnostic {
  // Rebuild a bounded object; never serialize the exception/cause/assertion values.
  if (error instanceof RecoveryOperationFailure) {
    const d = error.diagnostic;
    const op = exportOperations.includes(d.operation as ExportOperation)
      ? d.operation
      : "outside-export";
    const category =
      processCategories.has(d.category as ProcessCategory) ||
      d.category === "postgres"
        ? d.category
        : "validation";
    return {
      operation: op,
      assertionId: `${op}.failed`,
      category,
      ...(category === "postgres" && sqlStates.has(d.sqlState || "")
        ? { sqlState: d.sqlState }
        : {}),
    };
  }
  const code =
    error && typeof error === "object" && "code" in error
      ? error.code
      : undefined;
  const category =
    error instanceof NativeRecoveryFailure &&
    processCategories.has(error.category)
      ? error.category
      : typeof code === "string" && sqlStates.has(code)
        ? "postgres"
        : "validation";
  return {
    operation,
    assertionId: `${operation}.failed`,
    category,
    ...(category === "postgres" ? { sqlState: String(code) } : {}),
  };
}
export async function recoveryOperation<T>(
  operation: ExportOperation,
  work: () => T | Promise<T>,
  observe?: (operation: ExportOperation, state: "start" | "pass") => void,
): Promise<T> {
  try {
    observe?.(operation, "start");
    const result = await work();
    observe?.(operation, "pass");
    return result;
  } catch (error) {
    throw new RecoveryOperationFailure(
      safeRecoveryDiagnostic(error, operation),
    );
  }
}
export function assertNativeResult(result: {
  status: number | null;
  error?: Error & { code?: string };
  stderr?: Buffer | string | null;
}) {
  if (result.error)
    throw new NativeRecoveryFailure(
      result.error.code === "ETIMEDOUT"
        ? "timeout"
        : result.error.code === "ENOBUFS"
          ? "buffer-limit"
          : "spawn-failed",
    );
  if (result.status !== 0) throw new NativeRecoveryFailure("nonzero-exit");
  if (result.stderr?.length)
    throw new NativeRecoveryFailure("unexpected-stderr");
}
