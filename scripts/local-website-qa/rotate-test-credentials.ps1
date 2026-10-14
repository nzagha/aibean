param([switch]$ConfirmRotation)
$ErrorActionPreference='Stop'
if (-not $ConfirmRotation) {throw 'This changes all four local fixture passwords and revokes their sessions. Re-run with -ConfirmRotation only when deliberately rotating. Normal restart does not require it.'}
node.exe node_modules/tsx/dist/cli.mjs scripts/local-website-qa/account-v2/rotate-credentials.ts --confirm-local-rotation
exit $LASTEXITCODE
