param(
  [switch]$Clean
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

if ($Clean -and (Test-Path "release")) {
  Remove-Item -LiteralPath "release" -Recurse -Force
}

if (-not (Test-Path "node_modules")) {
  npm ci
}

npm run dist:win

Write-Host ""
Write-Host "Installateur prêt dans le dossier release:" -ForegroundColor Green
Get-ChildItem -Path "release" -Filter "*.exe" | ForEach-Object { Write-Host " - $($_.FullName)" }
