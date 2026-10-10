# Private pipe-only Windows DPAPI bridge. Never print errors, paths or secrets.
[CmdletBinding()]
param([Parameter(Mandatory)][string]$Root)
$ErrorActionPreference='Stop'
Set-StrictMode -Version Latest
try {
  Add-Type -AssemblyName System.Security
  $Root=[IO.Path]::GetFullPath($Root).TrimEnd('\')
  $owner=[Security.Principal.WindowsIdentity]::GetCurrent().User.Value
  $allowed=@($owner,'S-1-5-18','S-1-5-32-544')
  function Assert-Private([string]$path) {
    if(([IO.File]::GetAttributes($path) -band [IO.FileAttributes]::ReparsePoint) -ne 0){throw 'Reparse point'}
    $acl=Get-Acl -LiteralPath $path
    if($acl.GetOwner([Security.Principal.SecurityIdentifier]).Value -notin $allowed){throw 'Unsafe owner'}
    foreach($rule in $acl.Access){
      if($rule.AccessControlType -eq 'Allow' -and $rule.IdentityReference.Translate([Security.Principal.SecurityIdentifier]).Value -notin $allowed){throw 'Unsafe ACL'}
    }
  }
  $ancestor=$Root
  while($ancestor){
    if(([IO.File]::GetAttributes($ancestor) -band [IO.FileAttributes]::ReparsePoint) -ne 0){throw 'Reparse ancestor'}
    $ancestor=[IO.Path]::GetDirectoryName($ancestor)
  }
  Assert-Private $Root
  if(-not (Get-Acl -LiteralPath $Root).AreAccessRulesProtected){throw 'Inherited root ACL'}
  foreach($excluded in @((Join-Path $PSScriptRoot '..'),$env:OneDrive,$env:OneDriveConsumer,$env:OneDriveCommercial)){
    if($excluded){$excluded=[IO.Path]::GetFullPath($excluded).TrimEnd('\'); if($Root -eq $excluded -or $Root.StartsWith($excluded+'\',[StringComparison]::OrdinalIgnoreCase)){throw 'Sync/repository root'}}
  }
  $request=[Console]::In.ReadToEnd() | ConvertFrom-Json
  $operator=Join-Path $Root 'migration-operator-connection.dpapi'
  $runtime=Join-Path $Root 'application-runtime-password.dpapi'
  function Write-Private([string]$path,[string]$value) {
    if(Test-Path -LiteralPath $path){throw 'Refuse overwrite'}
    $bytes=[Text.Encoding]::UTF8.GetBytes($value)
    try {
      $encrypted=[Security.Cryptography.ProtectedData]::Protect($bytes,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser)
      $file=[IO.File]::Open($path,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::None)
      try{$file.Write($encrypted,0,$encrypted.Length)}finally{$file.Dispose()}
      Assert-Private $path
    } finally {[Array]::Clear($bytes,0,$bytes.Length)}
  }
  function Read-Private([string]$path) {
    Assert-Private $path
    $bytes=[Security.Cryptography.ProtectedData]::Unprotect([IO.File]::ReadAllBytes($path),$null,[Security.Cryptography.DataProtectionScope]::CurrentUser)
    try {return [Text.Encoding]::UTF8.GetString($bytes)}finally{[Array]::Clear($bytes,0,$bytes.Length)}
  }
  switch($request.mode) {
    'prepare' {
      if((Test-Path -LiteralPath $operator) -or (Test-Path -LiteralPath $runtime)){throw 'Existing private credentials'}
      $url=[Uri]$request.operatorConnection
      if($url.Host -ne 'db.yfknxidgphhepdtwazhn.supabase.co' -or $url.AbsolutePath -ne '/postgres' -or $url.UserInfo -notlike 'postgres:*'){throw 'Operator mismatch'}
      Write-Private $operator $request.operatorConnection
      $random=[byte[]]::new(48)
      [Security.Cryptography.RandomNumberGenerator]::Fill($random)
      $password=[Convert]::ToBase64String($random).TrimEnd('=').Replace('+','-').Replace('/','_')
      Write-Private $runtime $password
      if((Read-Private $operator) -cne $request.operatorConnection -or (Read-Private $runtime) -cne $password){throw 'Private roundtrip mismatch'}
      [Console]::Out.Write('OK')
    }
    'read-runtime' { [Console]::Out.Write((Read-Private $runtime)) }
    'read-operator' { [Console]::Out.Write((Read-Private $operator)) }
    default {throw 'Invalid mode'}
  }
} catch {
  [Console]::Error.Write('Private runtime credential operation failed; details redacted.')
  exit 1
}
