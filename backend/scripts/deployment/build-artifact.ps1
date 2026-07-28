param([string]$Output = "../artifacts/wilmas-backend.zip")
$ErrorActionPreference = "Stop"
$backendRoot = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
$outputPath = [System.IO.Path]::GetFullPath((Join-Path $backendRoot $Output))
$staging = Join-Path ([System.IO.Path]::GetTempPath()) ("wilmas-backend-" + [guid]::NewGuid())
New-Item -ItemType Directory -Path $staging | Out-Null
try {
  $excluded = @("node_modules", "uploads", "backups", "migration-exports", ".env", "tests")
  Get-ChildItem -LiteralPath $backendRoot -Force | Where-Object { $excluded -notcontains $_.Name } | Copy-Item -Destination $staging -Recurse
  New-Item -ItemType Directory -Force -Path (Split-Path $outputPath) | Out-Null
  Compress-Archive -Path (Join-Path $staging "*") -DestinationPath $outputPath -Force
  Write-Output $outputPath
} finally {
  if ($staging.StartsWith([System.IO.Path]::GetTempPath())) { Remove-Item -LiteralPath $staging -Recurse -Force }
}
