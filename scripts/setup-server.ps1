# Initial server setup (PostgreSQL + RustFS already installed, no Docker)
# Run from project root: powershell -ExecutionPolicy Bypass -File .\scripts\setup-server.ps1

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

Write-Host "=== Cert Manager server setup ===" -ForegroundColor Cyan

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Error "Install Node.js 20 LTS from https://nodejs.org/"
}
Write-Host "Node.js: $(node -v)" -ForegroundColor Green

if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "Created .env - fill DB_URL, AUTH_URL, RustFS and run again" -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "Before migrations create database in PostgreSQL:" -ForegroundColor Yellow
Write-Host "  CREATE DATABASE cert_manager;" -ForegroundColor Yellow
Write-Host ""
Write-Host "RustFS: start service, console http://127.0.0.1:9001" -ForegroundColor Yellow
Write-Host "        default login: rustfsadmin / rustfsadmin" -ForegroundColor Yellow
Write-Host ""

Write-Host "Installing dependencies..." -ForegroundColor Cyan
npm ci --omit=dev

Write-Host "Database migrations..." -ForegroundColor Cyan
npx prisma migrate deploy

Write-Host "Production build..." -ForegroundColor Cyan
$env:NODE_ENV = "production"
npm run build

Write-Host ""
Write-Host "=== Done ===" -ForegroundColor Green
Write-Host "Start: npm run start"
Write-Host "Or:    powershell -ExecutionPolicy Bypass -File .\scripts\server-start.ps1"
