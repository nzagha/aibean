param([Parameter(Mandatory=$true)][string]$Root)
$ErrorActionPreference='Stop'
$workspace=(Get-Location).Path
$resolved=[IO.Path]::GetFullPath($Root)
$prefix=Join-Path $workspace 'test-results\product-acceptance-'
if (-not $resolved.StartsWith($prefix,[StringComparison]::OrdinalIgnoreCase) -or $resolved -notmatch 'product-acceptance-[a-f0-9]{32}$') {throw 'Fixture ACL scope mismatch'}
$ownerSid=[Security.Principal.WindowsIdentity]::GetCurrent().User.Value
& icacls.exe $resolved /inheritance:r /grant:r ('*'+$ownerSid+':(OI)(CI)F') '*S-1-5-18:(OI)(CI)F' *> $null
if ($LASTEXITCODE -ne 0) {throw 'Fixture permissions could not be restricted'}
$acl=Get-Acl -LiteralPath $resolved
if (-not $acl.AreAccessRulesProtected -or @($acl.Access | Where-Object { $_.IsInherited }).Count -ne 0) {throw 'Fixture inherited access remains'}
foreach ($rule in $acl.Access) {
  $sid=$rule.IdentityReference.Translate([Security.Principal.SecurityIdentifier]).Value
  if ($sid -notin @($ownerSid,'S-1-5-18')) {throw 'Unexpected fixture access'}
}
Write-Output 'PRIVATE_OWNER_AND_SYSTEM_ONLY'
