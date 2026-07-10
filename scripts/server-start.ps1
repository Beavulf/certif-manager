# First start on server (Windows, no Docker)
# Run from release folder: powershell -ExecutionPolicy Bypass -File .\server-start.ps1

$ErrorActionPreference = "Stop"
$AppDir = $PSScriptRoot
Set-Location $AppDir

Write-Host "=== Cert Manager server start ===" -ForegroundColor Cyan

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Error "Node.js not found. Install Node.js 20 LTS from https://nodejs.org/"
}

if (-not (Test-Path ".env")) {
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env"
        Write-Host "Created .env - edit DB_URL, AUTH_URL, RustFS and run again" -ForegroundColor Yellow
        exit 1
    }
    Write-Error ".env not found. Create it from .env.example"
}

Write-Host "Applying database migrations..." -ForegroundColor Cyan
powershell -ExecutionPolicy Bypass -File (Join-Path $AppDir "run-migrate.ps1")
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Starting app on port ${env:PORT:-3000}..." -ForegroundColor Green
Write-Host "URL: http://localhost:${env:PORT:-3000}" -ForegroundColor Green
if (-not $env:COOKIE_SECURE) {
    $env:COOKIE_SECURE = "false"
}
$env:HOSTNAME = "0.0.0.0"
node server.js
