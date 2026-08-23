[CmdletBinding()]
param(
  [string]$OutputPath = 'artifacts/wilmas-fashion-lightsail.tar.gz'
)

$ErrorActionPreference = 'Stop'
$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$repositoryRoot = (Resolve-Path (Join-Path $scriptRoot '..')).Path
$repositoryUri = [Uri]($repositoryRoot.TrimEnd([IO.Path]::DirectorySeparatorChar) + [IO.Path]::DirectorySeparatorChar)
$artifactsRoot = [IO.Path]::GetFullPath((Join-Path $repositoryRoot 'artifacts'))
$resolvedOutput = if ([IO.Path]::IsPathRooted($OutputPath)) {
  [IO.Path]::GetFullPath($OutputPath)
} else {
  [IO.Path]::GetFullPath((Join-Path $repositoryRoot $OutputPath))
}
$artifactPrefix = $artifactsRoot.TrimEnd([IO.Path]::DirectorySeparatorChar) + [IO.Path]::DirectorySeparatorChar

if (-not $resolvedOutput.StartsWith($artifactPrefix, [StringComparison]::OrdinalIgnoreCase)) {
  throw 'OutputPath must remain inside the repository artifacts directory.'
}
if (-not $resolvedOutput.EndsWith('.tar.gz', [StringComparison]::OrdinalIgnoreCase)) {
  throw 'OutputPath must end in .tar.gz.'
}

$manifestPath = "$resolvedOutput.manifest.txt"
$checksumPath = "$resolvedOutput.sha256"
foreach ($candidate in @($resolvedOutput, $manifestPath, $checksumPath)) {
  if (Test-Path -LiteralPath $candidate) {
    throw "Refusing to overwrite existing artifact output: $candidate"
  }
}

$trackedPaths = @(
  'backend/package.json',
  'backend/package-lock.json',
  'backend/src',
  'backend/prisma/schema.prisma',
  'backend/prisma/migrations',
  'backend/scripts/migration/import-postgresql-data.js',
  'backend/scripts/migration/reconcile-product-images.js',
  'backend/scripts/migration/rotate-imported-password.js',
  'backend/scripts/migration/validate-export.js',
  'backend/scripts/migration/validate-import.js',
  'ops/lightsail'
)
$trackedFiles = @(& git -C $repositoryRoot ls-files --cached --others --exclude-standard -- @trackedPaths)
if ($LASTEXITCODE -ne 0) {
  throw 'Unable to enumerate the tracked runtime allowlist.'
}

$distRoot = Join-Path $repositoryRoot 'frontend/dist'
if (-not (Test-Path -LiteralPath (Join-Path $distRoot 'index.html') -PathType Leaf)) {
  throw 'frontend/dist is missing. Run npm run build -- --mode lightsail first.'
}
$distFiles = @(Get-ChildItem -LiteralPath $distRoot -Recurse -File | ForEach-Object {
  [Uri]::UnescapeDataString($repositoryUri.MakeRelativeUri([Uri]$_.FullName).ToString())
})

$files = @($trackedFiles + $distFiles | Where-Object { $_ } | Sort-Object -Unique)
$requiredFiles = @(
  'backend/package.json',
  'backend/package-lock.json',
  'backend/prisma/schema.prisma',
  'backend/prisma/migrations/20260823000000_add_social_auth/migration.sql',
  'backend/prisma/migrations/20260823010000_add_product_active/migration.sql',
  'backend/src/server.js',
  'backend/src/providers/auth/socialAuthProviders.js',
  'backend/scripts/migration/import-postgresql-data.js',
  'backend/scripts/migration/rotate-imported-password.js',
  'backend/scripts/migration/validate-export.js',
  'backend/scripts/migration/validate-import.js',
  'frontend/dist/index.html',
  'ops/lightsail/provision-base.sh',
  'ops/lightsail/restore-postgresql.sh',
  'ops/lightsail/restore-uploads.sh',
  'ops/lightsail/smoke-test.sh'
)
foreach ($required in $requiredFiles) {
  if ($files -notcontains $required) {
    throw "Required runtime file is absent from the artifact allowlist: $required"
  }
}

$forbiddenPath = [regex]'(?i)(^|/)(?:node_modules|\.git|tests?|coverage|migration-exports|uploads|backups)(?:/|$)|(^|/)\.env(?:\.|$)|terraform\.tfstate|\.tfplan$|\.(?:db|sqlite|sqlite3|pem|p12|pfx|key)$'
foreach ($relativePath in $files) {
  if ($relativePath -match '(^|/)\.\.(/|$)' -or [IO.Path]::IsPathRooted($relativePath) -or $forbiddenPath.IsMatch($relativePath)) {
    throw "Forbidden artifact path: $relativePath"
  }
  $fullPath = [IO.Path]::GetFullPath((Join-Path $repositoryRoot $relativePath))
  if (-not $fullPath.StartsWith($repositoryRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
    throw "Artifact path escaped the repository: $relativePath"
  }
  $item = Get-Item -LiteralPath $fullPath
  if (-not $item.PSIsContainer -and ($item.Attributes -band [IO.FileAttributes]::ReparsePoint)) {
    throw "Symbolic links are not allowed in the artifact: $relativePath"
  }
}

$frontendTextFiles = $distFiles | Where-Object { $_ -match '\.(?:css|html|js|json|map|svg)$' }
$forbiddenFrontendContent = '(?i)wilmas-fashion\.onrender\.com|localhost|127\.0\.0\.1:4000|postgres(?:ql)?://|-----BEGIN [A-Z ]*PRIVATE KEY-----'
foreach ($relativePath in $frontendTextFiles) {
  if (Select-String -LiteralPath (Join-Path $repositoryRoot $relativePath) -Pattern $forbiddenFrontendContent -Quiet) {
    throw "Frontend build contains a forbidden deployment origin or secret pattern: $relativePath"
  }
}

New-Item -ItemType Directory -Path $artifactsRoot -Force | Out-Null
$utf8NoBom = [Text.UTF8Encoding]::new($false)
[IO.File]::WriteAllLines($manifestPath, $files, $utf8NoBom)

Push-Location $repositoryRoot
try {
  & tar -czf $resolvedOutput -T $manifestPath
  if ($LASTEXITCODE -ne 0) {
    throw 'tar failed while building the Lightsail artifact.'
  }
} finally {
  Pop-Location
}

$archiveEntries = @(& tar -tzf $resolvedOutput | ForEach-Object { $_.TrimEnd('/') } | Where-Object { $_ })
if ($LASTEXITCODE -ne 0 -or (Compare-Object $files $archiveEntries)) {
  throw 'Artifact contents do not match the generated allowlist manifest.'
}

$hash = (Get-FileHash -LiteralPath $resolvedOutput -Algorithm SHA256).Hash.ToLowerInvariant()
[IO.File]::WriteAllText($checksumPath, "$hash  $([IO.Path]::GetFileName($resolvedOutput))`n", [Text.Encoding]::ASCII)
$uncompressedBytes = ($files | ForEach-Object { (Get-Item -LiteralPath (Join-Path $repositoryRoot $_)).Length } | Measure-Object -Sum).Sum

[pscustomobject]@{
  event             = 'lightsail_artifact_built'
  files             = $files.Count
  uncompressedBytes = $uncompressedBytes
  archiveBytes      = (Get-Item -LiteralPath $resolvedOutput).Length
  archive           = $resolvedOutput
  manifest          = $manifestPath
  checksum          = $checksumPath
} | ConvertTo-Json -Compress
