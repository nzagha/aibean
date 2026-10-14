$ErrorActionPreference='Stop'
$workspace=(Get-Location).Path
$state=Get-Content -LiteralPath (Join-Path $workspace 'test-results\local-website-qa-active.json') -Raw | ConvertFrom-Json
if ($state.run -notmatch '^[a-f0-9]{32}$') {throw 'Invalid local QA run'}
$expected=Join-Path $workspace ('test-results\product-acceptance-'+$state.run)
if (-not [string]::Equals([IO.Path]::GetFullPath($state.root),[IO.Path]::GetFullPath($expected),[StringComparison]::OrdinalIgnoreCase)) {throw 'QA shutdown scope mismatch'}
New-Item -ItemType File -Path (Join-Path $expected 'STOP') -Force | Out-Null
Write-Output 'Requested graceful shutdown of only the active local QA fixture. The database directory is retained; no volume or historical recovery target is removed.'
