// Assemble sanitized local forensic evidence. Never opens private configuration.
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
const read = (p) => JSON.parse(readFileSync(p, "utf8"));
const prefix = "docs/evidence/creator-content-v1-";
const acceptance = read(prefix + "authorization-9-acceptance.json");
const failure = read(prefix + "hosted-execute-result.json");
const verifier = read(prefix + "hosted-verify-result.json");
const native = read(prefix + "postflight-native.json");
const preservation = read(prefix + "postflight-preservation.json");
const build = read(prefix + "postflight-build.json");
assert.equal(
  acceptance.status,
  "COMMITTED_INDEPENDENT_VERIFIER_PASS_REVIEW_REQUIRED",
);
assert.equal(failure.commitAcknowledged, true);
assert.equal(failure.stage, "independent-postflight");
assert.equal(failure.sqlState, "REDACTED");
assert.equal(verifier.status, "PASS");
assert.equal(native.status, "PASS");
assert.equal(native.scenarios.length, 16);
assert.equal(native.stoppedTargets, native.newTargets);
assert.equal(preservation.status, "PASS");
assert.equal(build.status, "PASS");
const files = [
  "scripts/creator-content-forensics/.gitattributes",
  ...[
    "native-test.ts",
    "safe-diagnostics.ts",
    "unit.test.ts",
    "preservation.mjs",
    "build-local.mjs",
    "report.mjs",
  ].map((n) => "scripts/creator-content-forensics/" + n),
  "tests/creator-content-forensics.test.ts",
];
const manifest = {
  version: 1,
  packageId: "creator-content-postflight-forensics-local-only",
  status: "DIAGNOSTIC_OBSERVERS_NOT_A_HOSTED_INSTALLER",
  historicalSourceCommit: preservation.sourceCommit,
  frozenMechanismSha256: preservation.originalMechanismSha256,
  frozenDependencyCount: 170,
  frozenDependenciesChanged: 0,
  checksumEncoding: "UTF8_LF_TEXT",
  files: files.map((path) => ({
    path,
    sha256: createHash("sha256")
      .update(readFileSync(path, "utf8").replaceAll("\r\n", "\n"))
      .digest("hex"),
  })),
  tests: { nativeScenarios: 16, automatedTests: 154 },
  hostedExecutionAuthorized: false,
};
const manifestPath =
  "scripts/creator-content-forensics/diagnostic-package-v1.json";
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
const result = {
  version: 1,
  capturedAt: new Date().toISOString(),
  classification: "C_UNRESOLVED",
  localValidation: "PASS",
  originalInstallationClassification: acceptance.status,
  historicalOutcome: {
    installerInvocations: 1,
    installerExitCode: 1,
    commitAcknowledged: true,
    stage: "independent-postflight",
    safeCode: "REDACTED",
    rollback: "NOT_NEEDED",
    automaticRetry: false,
    separateVerifierInvocations: 1,
    separateVerifierStatus: "PASS",
    catalogDiagnostic: "PASS",
    restrictedRuntimeDiagnostic: "PASS",
  },
  sqlSha256: acceptance.sqlSha256,
  mechanismSha256: acceptance.mechanismSha256,
  originalEvidencePreserved: true,
  frozenDependencyCount: 170,
  confirmedFindings: [
    "Original handler discards assertion IDs and most native driver codes",
    "Installer compares pre-install reference; standalone compares fresh post-install reference",
    "Managed relation metadata is in baseline but outside scoped checkpoint comparison",
    "Synthetic managed metadata drift reproduces REDACTED failure followed by standalone PASS",
    "Synthetic connection/factory/runtime faults can also reproduce the coarse receipt",
    "Persistent application continuity and successor catalog/grant faults remain fail-closed",
    "Plain statement timeout retains 57014 and does not alone match REDACTED",
    "Ordinary asynchronous cleanup rejection is absorbed and cannot alone explain caught failure",
  ],
  originalRootCauseEstablished: false,
  installedSqlOrSecurityDefectEstablished: false,
  frozenMechanismModified: false,
  productionCorrection: "NOT_JUSTIFIED_BY_CURRENT_EVIDENCE",
  futureDiagnostics:
    "NEW_VERSION_REVIEW_AND_SEAL_REQUIRED_BEFORE_ANY_INTEGRATION",
  diagnosticPackage: {
    path: manifestPath,
    sha256: createHash("sha256")
      .update(readFileSync(manifestPath))
      .digest("hex"),
    files: files.length,
    hostedInstaller: false,
  },
  native: {
    status: "PASS",
    postgresVersion: "17.11",
    finalScenarios: 16,
    finalNewTargets: 16,
    finalStoppedTargets: 16,
    allTaskOwnedTargetsStoppedAndRetained:
      preservation.taskOwnedFreshTargetsStoppedAndRetained,
    actualRestrictedRuntime: true,
    strictLocalTls: true,
    negativeCaAndHostnameRejected: true,
    checkpoint: "FROZEN_CONTINUITY_FUNCTION_WITH_IN_MEMORY_SYNTHETIC_CAPTURE",
    privateCmsOrHistoricalCheckpointAccessed: false,
    committedInvocationInstallationRollbackCalls: 0,
    automaticReinstall: false,
  },
  preliminaryLocalRuns: [
    {
      operation: "harness-module-setup",
      status: "FAIL",
      cause:
        "CJS top-level-await and numeric typing fixed in new harness; no native targets created",
    },
    {
      operation: "immediate-socket-loss-injection",
      status: "FAIL",
      cause:
        "Installed native driver nextWrite null-socket uncaught error; no frozen failure receipt produced",
      targets: 5,
      stoppedAndRetained: true,
      change:
        "New harness waits for socket-close event; frozen driver/mechanism unchanged",
      originalRootCauseEvidence: false,
    },
    {
      operation: "checkpoint-fixture-shape",
      status: "FAIL",
      cause:
        "Initial simplified TestUsers fixture lacked documented unique constraint; corrected fresh synthetic fixture only",
      targets: 1,
      stoppedAndRetained: true,
    },
    {
      operation: "first-complete-native-run",
      status: "PASS",
      scenarios: 16,
      targets: 16,
      stoppedAndRetained: true,
    },
    {
      operation: "final-native-run",
      status: "PASS",
      scenarios: 16,
      targets: 16,
      stoppedAndRetained: true,
    },
    {
      operation: "Next-route-types-sandbox",
      status: "FAIL_THEN_PASS",
      cause:
        "Windows sandbox canonicalization denied; permitted local validation passed",
    },
    {
      operation: "lint-new-build-helper",
      status: "FAIL_THEN_PASS",
      cause: "Converted new helper to ESM; frozen code untouched",
    },
  ],
  validation: {
    automated: { pass: 154, fail: 0, skip: 0 },
    finalFocused: { pass: 4, fail: 0 },
    lint: "PASS",
    typecheck: "PASS",
    productionBuild: "PASS",
    runtimeAudit: { status: "PASS", vulnerabilities: 0 },
    frozenHashes: "PASS",
  },
  limitations: [
    "No original underlying assertion, cause, substage or baseline-difference receipt survives",
    "Synthetic possibilities do not establish the historical hosted condition",
    "Local 17.11/libc-C differs from historical hosted 17.6/ICU-en-US",
    "Private CMS/checkpoints/historical targets were not accessed or revalidated in this task",
    "Existing v4b checkpoint covers 29-table predecessor, not 45-table installed successor",
  ],
  futureReadOnlyHostedDiagnostic:
    "OPTIONAL_SEPARATE_OWNER_AUTHORIZATION_REQUIRED; cannot reconstruct erased error without contemporaneous logs",
  localV4cPreparation:
    "OWNER_REVIEW_AND_EXPLICIT_RISK_ACCEPTANCE_REQUIRED; NOT_STARTED",
  boundaries: {
    hostedConnections: 0,
    hostedQueries: 0,
    hostedWrites: 0,
    hostedInstallations: 0,
    recoveryOperations: 0,
    historicalArtifactsAccessed: false,
    accountsCreated: 0,
    providerActivation: false,
    featureChanges: false,
    dnsOrDeploymentChanges: false,
  },
};
writeFileSync(
  prefix + "postflight-diagnosis.json",
  JSON.stringify(result, null, 2) + "\n",
);
console.log(
  JSON.stringify({
    classification: result.classification,
    diagnosticPackageSha256: result.diagnosticPackage.sha256,
    files: files.length,
    hostedConnections: 0,
  }),
);
