# Local preparation only. Never loads DATABASE_URL or contacts hosted Supabase.
# Run only after the operator selects the root and approves certificate creation.
[CmdletBinding()]
param(
    [Parameter(Mandatory)][string]$Root,
    [Parameter(Mandatory)][string]$PostgresBin,
    [Parameter(Mandatory)][string]$OpenSsl,
    [Parameter(Mandatory)][string]$SyntheticArchive,
    [switch]$ResumeInterruptedPreparation
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Assert-PrivateDirectory([string]$Path) {
    $acl = Get-Acl -LiteralPath $Path
    if (-not $acl.AreAccessRulesProtected) { throw 'Backup root must disable inherited ACLs.' }
    $allowed = @($script:owner.Value, 'S-1-5-18', 'S-1-5-32-544')
    foreach ($rule in $acl.Access) {
        $sid = $rule.IdentityReference.Translate([System.Security.Principal.SecurityIdentifier]).Value
        if ($rule.AccessControlType -eq 'Allow' -and $sid -notin $allowed) {
            throw 'Backup root grants access to another principal.'
        }
    }
    if ($acl.Owner -ne $script:owner.Value -and
        ([System.Security.Principal.NTAccount]$acl.Owner).Translate([System.Security.Principal.SecurityIdentifier]).Value -ne $script:owner.Value) {
        throw 'Backup root owner mismatch.'
    }
}
function Native([string]$Program, [string[]]$Arguments) {
    # Capture diagnostic output locally; never emit native paths/logs to reports.
    $result = & $Program @Arguments 2>&1
    if ($LASTEXITCODE -ne 0) { throw ('Native preparation failed: ' + [IO.Path]::GetFileName($Program)) }
    return ($result -join "`n")
}
function PgPath([string]$Path) { return $Path.Replace('\','/').Replace("'","''") }
function SqlScalar([string]$Statement) {
    return (Native (Join-Path $PostgresBin 'psql.exe') @('--no-psqlrc','--no-password','--tuples-only','--no-align','--set','ON_ERROR_STOP=1','--command',$Statement)).Trim()
}

$Root = [IO.Path]::GetFullPath($Root).TrimEnd('\')
$repo = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..')).TrimEnd('\')
$drive = [IO.DriveInfo]::new([IO.Path]::GetPathRoot($Root))
if ($drive.DriveFormat -ne 'NTFS' -or $drive.AvailableFreeSpace -lt 1GB) { throw 'A local NTFS volume with at least 1 GiB free is required.' }
$excluded = @($repo, $env:OneDrive, $env:OneDriveConsumer, $env:OneDriveCommercial) | Where-Object { $_ }
foreach ($path in $excluded) {
    $absolute = [IO.Path]::GetFullPath($path).TrimEnd('\')
    if ($Root.Equals($absolute,[StringComparison]::OrdinalIgnoreCase) -or $Root.StartsWith($absolute+'\',[StringComparison]::OrdinalIgnoreCase)) { throw 'Backup root is in the repository or a configured sync root.' }
}
$ancestor = $Root
while ($ancestor) {
    if ((Test-Path -LiteralPath $ancestor) -and (([IO.File]::GetAttributes($ancestor) -band [IO.FileAttributes]::ReparsePoint) -ne 0)) { throw 'Reparse-point backup paths are not allowed.' }
    $ancestor = [IO.Path]::GetDirectoryName($ancestor)
}
$script:owner = [System.Security.Principal.WindowsIdentity]::GetCurrent().User
if (-not (Test-Path -LiteralPath $Root)) {
    # Empty directory only; lock it down before any child/key/data is written.
    $null = New-Item -ItemType Directory -Path $Root
    $acl = [System.Security.AccessControl.DirectorySecurity]::new()
    $acl.SetOwner($script:owner)
    $acl.SetAccessRuleProtection($true,$false)
    foreach ($sid in @($script:owner.Value,'S-1-5-18','S-1-5-32-544')) {
        $rule = [System.Security.AccessControl.FileSystemAccessRule]::new(
            [System.Security.Principal.SecurityIdentifier]::new($sid), 'FullControl',
            'ContainerInherit, ObjectInherit', 'None', 'Allow')
        $null = $acl.AddAccessRule($rule)
    }
    Set-Acl -LiteralPath $Root -AclObject $acl
}
Assert-PrivateDirectory $Root
$configFile = Join-Path $Root 'preparation.json'
if (Test-Path -LiteralPath $configFile) { throw 'Preparation already exists. Inspect it; never overwrite a recovery target.' }
$backups = Join-Path $Root 'Backups'
if ($ResumeInterruptedPreparation) {
    $candidates = @(Get-ChildItem -LiteralPath $Root -Directory -Filter 'Recovery-*')
    if ($candidates.Count -ne 1) { throw 'Expected exactly one interrupted preparation target.' }
    $recovery = $candidates[0].FullName
    if (([IO.File]::GetAttributes($recovery) -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw 'Reparse target refused.' }
    if (Test-Path -LiteralPath (Join-Path $recovery 'data/postmaster.pid')) { throw 'Stop the owned preparation target before resuming.' }
} else {
    $recovery = Join-Path $Root ('Recovery-' + [guid]::NewGuid().ToString('N'))
    $null = New-Item -ItemType Directory -Path $backups,$recovery
}

# The operator explicitly chose a Windows document-encryption certificate.
# Its private key stays in CurrentUser\My, separated from backup archives.
# No PFX, passphrase or private key is exported by this script.
if ($ResumeInterruptedPreparation) {
    $certificates = @(Get-ChildItem Cert:\CurrentUser\My | Where-Object { $_.Subject -eq 'CN=aiBean local backup encryption' })
    if ($certificates.Count -ne 1) { throw 'Select a unique operator-owned certificate before resuming.' }
    $cert = $certificates[0]
} else {
    $cert = New-SelfSignedCertificate -Type DocumentEncryptionCert -Subject 'CN=aiBean local backup encryption' `
        -CertStoreLocation 'Cert:\CurrentUser\My' -KeyAlgorithm RSA -KeyLength 3072 `
        -HashAlgorithm SHA256 -KeyExportPolicy Exportable -NotAfter (Get-Date).AddYears(2)
}
if (-not $cert.HasPrivateKey) { throw 'Encryption private key is missing.' }
$publicCert = Join-Path $Root 'recipient.cer'
$null = Export-Certificate -Cert $cert -FilePath $publicCert

# Binary custom-format archive stays in memory during the CMS roundtrip.
$synthetic = [IO.File]::ReadAllBytes((Resolve-Path -LiteralPath $SyntheticArchive).Path)
if ([Text.Encoding]::ASCII.GetString($synthetic,0,5) -ne 'PGDMP') { throw 'Expected a synthetic custom-format archive.' }
$encrypted = Join-Path $backups 'synthetic-encryption-test.cms'
Protect-CmsMessage -To $cert -Content ([Convert]::ToBase64String($synthetic)) -OutFile $encrypted
$roundtrip = [Convert]::FromBase64String((Unprotect-CmsMessage -LiteralPath $encrypted))
$hash = [Security.Cryptography.SHA256]::Create()
$expected = [Convert]::ToBase64String($hash.ComputeHash($synthetic))
if ([Convert]::ToBase64String($hash.ComputeHash($roundtrip)) -ne $expected) { throw 'CMS synthetic roundtrip failed.' }
$hash.Dispose()
[Array]::Clear($synthetic,0,$synthetic.Length)
[Array]::Clear($roundtrip,0,$roundtrip.Length)

$data = Join-Path $recovery 'data'
$passwordFile = Join-Path $recovery 'bootstrap-password.tmp'
Add-Type -AssemblyName System.Security
if ($ResumeInterruptedPreparation) {
    $protectedPassword = [IO.File]::ReadAllBytes((Join-Path $recovery 'operator-password.dpapi'))
    $password = [Text.Encoding]::UTF8.GetString([Security.Cryptography.ProtectedData]::Unprotect($protectedPassword,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser))
    $version = Native (Join-Path $PostgresBin 'postgres.exe') @('--version')
} else {
$random = New-Object byte[] 32
$rng = [Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($random); $rng.Dispose()
$password = [Convert]::ToBase64String($random)
$protectedPassword = [Security.Cryptography.ProtectedData]::Protect([Text.Encoding]::UTF8.GetBytes($password),$null,[Security.Cryptography.DataProtectionScope]::CurrentUser)
[IO.File]::WriteAllBytes((Join-Path $recovery 'operator-password.dpapi'),$protectedPassword)
[IO.File]::WriteAllText($passwordFile,$password)
try {
    $version = Native (Join-Path $PostgresBin 'postgres.exe') @('--version')
    if ($version -notmatch '17\.11') { throw 'Expected validated PostgreSQL 17.11 binaries.' }
    $null = Native (Join-Path $PostgresBin 'initdb.exe') @('-D',$data,'-U','recovery_operator','--pwfile',$passwordFile,'--auth-host=scram-sha-256','--auth-local=scram-sha-256','--encoding=UTF8','--no-locale')
} finally { Remove-Item -LiteralPath $passwordFile -Force }
}
$ca = Join-Path $recovery 'local-ca.crt'
$caKey = Join-Path $recovery 'local-ca.key'
$serverCert = Join-Path $recovery 'local-server.crt'
$serverKey = Join-Path $recovery 'local-server.key'
$csr = Join-Path $recovery 'local-server.csr'
$ext = Join-Path $recovery 'local-server.ext'
if ($ResumeInterruptedPreparation) {
    $configuration = [IO.File]::ReadAllText((Join-Path $data 'postgresql.conf'))
    if ($configuration -notmatch '(?m)^port=(\d+)$') { throw 'Prepared local port missing.' }
    $port = [int]$Matches[1]
} else {
[IO.File]::WriteAllText($ext,"subjectAltName=IP:127.0.0.1,DNS:localhost`nextendedKeyUsage=serverAuth`n")
$null = Native $OpenSsl @('req','-x509','-newkey','rsa:3072','-nodes','-keyout',$caKey,'-out',$ca,'-days','30','-subj','/CN=aiBean disposable recovery CA')
$null = Native $OpenSsl @('req','-newkey','rsa:3072','-nodes','-keyout',$serverKey,'-out',$csr,'-subj','/CN=localhost')
$null = Native $OpenSsl @('x509','-req','-in',$csr,'-CA',$ca,'-CAkey',$caKey,'-CAcreateserial','-out',$serverCert,'-days','30','-extfile',$ext)
$listener = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback,0)
$listener.Start(); $port = $listener.LocalEndpoint.Port; $listener.Stop()
[IO.File]::WriteAllText((Join-Path $data 'postgresql.conf'),"listen_addresses='127.0.0.1'`nport=$port`nssl=on`nssl_cert_file='$(PgPath $serverCert)'`nssl_key_file='$(PgPath $serverKey)'`npassword_encryption='scram-sha-256'`nlog_statement='none'`nlog_min_error_statement='panic'`n")
[IO.File]::WriteAllText((Join-Path $data 'pg_hba.conf'),"hostssl all all 127.0.0.1/32 scram-sha-256`nhostnossl all all 127.0.0.1/32 reject`n")
}
$oldPg = @{}
foreach ($name in @('PGHOST','PGPORT','PGDATABASE','PGUSER','PGPASSWORD','PGSSLMODE','PGSSLROOTCERT','PGSERVICE','PGSERVICEFILE','PGOPTIONS')) { $oldPg[$name] = [Environment]::GetEnvironmentVariable($name,'Process') }
$started = $false
try {
    # pg_ctl is detached with no redirected handles inherited by the server.
    $pgctl = Join-Path $PostgresBin 'pg_ctl.exe'
    $process = Start-Process -FilePath $pgctl -ArgumentList @('-D',('"'+$data+'"'),'-l',('"'+(Join-Path $recovery 'server.log')+'"'),'-w','-t','15','start') -WindowStyle Hidden -PassThru
    if (-not $process.WaitForExit(20000)) { throw 'Owned recovery startup timed out.' }
    if ($process.ExitCode -ne 0) { throw 'Local recovery start failed.' }; $started = $true
    $env:PGHOST='127.0.0.1'; $env:PGPORT=[string]$port; $env:PGDATABASE='postgres'; $env:PGUSER='recovery_operator'; $env:PGPASSWORD=$password
    $env:PGSSLMODE='verify-full'; $env:PGSSLROOTCERT=$ca; $env:PGSERVICE=$null; $env:PGSERVICEFILE=$null; $env:PGOPTIONS='-c default_transaction_read_only=on'
    $tls = SqlScalar 'SELECT ssl FROM pg_stat_ssl WHERE pid=pg_backend_pid()'
    $count = SqlScalar "SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r'"
    if ($tls -ne 't' -or $count -ne '0') { throw 'Expected verified TLS and an empty isolated restore target.' }
    $config = @{ version=1; createdAt=[DateTime]::UtcNow.ToString('o'); root=$Root; backups=$backups; certificateThumbprint=$cert.Thumbprint; publicCertificate=$publicCert; postgresBin=$PostgresBin; recovery=$recovery; data=$data; port=$port; ca=$ca; role='recovery_operator'; database='postgres'; sourceProject='yfknxidgphhepdtwazhn'; hostedExportApproved=$false }
    $config | ConvertTo-Json | Set-Content -LiteralPath $configFile -Encoding UTF8
} finally {
    if ($started) {
        $process = Start-Process -FilePath (Join-Path $PostgresBin 'pg_ctl.exe') -ArgumentList @('-D',('"'+$data+'"'),'-w','-t','15','-m','fast','stop') -WindowStyle Hidden -PassThru
        if (-not $process.WaitForExit(20000)) { throw 'Owned recovery shutdown timed out.' }
        if ($process.ExitCode -ne 0) { throw 'Owned recovery instance did not stop cleanly.' }
    }
    foreach ($name in $oldPg.Keys) { [Environment]::SetEnvironmentVariable($name,$oldPg[$name],'Process') }
    $password=$null
}
Assert-PrivateDirectory $Root
Remove-Item -LiteralPath $encrypted -Force
[pscustomobject]@{
    preparedAt=[DateTime]::UtcNow.ToString('o'); sourceProject='yfknxidgphhepdtwazhn'
    storageAcl='Owner, SYSTEM and Administrators only; protected root with inherited child ACLs'
    configuredSyncRootsExcluded=$true; reparsePointsExcluded=$true; fileSystem='NTFS'
    freeGiB=[math]::Floor($drive.AvailableFreeSpace / 1GB)
    encryption='Windows CMS document encryption; RSA 3072 certificate; CurrentUser private key'
    syntheticEncryptionRoundtrip='PASS'; encryptionPrivateKeyExported=$false
    keyRecoveryOnAnotherDevice='NOT VERIFIED'; postgresVersion=$version
    isolatedTarget='New empty loopback-only SCRAM/TLS PostgreSQL instance; stopped after verification'
    isolatedTargetTls='PASS'; isolatedPublicTableCount=0
    hostedBackup='NOT EXECUTED'; hostedRestore='NOT EXECUTED'; hostedModified=$false
} | ConvertTo-Json
