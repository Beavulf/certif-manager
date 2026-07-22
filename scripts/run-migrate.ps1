# Run Prisma migrations on server (release folder)
# Usage:
#   powershell -ExecutionPolicy Bypass -File .\run-migrate.ps1
#   powershell -ExecutionPolicy Bypass -File .\run-migrate.ps1 -Pause

param(
    [switch]$Pause
)

$ErrorActionPreference = "Stop"
$AppDir = $PSScriptRoot
Set-Location $AppDir

$exitCode = 0

function Wait-ForKey {
    param([string]$Message = "Press Enter to close")
    Write-Host ""
    Read-Host $Message
}

try {
    if (-not (Test-Path ".env")) {
        throw ".env not found in $AppDir"
    }

    $prisma = Join-Path $AppDir "migrate\node_modules\.bin\prisma.cmd"
    if (-not (Test-Path $prisma)) {
        throw "Prisma CLI not found. Run from release folder with migrate/ subfolder."
    }

    if (-not (Test-Path (Join-Path $AppDir "node_modules\dotenv"))) {
        Write-Host "Copying dotenv for prisma.config.ts..." -ForegroundColor Yellow
        $dotenvSrc = Join-Path $AppDir "migrate\node_modules\dotenv"
        if (-not (Test-Path $dotenvSrc)) {
            throw "dotenv not found in migrate/node_modules. Rebuild release package."
        }
        $nodeModulesDir = Join-Path $AppDir "node_modules"
        New-Item -ItemType Directory -Path $nodeModulesDir -Force | Out-Null
        Copy-Item -Path $dotenvSrc -Destination (Join-Path $nodeModulesDir "dotenv") -Recurse
    }

    Write-Host "Applying database migrations..." -ForegroundColor Cyan
    & $prisma migrate deploy
    if ($LASTEXITCODE -ne 0) {
        throw "prisma migrate deploy failed with exit code $LASTEXITCODE"
    }

    Write-Host "Migrations applied successfully." -ForegroundColor Green
} catch {
    $exitCode = 1
    Write-Host ""
    Write-Host "=== Migration error ===" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    if ($_.ScriptStackTrace) {
        Write-Host $_.ScriptStackTrace -ForegroundColor DarkRed
    }
} finally {
    if ($exitCode -ne 0 -or $Pause) {
        Wait-ForKey -Message $(if ($exitCode -ne 0) { "Migration failed. Press Enter to close" } else { "Press Enter to close" })
    }
}

exit $exitCode
