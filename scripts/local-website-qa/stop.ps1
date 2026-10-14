$ErrorActionPreference='Stop'
$workspace=(Get-Location).Path
$state=Get-Content -LiteralPath (Join-Path $workspace 'test-results\local-website-qa-active.json') -Raw | ConvertFrom-Json
if ($state.run -notmatch '^[a-f0-9]{32}$') {throw 'Invalid local QA run'}
$expected=Join-Path $workspace ('test-results\product-acceptance-'+$state.run)
if (-not [string]::Equals([IO.Path]::GetFullPath($state.root),[IO.Path]::GetFullPath($expected),[StringComparison]::OrdinalIgnoreCase)) {throw 'QA shutdown scope mismatch'}
$taskStopPath=Join-Path $expected 'STOP'
if ($state.authVersion -eq 2) {
  $taskStopPath=[IO.Path]::GetFullPath($state.stopPath)
  if (-not [string]::Equals((Split-Path $taskStopPath),[IO.Path]::GetFullPath($expected),[StringComparison]::OrdinalIgnoreCase) -or (Split-Path $taskStopPath -Leaf) -notmatch '^STOP-account-v2-[a-f0-9]{16}$') {throw 'Current QA stop marker mismatch'}
}
New-Item -ItemType File -Path $taskStopPath -Force | Out-Null
Write-Output 'Requested graceful shutdown of only the active local QA fixture. The database directory is retained; no volume or historical recovery target is removed.'
