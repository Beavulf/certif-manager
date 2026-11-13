# Run daily notification check via HTTP (for Windows Task Scheduler).
# Usage on server (from app folder):
#   powershell -ExecutionPolicy Bypass -File .\run-daily-check.ps1
#
# Schedule at 08:00 (or your cronCheckTime) with Task Scheduler pointing to this script.

$ErrorActionPreference = "Stop"
$AppDir = $PSScriptRoot
Set-Location $AppDir

if (-not (Test-Path ".env")) {
    throw ".env not found in $AppDir"
}

# Load PORT and CRON_SECRET from .env (simple KEY=VALUE lines)
Get-Content ".env" | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith("#")) { return }
    $parts = $line.Split("=", 2)
    if ($parts.Count -ne 2) { return }
    $name = $parts[0].Trim()
    $value = $parts[1].Trim().Trim('"').Trim("'")
    if ($name -eq "PORT" -or $name -eq "CRON_SECRET") {
        Set-Item -Path "Env:$name" -Value $value
    }
}

if (-not $env:CRON_SECRET) {
    throw "CRON_SECRET is missing in .env"
}

$port = if ($env:PORT) { $env:PORT } else { "3003" }
$url = "http://127.0.0.1:$port/api/cron/daily-check"

Write-Host "Calling $url ..." -ForegroundColor Cyan
$headers = @{ Authorization = "Bearer $($env:CRON_SECRET)" }
$response = Invoke-RestMethod -Uri $url -Method POST -Headers $headers -TimeoutSec 300
$response | ConvertTo-Json -Depth 6
Write-Host "Daily check finished." -ForegroundColor Green
