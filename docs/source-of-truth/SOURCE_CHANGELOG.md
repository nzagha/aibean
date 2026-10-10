# Source authority change log

## 2026-10-10 — Admin milestone registration

Registered the owner's expected v1 workbook and v0.3 Master Plan hashes in `SOURCE_MANIFEST.json`. `aiBean_Source_Files_Git_Import.zip` was not found in the accessible local workspace, including ignored/hidden file inventory. Neither original binary was imported or independently verified. This is the specific source-import blocker; Admin development continues against approved repository requirements.

The existing taxonomy JSON declares the exact supplied v1 source checksum. This declaration is provenance, not a new verification of the original binary. No later v1.1 binary is available in the workspace; its reconciliation remains pending. No taxonomy IDs or source descriptions were replaced.

Master Plan v0.3 includes Playbooks. Owner-approved Supabase Auth supersedes its old Clerk recommendation; public browsing remains permitted and excluded modules remain excluded. Active owner directives and `AGENTS.md` govern implementation where source documents have been amended.

`scripts/import-source-files.ps1` provides a bounded import of only the two named entries, verifies byte-level hashes before copying, preserves already-correct originals, and records verified status. It does not extract arbitrary archive entries. Run it when the original ZIP is present; do not use reconstructed or resaved documents to satisfy the expected hashes.

Future amendments must name source/version, checksum, owner authority and effective scope. Keep prior binaries and this historical entry unchanged.

## 2026-10-10 — Original import

Both owner-specified original binaries passed exact SHA-256 verification and were imported unchanged, preserving the archive's docs/source-of-truth/ relative paths. Active taxonomy was not replaced. Supabase Auth remains the owner-approved identity direction. Neither this import nor historical v1 provenance supersedes a later approved v1.1 package.
