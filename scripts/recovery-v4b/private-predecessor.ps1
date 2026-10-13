[CmdletBinding()]
param([Parameter(Mandatory)][string]$Root)
$ErrorActionPreference='Stop'
Set-StrictMode -Version Latest
try {
 $Root=[IO.Path]::GetFullPath($Root).TrimEnd('\')
 $p=Get-Content -LiteralPath (Join-Path $Root 'preparation.json') -Raw | ConvertFrom-Json
 if([IO.Path]::GetFullPath($p.root).TrimEnd('\') -ne $Root -or $p.sourceProject -ne 'yfknxidgphhepdtwazhn' -or $p.database -ne 'postgres'){throw 'Profile'}
 $sid=[Security.Principal.WindowsIdentity]::GetCurrent().User.Value
 $allowed=@($sid,'S-1-5-18','S-1-5-32-544')
 function Private([string]$path){$path=[IO.Path]::GetFullPath($path);if($path -ne $Root -and -not $path.StartsWith($Root+'\',[StringComparison]::OrdinalIgnoreCase)){throw 'Containment'}; $a=$path;while($a){if(([IO.File]::GetAttributes($a) -band [IO.FileAttributes]::ReparsePoint) -ne 0){throw 'Reparse'};$a=[IO.Path]::GetDirectoryName($a)};$acl=Get-Acl -LiteralPath $path;if($acl.GetOwner([Security.Principal.SecurityIdentifier]).Value -notin $allowed){throw 'Owner'};foreach($r in $acl.Access){if($r.AccessControlType -eq 'Allow' -and $r.IdentityReference.Translate([Security.Principal.SecurityIdentifier]).Value -notin $allowed){throw 'ACL'}}}
 Private $Root;Private $p.backups;Private (Join-Path $Root 'preparation.json')
 if(-not (Get-Acl -LiteralPath $Root).AreAccessRulesProtected){throw 'Root inheritance'}
 $old=@(Get-ChildItem -LiteralPath $Root -Directory -Force | Where-Object {$_.Name -match '^ExpandedRecovery-[a-f0-9]{32}$'})
 if($old.Count -ne 2){throw 'Historical inventory'}
 $ns=Join-Path $Root 'ApplicationRecoveryV4a';Private $ns
 $profileFile=Join-Path $ns 'profile.json';Private $profileFile
 $v4=Get-Content -LiteralPath $profileFile -Raw | ConvertFrom-Json
 if($v4.namespace -ne 'v4a' -or $v4.packageSha256 -ne 'cafbf6932c2395cf1d9c5b889cac86ab67cef6b333e3fd8d12cb8c351bdaaa91' -or $v4.certificateThumbprint -ne $p.certificateThumbprint -or $v4.targets -ne (Join-Path $ns 'Targets') -or $v4.backups -ne (Join-Path $ns 'Backups')){throw 'V4a profile'}
 Private $v4.targets;Private $v4.backups
 $fresh=@(Get-ChildItem -LiteralPath $v4.targets -Directory -Force)
 if($fresh.Count -ne 1 -or $fresh[0].Name -notmatch '^V4aRecovery-[a-f0-9]{32}$'){throw 'Retained successful inventory'}
 foreach($d in @($old)+@($fresh)){
  Private $d.FullName;$f=Join-Path $d.FullName 'target.json';Private $f
  $t=Get-Content -LiteralPath $f -Raw | ConvertFrom-Json
  if($t.sourceProject -ne $p.sourceProject -or $t.host -ne '127.0.0.1' -or $t.database -ne 'postgres' -or $t.role -ne 'recovery_operator'){throw 'Target identity'}
  Private $t.data;Private $t.ca
  if((Test-Path -LiteralPath (Join-Path $t.data 'postmaster.pid')) -or (Test-Path -LiteralPath (Join-Path $d.FullName 'bootstrap-password.tmp'))){throw 'Unsafe retained target'}
 }
 [Console]::Out.Write((@{status='PASS';historicalFailedTargets=2;retainedSuccessfulV4aTargets=1;allStopped=$true;protectedOwnershipAclAndAncestors='PASS';certificateBindingUnchanged=$true;targetDataModified=$false;targetRestarted=$false;targetDeleted=$false} | ConvertTo-Json -Compress))
}catch{[Console]::Error.Write('Protected retained-target inspection failed; details withheld');exit 1}
