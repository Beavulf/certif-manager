# Проверка живости приложения: GET /api/health (для Планировщика заданий Windows).
# Рекомендуемый интервал: каждые 5 минут.
#
#   powershell -ExecutionPolicy Bypass -File .\watchdog.ps1
#
# С ключом -Restart дополнительно пробует перезапустить процесс через PM2
# (работает, если задача и PM2 выполняются от одного пользователя):
#
#   powershell -ExecutionPolicy Bypass -File .\watchdog.ps1 -Restart
#
# Все сбои пишутся в logs\watchdog.log рядом со скриптом.

param([switch]$Restart)

$ErrorActionPreference = "Stop"
$AppDir = $PSScriptRoot
Set-Location $AppDir

if (-not (Test-Path ".env")) {
    throw ".env not found in $AppDir"
}

# Load PORT from .env (simple KEY=VALUE lines)
Get-Content ".env" | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith("#")) { return }
    $parts = $line.Split("=", 2)
    if ($parts.Count -ne 2) { return }
    $name = $parts[0].Trim()
    $value = $parts[1].Trim().Trim('"').Trim("'")
    if ($name -eq "PORT") {
        Set-Item -Path "Env:$name" -Value $value
    }
}

$port = if ($env:PORT) { $env:PORT } else { "3003" }
$url = "http://127.0.0.1:$port/api/health"

function Write-WatchdogLog([string]$message) {
    $logDir = Join-Path $AppDir "logs"
    if (-not (Test-Path $logDir)) {
        New-Item -ItemType Directory -Path $logDir | Out-Null
    }
    $stamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Add-Content -Path (Join-Path $logDir "watchdog.log") -Value "$stamp $message"
}

try {
    $response = Invoke-RestMethod -Uri $url -Method GET -TimeoutSec 30
    if (-not $response.ok) {
        throw "health endpoint returned ok=false"
    }
    exit 0
} catch {
    $reason = $_.Exception.Message
    Write-Warning "cert-manager health check FAILED: $reason"
    Write-WatchdogLog "health check FAILED: $reason"

    if ($Restart) {
        try {
            pm2 restart cert-manager 2>$null
            if ($LASTEXITCODE -eq 0) {
                Write-WatchdogLog "restarted via pm2"
            } else {
                Write-WatchdogLog "pm2 restart failed (exit $LASTEXITCODE)"
            }
        } catch {
            Write-WatchdogLog "pm2 restart unavailable: $($_.Exception.Message)"
        }
    }
    exit 1
}
