$ErrorActionPreference='Stop'
$workspace=(Get-Location).Path
if (Test-Path .\test-results\local-website-qa-active.json) {
  $taskPrevious=Get-Content .\test-results\local-website-qa-active.json -Raw | ConvertFrom-Json
  if ($taskPrevious.authVersion -eq 2) {
    Write-Output 'Resuming the existing account-testing database and credentials; no new fixture will be created.'
    & powershell.exe -NoProfile -File scripts/local-website-qa/start-account-testing.ps1 -LeaseHours 8
    exit $LASTEXITCODE
  }
}
if (-not (Test-Path -LiteralPath (Join-Path $workspace 'package.json')) -or -not (Test-Path -LiteralPath (Join-Path $workspace 'scripts\local-website-qa\start.ts'))) {throw 'Run from the aiBean repository root'}
$env:PG_TEST_BIN=Join-Path $workspace 'test-results\postgres-validation\portable\pgsql\bin'
$env:PG_TEST_OPENSSL='C:\Program Files\Git\usr\bin\openssl.exe'
if (-not (Test-Path -LiteralPath (Join-Path $env:PG_TEST_BIN 'postgres.exe')) -or -not (Test-Path -LiteralPath $env:PG_TEST_OPENSSL)) {throw 'Existing PostgreSQL 17 / OpenSSL binaries are required'}
$logName='local-website-qa-start-'+(Get-Date -Format 'yyyyMMddHHmmssfff')
$stdout=Join-Path $workspace ('test-results\'+$logName+'.stdout.log')
$stderr=Join-Path $workspace ('test-results\'+$logName+'.stderr.log')
$process=Start-Process -FilePath (Get-Command node.exe).Source -ArgumentList @('node_modules/tsx/dist/cli.mjs','scripts/local-website-qa/start.ts') -WorkingDirectory $workspace -WindowStyle Hidden -RedirectStandardOutput $stdout -RedirectStandardError $stderr -PassThru
Write-Output ('QA launcher process: '+$process.Id)
Write-Output 'Startup is asynchronous. Inspect test-results/local-website-qa-active.json once four loopback apps are ready. Do not print credentials.json.'
