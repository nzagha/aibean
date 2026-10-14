param([Parameter(Mandatory=$true)][string]$Root)
$ErrorActionPreference='Stop'
$resolved=[IO.Path]::GetFullPath($Root)
$privateParent=Join-Path $env:LOCALAPPDATA 'aiBean\local-website-qa'
$run=Split-Path $resolved -Leaf
if ($run -notmatch '^[a-f0-9]{32}$' -or -not [string]::Equals($resolved,[IO.Path]::GetFullPath((Join-Path $privateParent $run)),[StringComparison]::OrdinalIgnoreCase)) {throw 'Private credential ACL scope mismatch'}
if ((Get-Item -LiteralPath $resolved).Attributes -band [IO.FileAttributes]::ReparsePoint) {throw 'Private credential location cannot be a link'}
$ownerSid=[Security.Principal.WindowsIdentity]::GetCurrent().User.Value
& icacls.exe $resolved /inheritance:r /grant:r ('*'+$ownerSid+':(OI)(CI)F') '*S-1-5-18:(OI)(CI)F' *> $null
if ($LASTEXITCODE -ne 0) {throw 'Private credential permissions failed'}
$acl=Get-Acl -LiteralPath $resolved
if (-not $acl.AreAccessRulesProtected) {throw 'Private credentials inherit workspace access'}
foreach ($rule in $acl.Access) {
  if ($rule.IsInherited -or $rule.IdentityReference.Translate([Security.Principal.SecurityIdentifier]).Value -notin @($ownerSid,'S-1-5-18')) {throw 'Unexpected private credential recipient'}
}
Write-Output 'PRIVATE_OWNER_AND_SYSTEM_ONLY'
