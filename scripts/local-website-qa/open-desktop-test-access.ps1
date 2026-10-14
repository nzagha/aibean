param([ValidateSet('Credentials','BrowserJourney')][string]$Kind='Credentials')
$ErrorActionPreference='Stop'
if (-not (Test-Path .\package.json) -or -not (Test-Path .\test-results\local-website-qa-active.json)) {throw 'Run from the aiBean repository root'}
$taskState=Get-Content .\test-results\local-website-qa-active.json -Raw | ConvertFrom-Json
if ($taskState.authVersion -ne 2 -or $taskState.run -notmatch '^[a-f0-9]{32}$') {throw 'A current local account QA manifest is required'}
$taskPrivateRoot=Join-Path $env:LOCALAPPDATA ('aiBean\local-website-qa\'+$taskState.run)
$taskExpected=Join-Path $taskPrivateRoot 'credentials.json'
if (-not [string]::Equals([IO.Path]::GetFullPath($taskState.credentialsPath),[IO.Path]::GetFullPath($taskExpected),[StringComparison]::OrdinalIgnoreCase)) {throw 'Private credential scope mismatch'}
$taskName=if ($Kind -eq 'Credentials') {'credentials.json'} else {'browser-journey.json'}
$taskFile=Join-Path $taskPrivateRoot $taskName
foreach ($taskTarget in @($taskPrivateRoot,$taskFile)) {
  if ((Get-Item -LiteralPath $taskTarget).Attributes -band [IO.FileAttributes]::ReparsePoint) {throw 'Private handoff cannot redirect through a filesystem link'}
  $taskOwnerSid=[Security.Principal.WindowsIdentity]::GetCurrent().User.Value
  $taskAcl=Get-Acl -LiteralPath $taskTarget
  foreach ($taskRule in $taskAcl.Access) {
    if ($taskRule.IdentityReference.Translate([Security.Principal.SecurityIdentifier]).Value -notin @($taskOwnerSid,'S-1-5-18')) {throw 'Unexpected private handoff recipient'}
  }
}
if ($Kind -eq 'Credentials') {
  Write-Output ('Lease expiry: '+[DateTimeOffset]::FromUnixTimeMilliseconds($taskState.expiresAt).ToLocalTime().ToString('yyyy-MM-dd HH:mm:ss zzz'))
  $taskRunner=Get-CimInstance Win32_Process -Filter ('ProcessId='+[int]$taskState.runnerPid) -ErrorAction SilentlyContinue
  if (-not $taskRunner -or $taskRunner.CommandLine -notmatch 'scripts[\\/]local-website-qa[\\/]account-v2[\\/]serve\.ts') {Write-Output 'Saved runner PID is stopped or stale; no process will be killed.'}
  else {Write-Output ('Current owned QA runner PID: '+$taskState.runnerPid)}
  node.exe node_modules/tsx/dist/cli.mjs scripts/local-website-qa/account-v2/verify-access.ts
  if ($LASTEXITCODE -ne 0) {throw 'Access manifest verification failed'}
}
# Packaged Codex can redirect LocalAppData. Resolve this existing file handle,
# never guess a package folder or copy credentials into a shared directory.
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
using System.Text;
using Microsoft.Win32.SafeHandles;
public static class AiBeanDesktopPrivatePath {
 [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true)]
 public static extern uint GetFinalPathNameByHandle(SafeFileHandle handle, StringBuilder path, uint length, uint flags);
}
'@
$taskStream=[IO.File]::Open($taskFile,[IO.FileMode]::Open,[IO.FileAccess]::Read,[IO.FileShare]::ReadWrite)
try {
  $taskBuffer=New-Object Text.StringBuilder 4096
  $taskLength=[AiBeanDesktopPrivatePath]::GetFinalPathNameByHandle($taskStream.SafeFileHandle,$taskBuffer,4096,0)
  if ($taskLength -eq 0 -or $taskLength -ge 4096) {throw 'Physical private-file path unavailable'}
  $taskPhysical=$taskBuffer.ToString()
  if ($taskPhysical.StartsWith('\\?\')) {$taskPhysical=$taskPhysical.Substring(4)}
  $taskPermittedPrefix=Join-Path $env:USERPROFILE 'AppData\Local'
  $taskRequiredSuffix='\aiBean\local-website-qa\'+$taskState.run+'\'+$taskName
  if (-not $taskPhysical.StartsWith($taskPermittedPrefix+'\',[StringComparison]::OrdinalIgnoreCase) -or -not $taskPhysical.EndsWith($taskRequiredSuffix,[StringComparison]::OrdinalIgnoreCase)) {throw 'Physical private-file scope mismatch'}
  Start-Process -FilePath "$env:WINDIR\System32\notepad.exe" -ArgumentList ('"'+$taskPhysical+'"') -WindowStyle Normal
  Write-Output 'Opened the existing protected handoff through its physical desktop path; credentials and paths were not printed.'
} finally {$taskStream.Dispose()}
Write-Output 'Restart preserves credentials: stop.ps1, wait for owned listeners to close, then start-account-testing.ps1 -LeaseHours 8.'
