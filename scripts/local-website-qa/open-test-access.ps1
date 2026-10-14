$ErrorActionPreference='Stop'
if (-not (Test-Path .\package.json) -or -not (Test-Path .\test-results\local-website-qa-active.json)) {throw 'Run from the aiBean repository root; the existing QA manifest is required'}
$taskState=Get-Content .\test-results\local-website-qa-active.json -Raw | ConvertFrom-Json
if ($taskState.run -notmatch '^[a-f0-9]{32}$') {throw 'Invalid QA run'}
$taskExpected=Join-Path $env:LOCALAPPDATA ('aiBean\local-website-qa\'+$taskState.run+'\credentials.json')
if (-not [string]::Equals([IO.Path]::GetFullPath($taskState.credentialsPath),[IO.Path]::GetFullPath($taskExpected),[StringComparison]::OrdinalIgnoreCase)) {throw 'Private credential handoff path mismatch'}
if (-not (Test-Path -LiteralPath $taskExpected -PathType Leaf)) {throw 'Private credential handoff is unavailable'}
Write-Output ('Lease expiry: '+[DateTimeOffset]::FromUnixTimeMilliseconds($taskState.expiresAt).ToLocalTime().ToString('yyyy-MM-dd HH:mm:ss zzz'))
$taskRunner=Get-CimInstance Win32_Process -Filter ('ProcessId='+[int]$taskState.runnerPid) -ErrorAction SilentlyContinue
if (-not $taskRunner -or $taskRunner.CommandLine -notmatch 'scripts[\\/]local-website-qa[\\/]account-v2[\\/]serve\.ts') {
  Write-Output 'Saved runner PID is stopped or stale; no process will be killed. HTTP probes below report actual access.'
} else {Write-Output ('Current owned QA runner PID: '+$taskState.runnerPid)}
if ($taskState.expiresAt -le [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()) {Write-Output 'The saved manifest is EXPIRED. Restart preserves the existing database and passwords.'}
node.exe node_modules/tsx/dist/cli.mjs scripts/local-website-qa/account-v2/verify-access.ts
if ($LASTEXITCODE -ne 0) {throw 'Access manifest verification failed'}
Start-Process -FilePath notepad.exe -ArgumentList ('"'+$taskExpected+'"') -WindowStyle Normal
Write-Output 'Private passwords and the mailbox password were opened in Notepad, not printed.'
Write-Output 'Safe restart: run stop.ps1, wait for owned listeners to close, then start-account-testing.ps1 -LeaseHours 8.'
Write-Output 'Normal restart preserves credentials. A STALE_OR_REJECTED_PASSWORD result means the saved password no longer authenticates; do not create a new fixture to fix it.'
