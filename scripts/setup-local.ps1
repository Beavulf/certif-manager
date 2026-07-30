# Local setup (no Docker)
# Run: powershell -ExecutionPolicy Bypass -File .\scripts\setup-local.ps1

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

Write-Host "=== Cert Manager local setup ===" -ForegroundColor Cyan

$nodeVersion = node -v 2>$null
if (-not $nodeVersion) {
    Write-Error "Node.js not found. Install Node.js 20 LTS from https://nodejs.org/"
}
Write-Host "Node.js: $nodeVersion" -ForegroundColor Green

if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "Created .env - edit DB_URL, AUTH_URL, RustFS" -ForegroundColor Yellow
}

Write-Host "Installing npm dependencies..." -ForegroundColor Cyan
npm install

Write-Host "Prisma generate + migrations..." -ForegroundColor Cyan
npx prisma generate
npx prisma migrate deploy

Write-Host ""
Write-Host "=== Done ===" -ForegroundColor Green
Write-Host "Dev:        npm run dev     -> http://localhost:3003"
Write-Host "Production: npm run build && npm run start"
