# Private local-target lifecycle only. Never contacts a hosted database.
# Requests/results stay in captured parent pipes. No keys or passwords printed.
[CmdletBinding()]
param([Parameter(Mandatory)][string]$Root)
$ErrorActionPreference='Stop'
Set-StrictMode -Version Latest
$stage='private-profile-validation'
try {
  Add-Type -AssemblyName System.Security
  $Root=[IO.Path]::GetFullPath($Root).TrimEnd('\')
  $owner=[Security.Principal.WindowsIdentity]::GetCurrent().User.Value
  $allowed=@($owner,'S-1-5-18','S-1-5-32-544')
  function Assert-Private([string]$path) {
    $path=[IO.Path]::GetFullPath($path)
    if($path -ne $Root -and -not $path.StartsWith($Root+'\',[StringComparison]::OrdinalIgnoreCase)){throw 'Outside private root'}
    $ancestor=$path
    while($ancestor){
      if((Test-Path -LiteralPath $ancestor) -and (([IO.File]::GetAttributes($ancestor) -band [IO.FileAttributes]::ReparsePoint) -ne 0)){throw 'Reparse point'}
      $ancestor=[IO.Path]::GetDirectoryName($ancestor)
    }
    $acl=Get-Acl -LiteralPath $path
    if($acl.GetOwner([Security.Principal.SecurityIdentifier]).Value -notin $allowed){throw 'Unsafe owner'}
    foreach($rule in $acl.Access){
      if($rule.AccessControlType -eq 'Allow' -and $rule.IdentityReference.Translate([Security.Principal.SecurityIdentifier]).Value -notin $allowed){throw 'Unsafe ACL'}
    }
  }
  Assert-Private $Root
  if(-not (Get-Acl -LiteralPath $Root).AreAccessRulesProtected){throw 'Inherited root ACL'}
  foreach($excluded in @((Join-Path $PSScriptRoot '..'),$env:OneDrive,$env:OneDriveConsumer,$env:OneDriveCommercial)){
    if($excluded){$excluded=[IO.Path]::GetFullPath($excluded).TrimEnd('\'); if($Root -eq $excluded -or $Root.StartsWith($excluded+'\',[StringComparison]::OrdinalIgnoreCase)){throw 'Sync/repository root'}}
  }
  $profileFile=Join-Path $Root 'preparation.json'; Assert-Private $profileFile
  $profile=Get-Content -LiteralPath $profileFile -Raw | ConvertFrom-Json
  if([IO.Path]::GetFullPath($profile.root).TrimEnd('\') -ne $Root -or $profile.sourceProject -ne 'yfknxidgphhepdtwazhn' -or $profile.database -ne 'postgres'){throw 'Profile mismatch'}
  $request=[Console]::In.ReadToEnd() | ConvertFrom-Json
  function Native([string]$program,[string[]]$arguments) {
    $result=& $program @arguments 2>&1
    if($LASTEXITCODE -ne 0){throw 'Native local operation failed'}
    return ($result -join "`n")
  }
  function Get-Target([string]$name) {
    if($name -notmatch '^ExpandedRecovery-[a-f0-9]{32}$'){throw 'Target name'}
    $directory=Join-Path $Root $name; Assert-Private $directory
    $file=Join-Path $directory 'target.json'; Assert-Private $file
    $target=Get-Content -LiteralPath $file -Raw | ConvertFrom-Json
    if($target.name -ne $name -or [IO.Path]::GetFullPath($target.directory) -ne $directory -or [IO.Path]::GetFullPath($target.data) -ne (Join-Path $directory 'data') -or $target.host -ne '127.0.0.1' -or $target.database -ne 'postgres' -or $target.role -ne 'recovery_operator' -or $target.sourceProject -ne $profile.sourceProject -or $target.port -lt 1024 -or $target.port -gt 65535){throw 'Local target mismatch'}
    return $target
  }
  function PgCtl($target,[string]$operation) {
    Assert-Private $target.directory; Assert-Private $target.data
    $arguments=@('-D',('"'+$target.data+'"'),'-w','-t','15')
    if($operation -eq 'start'){$logFile=Join-Path $target.directory 'server.log'; if(Test-Path -LiteralPath $logFile){Assert-Private $logFile}; $arguments+=@('-l',('"'+$logFile+'"'),'start')}
    elseif($operation -eq 'stop'){$arguments+=@('-m','fast','stop')}
    else{throw 'Invalid lifecycle operation'}
    $process=Start-Process -FilePath (Join-Path $profile.postgresBin 'pg_ctl.exe') -ArgumentList $arguments -WindowStyle Hidden -PassThru
    if(-not $process.WaitForExit(20000) -or $process.ExitCode -ne 0){throw 'Owned lifecycle failed'}
  }
  switch($request.mode){
    'check' {[Console]::Out.Write('OK')}
    'prepare-target' {
      $stage='local-prerequisites'
      if($request.approvedPackage -notmatch '^[a-f0-9]{64}$'){throw 'Package acknowledgement missing'}
      $openssl=[IO.Path]::GetFullPath($request.openssl)
      if(-not (Test-Path -LiteralPath $openssl) -or [IO.Path]::GetFileName($openssl) -ne 'openssl.exe'){throw 'OpenSSL prerequisite'}
      $version=Native (Join-Path $profile.postgresBin 'postgres.exe') @('--version')
      if($version -notmatch '17\.11'){throw 'Native version mismatch'}
      $drive=[IO.DriveInfo]::new([IO.Path]::GetPathRoot($Root))
      if($drive.DriveFormat -ne 'NTFS' -or $drive.AvailableFreeSpace -lt 1GB){throw 'Local capacity'}
      $name='ExpandedRecovery-'+[guid]::NewGuid().ToString('N'); $directory=Join-Path $Root $name
      if(Test-Path -LiteralPath $directory){throw 'Never reuse target'}
      $null=New-Item -ItemType Directory -Path $directory; Assert-Private $directory
      $data=Join-Path $directory 'data'
      $random=[byte[]]::new(48); [Security.Cryptography.RandomNumberGenerator]::Fill($random)
      $password=[Convert]::ToBase64String($random); [Array]::Clear($random,0,$random.Length)
      $passwordBytes=[Text.Encoding]::UTF8.GetBytes($password)
      $protected=[Security.Cryptography.ProtectedData]::Protect($passwordBytes,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser)
      [IO.File]::WriteAllBytes((Join-Path $directory 'operator-password.dpapi'),$protected)
      $passwordFile=Join-Path $directory 'bootstrap-password.tmp'
      $stage='local-initdb'
      try{[IO.File]::WriteAllText($passwordFile,$password); $null=Native (Join-Path $profile.postgresBin 'initdb.exe') @('-D',$data,'-U','recovery_operator','--pwfile',$passwordFile,'--auth-host=scram-sha-256','--auth-local=scram-sha-256','--encoding=UTF8','--no-locale')}
      finally{[Array]::Clear($passwordBytes,0,$passwordBytes.Length); $password=$null; if(Test-Path -LiteralPath $passwordFile){Assert-Private $passwordFile; Remove-Item -LiteralPath $passwordFile -Force}}
      $ca=Join-Path $directory 'local-ca.crt'; $caKey=Join-Path $directory 'local-ca.key'
      $certificate=Join-Path $directory 'local-server.crt'; $key=Join-Path $directory 'local-server.key'; $csr=Join-Path $directory 'local-server.csr'; $extensions=Join-Path $directory 'local-server.ext'
      [IO.File]::WriteAllText($extensions,"subjectAltName=IP:127.0.0.1,DNS:localhost`nextendedKeyUsage=serverAuth`n")
      $stage='local-ca-generation'
      $null=Native $openssl @('req','-x509','-newkey','rsa:3072','-nodes','-keyout',$caKey,'-out',$ca,'-days','30','-subj','/CN=aiBean expanded disposable recovery CA')
      $null=Native $openssl @('req','-newkey','rsa:3072','-nodes','-keyout',$key,'-out',$csr,'-subj','/CN=localhost')
      $stage='local-server-signing'
      $null=Native $openssl @('x509','-req','-in',$csr,'-CA',$ca,'-CAkey',$caKey,'-CAcreateserial','-out',$certificate,'-days','30','-extfile',$extensions)
      $listener=[Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback,0); $listener.Start(); $port=$listener.LocalEndpoint.Port; $listener.Stop()
      function PgPath([string]$value){return $value.Replace('\','/').Replace("'","''")}
      [IO.File]::WriteAllText((Join-Path $data 'postgresql.conf'),"listen_addresses='127.0.0.1'`nport=$port`nssl=on`nssl_cert_file='$(PgPath $certificate)'`nssl_key_file='$(PgPath $key)'`npassword_encryption='scram-sha-256'`nlog_statement='none'`nlog_min_error_statement='panic'`nlog_min_messages='panic'`nlog_error_verbosity='terse'`n")
      [IO.File]::WriteAllText((Join-Path $data 'pg_hba.conf'),"hostssl all all 127.0.0.1/32 scram-sha-256`nhostnossl all all 127.0.0.1/32 reject`n")
      $target=@{name=$name; directory=$directory; data=$data; host='127.0.0.1'; port=$port; database='postgres'; role='recovery_operator'; ca=$ca; sourceProject=$profile.sourceProject; packageSha256=$request.approvedPackage; createdAt=[DateTime]::UtcNow.ToString('o')}
      $target | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $directory 'target.json') -Encoding utf8
      Assert-Private $data; [Console]::Out.Write(($target | ConvertTo-Json -Compress))
    }
    'start-target' {$target=Get-Target $request.target; if(Test-Path -LiteralPath (Join-Path $target.data 'postmaster.pid')){throw 'Existing target process'}; PgCtl $target 'start'; [Console]::Out.Write('OK')}
    'stop-target' {$target=Get-Target $request.target; if(Test-Path -LiteralPath (Join-Path $target.data 'postmaster.pid')){PgCtl $target 'stop'}; [Console]::Out.Write('OK')}
    'target-password' {
      $target=Get-Target $request.target; $file=Join-Path $target.directory 'operator-password.dpapi'; Assert-Private $file
      $bytes=[Security.Cryptography.ProtectedData]::Unprotect([IO.File]::ReadAllBytes($file),$null,[Security.Cryptography.DataProtectionScope]::CurrentUser)
      try{[Console]::Out.Write([Text.Encoding]::UTF8.GetString($bytes))}finally{[Array]::Clear($bytes,0,$bytes.Length)}
    }
    'dispose-passed-target' {
      $target=Get-Target $request.target
      if($request.approvedPackage -ne $target.packageSha256 -or $request.validationPassed -ne $true){throw 'No disposal approval witness'}
      $file=Join-Path $target.directory 'completed.json'; Assert-Private $file; $completed=Get-Content -LiteralPath $file -Raw | ConvertFrom-Json
      if($completed.result -ne 'PASS' -or $completed.target -ne $target.name -or $completed.packageSha256 -ne $target.packageSha256){throw 'Validation witness mismatch'}
      if(Test-Path -LiteralPath (Join-Path $target.data 'postmaster.pid')){throw 'Stop before disposal'}
      # Final absolute containment, exact generated name and reparse/ACL checks
      # precede this sole recursive removal. Backups/root are never targets.
      $resolved=[IO.Path]::GetFullPath($target.directory)
      if($resolved -ne (Join-Path $Root $target.name) -or -not $resolved.StartsWith($Root+'\',[StringComparison]::OrdinalIgnoreCase)){throw 'Disposal containment'}
      Assert-Private $resolved
      Get-ChildItem -LiteralPath $resolved -Recurse -Force | ForEach-Object {Assert-Private $_.FullName}
      Remove-Item -LiteralPath $resolved -Recurse -Force
      [Console]::Out.Write('OK')
    }
    default{throw 'Invalid local request'}
  }
} catch {[Console]::Error.Write(('Private expanded recovery lifecycle failed at '+$stage+'; details redacted.')); exit 1}
