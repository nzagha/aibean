param([string]$ArchivePath = (Join-Path $PSScriptRoot '..\aiBean_Source_Files_Git_Import.zip'))
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$repoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$manifestPath = Join-Path $repoRoot 'docs\source-of-truth\SOURCE_MANIFEST.json'
$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
if (-not (Test-Path -LiteralPath $ArchivePath -PathType Leaf)) { throw 'Source ZIP is not accessible; no binary import or checksum verification performed.' }
$archive = [IO.Compression.ZipFile]::OpenRead([IO.Path]::GetFullPath($ArchivePath))
try {
  $verified = @()
  $paths = @($archive.Entries | Where-Object { -not $_.FullName.EndsWith('/') } | ForEach-Object { $_.FullName.Replace('\','/') })
  if ($paths.Count -ne $manifest.sources.Count -or @($paths | Where-Object { $_ -cnotin $manifest.sources.path }).Count -gt 0) { throw 'Archive contains unexpected relative paths; nothing imported.' }
  foreach ($source in $manifest.sources) {
    $filename = [IO.Path]::GetFileName($source.path)
    $entries = @($archive.Entries | Where-Object { $_.FullName.Replace('\','/') -ceq $source.path })
    if ($entries.Count -ne 1 -or $entries[0].Length -gt 20971520) { throw "Missing, duplicate or oversized source entry: $filename" }
    $stream = $entries[0].Open()
    $buffer = [IO.MemoryStream]::new()
    try { $stream.CopyTo($buffer); $bytes = $buffer.ToArray() } finally { $stream.Dispose(); $buffer.Dispose() }
    $hash = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($bytes)).ToLowerInvariant()
    if ($hash -cne $source.expectedSha256) { throw "Original checksum mismatch: $filename. No source files imported." }
    $destination = [IO.Path]::GetFullPath((Join-Path $repoRoot $source.path))
    $expectedDirectory = [IO.Path]::GetFullPath((Join-Path $repoRoot 'docs\source-of-truth')) + [IO.Path]::DirectorySeparatorChar
    if (-not $destination.StartsWith($expectedDirectory, [StringComparison]::OrdinalIgnoreCase)) { throw 'Destination escaped source directory.' }
    if ((Test-Path -LiteralPath $destination) -and ((Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash.ToLowerInvariant() -cne $hash)) { throw "Existing original differs; refusing replacement: $filename" }
    $verified += @{ source = $source; destination = $destination; bytes = $bytes; hash = $hash }
  }
  # Check every original before writing any binary.
  foreach ($item in $verified) {
    if (-not (Test-Path -LiteralPath $item.destination)) { [IO.File]::WriteAllBytes($item.destination, $item.bytes) }
    $item.source.verifiedSha256 = $item.hash
    $item.source.status = 'original-binary-byte-verified'
  }
  $manifest.archiveStatus = 'two-originals-imported-and-verified'
  $manifest | Add-Member -NotePropertyName archiveSha256 -NotePropertyValue ((Get-FileHash -LiteralPath $ArchivePath -Algorithm SHA256).Hash.ToLowerInvariant()) -Force
  $manifest | Add-Member -NotePropertyName verifiedAtUtc -NotePropertyValue ((Get-Date).ToUniversalTime().ToString('o')) -Force
  $manifest.activeRepositoryTaxonomy.originalBinaryVerifiedInThisMilestone = $true
  $manifest | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath $manifestPath -Encoding utf8
  Add-Content -LiteralPath (Join-Path $repoRoot 'docs\source-of-truth\SOURCE_CHANGELOG.md') -Value "`n## $((Get-Date).ToUniversalTime().ToString('yyyy-MM-dd')) — Original import`n`nBoth owner-specified original binaries passed exact SHA-256 verification and were imported unchanged, preserving the archive's docs/source-of-truth/ relative paths. Active taxonomy was not replaced. Supabase Auth remains the owner-approved identity direction. Neither this import nor historical v1 provenance supersedes a later approved v1.1 package.`n"
  Write-Output 'Both original binary checksums PASS; active taxonomy unchanged.'
} finally { $archive.Dispose() }
