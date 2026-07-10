# Run Prisma migrations on server (release folder)
# Usage: powershell -ExecutionPolicy Bypass -File .\run-migrate.ps1

$ErrorActionPreference = "Stop"
$AppDir = $PSScriptRoot
Set-Location $AppDir

if (-not (Test-Path ".env")) {
    Write-Error ".env not found in $AppDir"
}

$prisma = Join-Path $AppDir "migrate\node_modules\.bin\prisma.cmd"
if (-not (Test-Path $prisma)) {
    Write-Error "Prisma CLI not found. Run from release folder with migrate/ subfolder."
}

if (-not (Test-Path (Join-Path $AppDir "node_modules\dotenv"))) {
    Write-Host "Copying dotenv for prisma.config.ts..." -ForegroundColor Yellow
    $dotenvSrc = Join-Path $AppDir "migrate\node_modules\dotenv"
    if (-not (Test-Path $dotenvSrc)) {
        Write-Error "dotenv not found in migrate/node_modules. Rebuild release package."
    }
    $nodeModulesDir = Join-Path $AppDir "node_modules"
    New-Item -ItemType Directory -Path $nodeModulesDir -Force | Out-Null
    Copy-Item -Path $dotenvSrc -Destination (Join-Path $nodeModulesDir "dotenv") -Recurse
}

Write-Host "Applying database migrations..." -ForegroundColor Cyan
& $prisma migrate deploy
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Migrations applied successfully." -ForegroundColor Green
