# First start on server (Windows, no Docker)
# Run from release folder: powershell -ExecutionPolicy Bypass -File .\server-start.ps1

$ErrorActionPreference = "Stop"
$AppDir = $PSScriptRoot
Set-Location $AppDir

function Wait-ForKey {
    param([string]$Message = "Press Enter to close")
    Write-Host ""
    Read-Host $Message
}

$exitCode = 0

try {
    Write-Host "=== Cert Manager server start ===" -ForegroundColor Cyan

    if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
        throw "Node.js not found. Install Node.js 20 LTS from https://nodejs.org/"
    }

    if (-not (Test-Path ".env")) {
        if (Test-Path ".env.example") {
            Copy-Item ".env.example" ".env"
            throw "Created .env - edit DB_URL, AUTH_URL, RustFS and run again"
        }
        throw ".env not found. Create it from .env.example"
    }

    Write-Host "Applying database migrations..." -ForegroundColor Cyan
    powershell -ExecutionPolicy Bypass -File (Join-Path $AppDir "run-migrate.ps1")
    if ($LASTEXITCODE -ne 0) {
        throw "Database migration failed (see output above)"
    }

    if (-not $env:PORT) {
        $env:PORT = "3003"
    }
    Write-Host "Starting app on port $($env:PORT)..." -ForegroundColor Green
    Write-Host "URL: http://localhost:$($env:PORT)" -ForegroundColor Green
    if (-not $env:COOKIE_SECURE) {
        $env:COOKIE_SECURE = "false"
    }
    $env:HOSTNAME = "0.0.0.0"

    # Prefer standalone-start.cjs so cron/notifications boot even when
    # Next.js 16 skips instrumentation.ts under `node server.js`.
    $entry = if (Test-Path (Join-Path $AppDir "standalone-start.cjs")) {
        "standalone-start.cjs"
    } else {
        "server.js"
    }
    Write-Host "Entry: $entry" -ForegroundColor Cyan
    node $entry
    if ($LASTEXITCODE -ne 0) {
        throw "node $entry exited with code $LASTEXITCODE"
    }
} catch {
    $exitCode = 1
    Write-Host ""
    Write-Host "=== Server start error ===" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Wait-ForKey -Message "Press Enter to close"
}

exit $exitCode
