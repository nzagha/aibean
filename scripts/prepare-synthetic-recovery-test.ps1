# Synthetic test resources only. Never reads the operator's existing profile.
[CmdletBinding()]
param([Parameter(Mandatory)][string]$Root,[string]$PostgresBin,[ValidateSet('prepare','cleanup')][string]$Mode='prepare')
$ErrorActionPreference='Stop'
$stage='containment'
try {
  $Root=[IO.Path]::GetFullPath($Root).TrimEnd('\')
  $tempRoot=[IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\')
  if(-not $Root.StartsWith($tempRoot+'\',[StringComparison]::OrdinalIgnoreCase) -or [IO.Path]::GetFileName($Root) -notmatch '^aibean-synthetic-recovery-[a-f0-9]{32}$'){throw 'Synthetic containment'}
  $marker=Join-Path $Root 'owned-synthetic-test.json'
  if($Mode -eq 'cleanup') {
    $m=Get-Content -LiteralPath $marker -Raw | ConvertFrom-Json
    if($m.root -ne $Root -or $m.synthetic -ne $true){throw 'Synthetic ownership'}
    $cert=Get-Item ('Cert:\CurrentUser\My\'+$m.certificate)
    if($cert.Subject -ne ('CN='+[IO.Path]::GetFileName($Root))){throw 'Certificate ownership'}
    Remove-Item -LiteralPath ('Cert:\CurrentUser\My\'+$m.certificate) -DeleteKey
    [Console]::Out.Write('OK'); exit 0
  }
  if(Test-Path -LiteralPath $Root){throw 'Never reuse test directory'}
  $null=New-Item -ItemType Directory -Path $Root
  $stage='directory-acl'
  $owner=[Security.Principal.WindowsIdentity]::GetCurrent().User
  $acl=[Security.AccessControl.DirectorySecurity]::new()
  $acl.SetOwner($owner); $acl.SetAccessRuleProtection($true,$false)
  foreach($sid in @($owner.Value,'S-1-5-18','S-1-5-32-544')) {
    $acl.AddAccessRule([Security.AccessControl.FileSystemAccessRule]::new([Security.Principal.SecurityIdentifier]::new($sid),'FullControl','ContainerInherit,ObjectInherit','None','Allow'))
  }
  Set-Acl -LiteralPath $Root -AclObject $acl
  $backups=Join-Path $Root 'backups'; $recovery=Join-Path $Root 'synthetic-placeholder'
  $null=New-Item -ItemType Directory -Path $backups,$recovery
  $stage='synthetic-certificate'
  $cert=New-SelfSignedCertificate -Type DocumentEncryptionCert -Subject ('CN='+[IO.Path]::GetFileName($Root)) -CertStoreLocation 'Cert:\CurrentUser\My' -KeyAlgorithm RSA -KeyLength 3072 -KeyExportPolicy NonExportable -NotAfter (Get-Date).AddDays(1)
  $rsa=[Security.Cryptography.X509Certificates.RSACertificateExtensions]::GetRSAPrivateKey($cert)
  $stage='synthetic-key-acl'
  $keyPath=Join-Path $env:APPDATA ('Microsoft\Crypto\Keys\'+$rsa.Key.UniqueName)
  $keyAcl=[Security.AccessControl.FileSecurity]::new(); $keyAcl.SetOwner($owner); $keyAcl.SetAccessRuleProtection($true,$false)
  foreach($sid in @($owner.Value,'S-1-5-18','S-1-5-32-544')){$keyAcl.AddAccessRule([Security.AccessControl.FileSystemAccessRule]::new([Security.Principal.SecurityIdentifier]::new($sid),'FullControl','Allow'))}
  Set-Acl -LiteralPath $keyPath -AclObject $keyAcl
  @{synthetic=$true;root=$Root;certificate=$cert.Thumbprint} | ConvertTo-Json | Set-Content -LiteralPath $marker -Encoding utf8
  @{root=$Root;backups=$backups;recovery=$recovery;certificateThumbprint=$cert.Thumbprint;postgresBin=[IO.Path]::GetFullPath($PostgresBin);sourceProject='yfknxidgphhepdtwazhn';database='postgres'} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $Root 'preparation.json') -Encoding utf8
  [Console]::Out.Write('OK')
} catch {[Console]::Error.Write(('Synthetic preparation failed at '+$stage+'; error type '+$_.Exception.GetType().Name+'; details redacted.')); exit 1}
