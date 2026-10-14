param([ValidateRange(1,12)][int]$LeaseHours=8)
$ErrorActionPreference='Stop'
$workspace=(Get-Location).Path
if (-not (Test-Path -LiteralPath (Join-Path $workspace 'scripts\local-website-qa\account-v2\serve.ts'))) {throw 'Run from the aiBean repository root'}
$taskLogRoot=Join-Path $env:LOCALAPPDATA 'aiBean\local-website-qa'
$taskState=Get-Content .\test-results\local-website-qa-active.json -Raw | ConvertFrom-Json
$taskPrivateRun=Join-Path $taskLogRoot $taskState.run
$taskLog='account-start-'+(Get-Date -Format 'yyyyMMddHHmmssfff')
$taskProcess=Start-Process -FilePath (Get-Command node.exe).Source -ArgumentList @('node_modules/tsx/dist/cli.mjs','scripts/local-website-qa/account-v2/serve.ts',('--lease-hours='+$LeaseHours)) -WorkingDirectory $workspace -WindowStyle Hidden -RedirectStandardOutput (Join-Path $taskPrivateRun ($taskLog+'.stdout.log')) -RedirectStandardError (Join-Path $taskPrivateRun ($taskLog+'.stderr.log')) -PassThru
Write-Output ('Local account QA launcher PID: '+$taskProcess.Id)
Write-Output 'Startup is asynchronous. Existing QA database, identities and passwords are preserved. Use open-test-access.ps1 when ready.'
