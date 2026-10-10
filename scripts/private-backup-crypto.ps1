# Internal Windows bridge. All record-bearing input/output stays in parent pipes.
# It never connects to hosted PostgreSQL, exports a private key, or prints errors.
[CmdletBinding()]
param([Parameter(Mandatory)][string]$Root)
$ErrorActionPreference='Stop'
Set-StrictMode -Version Latest
try {
    $Root=[IO.Path]::GetFullPath($Root).TrimEnd('\')
    $owner=[Security.Principal.WindowsIdentity]::GetCurrent().User.Value
    $allowed=@($owner,'S-1-5-18','S-1-5-32-544')
    function Assert-PrivateFile([string]$path) {
        $resolved=[IO.Path]::GetFullPath($path)
        if($resolved -ne $Root -and -not $resolved.StartsWith($Root+'\',[StringComparison]::OrdinalIgnoreCase)){throw 'Directory mismatch'}
        $ancestor=$resolved
        while($ancestor){
            if((Test-Path -LiteralPath $ancestor) -and (([IO.File]::GetAttributes($ancestor) -band [IO.FileAttributes]::ReparsePoint) -ne 0)){throw 'Reparse point'}
            $ancestor=[IO.Path]::GetDirectoryName($ancestor)
        }
        $acl=Get-Acl -LiteralPath $resolved
        if($acl.GetOwner([Security.Principal.SecurityIdentifier]).Value -notin $allowed){throw 'Unsafe owner'}
        foreach($rule in $acl.Access){
            if($rule.AccessControlType -eq 'Allow' -and $rule.IdentityReference.Translate([Security.Principal.SecurityIdentifier]).Value -notin $allowed){throw 'Unsafe ACL'}
        }
    }
    Assert-PrivateFile $Root
    if(-not (Get-Acl -LiteralPath $Root).AreAccessRulesProtected){throw 'Inherited root ACL'}
    foreach($excluded in @((Join-Path $PSScriptRoot '..'),$env:OneDrive,$env:OneDriveConsumer,$env:OneDriveCommercial)){
        if($excluded){$excluded=[IO.Path]::GetFullPath($excluded).TrimEnd('\'); if($Root -eq $excluded -or $Root.StartsWith($excluded+'\',[StringComparison]::OrdinalIgnoreCase)){throw 'Sync/repository root'}}
    }
    $profileFile=Join-Path $Root 'preparation.json'; Assert-PrivateFile $profileFile
    $p=Get-Content -LiteralPath $profileFile -Raw | ConvertFrom-Json
    if ([IO.Path]::GetFullPath($p.root).TrimEnd('\') -ne $Root -or $p.sourceProject -ne 'yfknxidgphhepdtwazhn') { throw 'Profile mismatch' }
    Assert-PrivateFile $p.backups
    Assert-PrivateFile $p.recovery
    $cert=Get-Item ('Cert:\CurrentUser\My\'+$p.certificateThumbprint)
    if(-not $cert.HasPrivateKey -or $cert.NotAfter -le (Get-Date) -or $cert.NotBefore -gt (Get-Date)){throw 'Invalid certificate'}
    $rsa=[Security.Cryptography.X509Certificates.RSACertificateExtensions]::GetRSAPrivateKey($cert)
    if($rsa.KeySize -lt 3072){throw 'Insufficient key size'}
    $keyPath=Join-Path $env:APPDATA ('Microsoft\Crypto\Keys\'+$rsa.Key.UniqueName)
    $keyAncestor=[IO.Path]::GetFullPath($keyPath)
    while($keyAncestor){
        if(([IO.File]::GetAttributes($keyAncestor) -band [IO.FileAttributes]::ReparsePoint) -ne 0){throw 'Reparse key path'}
        $keyAncestor=[IO.Path]::GetDirectoryName($keyAncestor)
    }
    $keyAcl=Get-Acl -LiteralPath $keyPath
    if($keyAcl.GetOwner([Security.Principal.SecurityIdentifier]).Value -notin $allowed){throw 'Unsafe key owner'}
    foreach($rule in $keyAcl.Access){
        if($rule.AccessControlType -eq 'Allow' -and $rule.IdentityReference.Translate([Security.Principal.SecurityIdentifier]).Value -notin $allowed){throw 'Unsafe key ACL'}
    }
    $request=[Console]::In.ReadToEnd() | ConvertFrom-Json
    switch($request.mode){
        'check' { [Console]::Out.Write('OK') }
        'encrypt' {
            if($request.name -notmatch '^[a-z0-9-]+\.cms$'){throw 'Unsafe filename'}
            $path=Join-Path $p.backups $request.name
            if(Test-Path -LiteralPath $path){throw 'Refuse overwrite'}
            $message=Protect-CmsMessage -To $cert -Content $request.base64
            $envelope=[Security.Cryptography.Pkcs.EnvelopedCms]::new()
            $envelope.Decode([Convert]::FromBase64String(($message -replace '-----[^-]+-----','' -replace '\s','')))
            if($envelope.ContentEncryptionAlgorithm.Oid.Value -ne '2.16.840.1.101.3.4.1.42'){throw 'Unexpected cipher'}
            $bytes=[Text.Encoding]::ASCII.GetBytes($message)
            $file=[IO.File]::Open($path,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::None)
            try{$file.Write($bytes,0,$bytes.Length)}finally{$file.Dispose()}
            Assert-PrivateFile $path
            [Console]::Out.Write('OK')
        }
        'decrypt' {
            if($request.name -notmatch '^[a-z0-9-]+\.cms$'){throw 'Unsafe filename'}
            Assert-PrivateFile (Join-Path $p.backups $request.name)
            # This decrypted base64 goes only to the parent process's captured pipe.
            $result=Unprotect-CmsMessage -LiteralPath (Join-Path $p.backups $request.name)
            [Console]::Out.Write($result)
        }
        'local-password' {
            Add-Type -AssemblyName System.Security
            Assert-PrivateFile (Join-Path $p.recovery 'operator-password.dpapi')
            $bytes=[IO.File]::ReadAllBytes((Join-Path $p.recovery 'operator-password.dpapi'))
            $password=[Text.Encoding]::UTF8.GetString([Security.Cryptography.ProtectedData]::Unprotect($bytes,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser))
            [Console]::Out.Write($password)
        }
        default { throw 'Invalid mode' }
    }
} catch {
    # Never disclose paths, certificate IDs, row-bearing input or raw errors.
    [Console]::Error.Write('Private backup bridge failed; details redacted.')
    exit 1
}
