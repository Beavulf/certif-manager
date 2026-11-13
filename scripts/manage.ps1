# ============================================================
# Cert Manager — панель управления на сервере.
# Для администраторов без опыта программирования.
#
# Запуск: двойной клик по manage.bat, или в консоли:
#   powershell -ExecutionPolicy Bypass -File .\manage.ps1
#
# Режим одной команды (без меню, для планировщика/опытных):
#   powershell -ExecutionPolicy Bypass -File .\manage.ps1 -Action status
#   Действия: status | start | stop | restart | migrate | diagnostics
# ============================================================

param(
    [string]$Action = ""
)

$ErrorActionPreference = "Stop"
$AppDir = $PSScriptRoot
Set-Location $AppDir

$script:AppPort = "3003"
$script:EnvVars = @{}

# ───────────────────────── helpers ─────────────────────────

function Read-DotEnv {
    $script:EnvVars = @{}
    $envPath = Join-Path $AppDir ".env"
    if (-not (Test-Path $envPath)) { return }
    Get-Content $envPath -Encoding UTF8 | ForEach-Object {
        $line = $_.Trim()
        if (-not $line -or $line.StartsWith("#")) { return }
        $parts = $line.Split("=", 2)
        if ($parts.Count -ne 2) { return }
        $script:EnvVars[$parts[0].Trim()] = $parts[1].Trim().Trim('"').Trim("'")
    }
    if ($script:EnvVars["PORT"]) { $script:AppPort = $script:EnvVars["PORT"] }
}

function Test-TcpPort {
    param([string]$TargetHost, [int]$TargetPort, [int]$TimeoutMs = 2000)
    $client = New-Object System.Net.Sockets.TcpClient
    try {
        $async = $client.BeginConnect($TargetHost, $TargetPort, $null, $null)
        if ($async.AsyncWaitHandle.WaitOne($TimeoutMs)) {
            $client.EndConnect($async) | Out-Null
            return $true
        }
        return $false
    } catch {
        return $false
    } finally {
        $client.Close()
    }
}

function Get-AppHealth {
    # running | degraded | down
    try {
        $response = Invoke-RestMethod -Uri "http://127.0.0.1:$AppPort/api/health" -Method GET -TimeoutSec 5
        if ($response.ok) { return "running" }
        return "degraded"
    } catch {
        return "down"
    }
}

function Get-Pm2Process {
    if (-not (Get-Command pm2 -ErrorAction SilentlyContinue)) { return $null }
    try {
        $listJson = (& pm2 jlist 2>$null | Out-String).Trim()
        if (-not $listJson) { return $null }
        $list = $listJson | ConvertFrom-Json
        foreach ($proc in $list) {
            if ($proc.name -eq "cert-manager") { return $proc }
        }
    } catch { }
    return $null
}

function Get-DbTarget {
    # Разбор DB_URL → @{ Host; Port; Database }
    $url = $script:EnvVars["DB_URL"]
    if (-not $url) { return $null }
    if ($url -match '^postgresql://[^:@/]+:[^@]*@([^:/]+):(\d+)/([^?]+)') {
        return @{ Host = $Matches[1]; Port = [int]$Matches[2]; Database = $Matches[3] }
    }
    if ($url -match '^postgresql://[^:@/]+:[^@]*@([^:/]+)/([^?]+)') {
        return @{ Host = $Matches[1]; Port = 5432; Database = $Matches[2] }
    }
    return $null
}

function Get-MigrationState {
    # → @{ Ready = bool; Pending = int; Detail = string }
    $prisma = Join-Path $AppDir "migrate\node_modules\.bin\prisma.cmd"
    if (-not (Test-Path $prisma)) {
        return @{ Ready = $false; Pending = 0; Detail = "Prisma CLI не найден (нет папки migrate/). Скрипт нужно запускать из папки приложения (release)." }
    }
    if (-not (Get-DbTarget)) {
        return @{ Ready = $false; Pending = 0; Detail = "Не удалось разобрать DB_URL в .env" }
    }
    $db = Get-DbTarget
    if (-not (Test-TcpPort -TargetHost $db.Host -TargetPort $db.Port)) {
        return @{ Ready = $false; Pending = 0; Detail = "База данных недоступна, проверка миграций невозможна" }
    }

    $output = ""
    $prevEap = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        $output = (& $prisma migrate status 2>&1 | Out-String)
    } catch {
        return @{ Ready = $false; Pending = 0; Detail = "Ошибка запуска prisma: $($_.Exception.Message)" }
    } finally {
        $ErrorActionPreference = $prevEap
    }

    if ($output -match "up to date") {
        return @{ Ready = $true; Pending = 0; Detail = "База данных обновлена" }
    }
    if ($output -match "Can't reach database server" -or $output -match "P1001") {
        return @{ Ready = $false; Pending = 0; Detail = "База данных недоступна для проверки миграций" }
    }
    $pendingLines = @($output | Select-String -Pattern '^\s*\d{14}_')
    if ($pendingLines.Count -gt 0) {
        return @{ Ready = $false; Pending = $pendingLines.Count; Detail = "Есть неприменённые обновления базы: $($pendingLines.Count)" }
    }
    return @{ Ready = $false; Pending = 0; Detail = ($output.Trim() -split "`r?`n")[-1] }
}

function Write-StatusLine {
    param([string]$State, [string]$Title, [string]$Detail, [string]$Hint = "")
    # State: ok | warn | error
    $marker = switch ($State) {
        "ok"    { " [+] " }
        "warn"  { " [!] " }
        default { " [X] " }
    }
    $color = switch ($State) {
        "ok"    { "Green" }
        "warn"  { "Yellow" }
        default { "Red" }
    }
    Write-Host $marker -ForegroundColor $color -NoNewline
    Write-Host "$Title" -NoNewline
    if ($Detail) { Write-Host " — $Detail" -NoNewline }
    Write-Host ""
    if ($Hint -and $State -ne "ok") {
        Write-Host "      Что делать: $Hint" -ForegroundColor Yellow
    }
}

function Show-Status {
    Read-DotEnv

    # 1. .env
    if (-not (Test-Path (Join-Path $AppDir ".env"))) {
        Write-StatusLine "error" "Файл .env" "не найден" "Скопируйте .env.example в .env и заполните настройки"
        return
    }
    $envProblems = @()
    if ($script:EnvVars["DB_URL"] -match "ВАШ_ПАРОЛЬ") { $envProblems += "в DB_URL не заменён пароль" }
    if (-not $script:EnvVars["DB_URL"]) { $envProblems += "DB_URL пуст" }
    if (-not $script:EnvVars["AUTH_URL"]) { $envProblems += "AUTH_URL пуст" }
    if ($script:EnvVars["CRON_SECRET"] -match "change-me") { $envProblems += "CRON_SECRET не заменён на случайную строку" }
    if ($envProblems.Count -gt 0) {
        Write-StatusLine "warn" "Файл .env" ($envProblems -join "; ") "Отредактируйте .env в блокноте и перезапустите приложение"
    } else {
        Write-StatusLine "ok" "Файл .env" "настройки на месте"
    }

    # 2. Node.js
    $node = Get-Command node -ErrorAction SilentlyContinue
    if ($node) {
        $nodeVersion = (& node -v) 2>$null
        Write-StatusLine "ok" "Node.js" "версия $nodeVersion"
    } else {
        Write-StatusLine "error" "Node.js" "не найден" "Установите Node.js 20 LTS с nodejs.org и перезапустите этот скрипт"
    }

    # 3. PostgreSQL
    $db = Get-DbTarget
    if ($db -and (Test-TcpPort -TargetHost $db.Host -TargetPort $db.Port)) {
        Write-StatusLine "ok" "База данных PostgreSQL" "$($db.Host):$($db.Port), база «$($db.Database)»"
    } else {
        $target = if ($db) { "$($db.Host):$($db.Port)" } else { "адрес из DB_URL не распознан" }
        Write-StatusLine "error" "База данных PostgreSQL" "недоступна ($target)" "Проверьте пароль в DB_URL (файл .env) и что служба PostgreSQL запущена (services.msc)"
    }

    # 4. RustFS
    $minioHost = if ($script:EnvVars["MINIO_ENDPOINT"]) { $script:EnvVars["MINIO_ENDPOINT"] } else { "localhost" }
    $minioPort = if ($script:EnvVars["MINIO_PORT"]) { $script:EnvVars["MINIO_PORT"] } else { "9000" }
    if (Test-TcpPort -TargetHost $minioHost -TargetPort $minioPort) {
        Write-StatusLine "ok" "Хранилище файлов RustFS" "$minioHost`:$minioPort"
    } else {
        Write-StatusLine "error" "Хранилище файлов RustFS" "недоступно ($minioHost`:$minioPort)" "Откройте RustFS и нажмите Start Service"
    }

    # 5. Миграции базы
    if ($db -and (Test-TcpPort -TargetHost $db.Host -TargetPort $db.Port)) {
        $mig = Get-MigrationState
        if ($mig.Ready) {
            Write-StatusLine "ok" "Обновления базы (миграции)" $mig.Detail
        } elseif ($mig.Pending -gt 0) {
            Write-StatusLine "warn" "Обновления базы (миграции)" $mig.Detail "Выберите пункт 4 в меню — применятся автоматически"
        } else {
            Write-StatusLine "warn" "Обновления базы (миграции)" $mig.Detail ""
        }
    } else {
        Write-StatusLine "warn" "Обновления базы (миграции)" "не проверить — база недоступна" ""
    }

    # 6. Приложение
    $health = Get-AppHealth
    if ($health -eq "running") {
        Write-StatusLine "ok" "Приложение" "работает: http://localhost:$AppPort"
    } elseif ($health -eq "degraded") {
        Write-StatusLine "warn" "Приложение" "отвечает, но фоновые задачи не поднялись" "Перезапустите приложение (пункт 2); подробности — пункт 6"
    } else {
        $pm2Proc = Get-Pm2Process
        $hint = "Запустите приложение (пункт 1). Если не запускается — посмотрите логи (пункт 6)"
        if ($pm2Proc) { $hint = "Процесс в PM2 есть, но не отвечает. Перезапустите (пункт 2), затем логи (пункт 6)" }
        Write-StatusLine "error" "Приложение" "не отвечает на http://localhost:$AppPort" $hint
    }

    # 7. PM2
    $pm2Proc = Get-Pm2Process
    if ($pm2Proc) {
        $state = $pm2Proc.pm2_env.status
        $stateRu = switch ($state) { "online" { "работает" } "stopped" { "остановлен" } default { $state } }
        Write-StatusLine "ok" "Служба автозапуска PM2" "процесс «cert-manager»: $stateRu"
    } elseif (Get-Command pm2 -ErrorAction SilentlyContinue) {
        Write-StatusLine "warn" "Служба автозапуска PM2" "установлена, но процесс «cert-manager» не создан" "Запустите приложение через пункт 1 этого меню"
    } else {
        Write-StatusLine "warn" "Служба автозапуска PM2" "не установлена — приложение не переживёт перезагрузку сервера" "Попросите ИТ-специалиста: npm install -g pm2 pm2-windows-startup, затем pm2-startup install"
    }

    # 8. Задачи Планировщика (информационно)
    $taskInfo = @()
    foreach ($t in @(@("cert-manager-daily-check", "ежедневная проверка 08:00"), @("cert-manager-watchdog", "сторож каждые 5 мин"))) {
        $task = $null
        try { $task = Get-ScheduledTask -TaskName $t[0] -ErrorAction SilentlyContinue } catch { }
        $taskInfo += "$(if ($task) { '[+]' } else { '[!]' }) $($t[1])"
    }
    Write-Host " [i]   Задачи Планировщика: $($taskInfo -join ', ')" -ForegroundColor DarkCyan
}

# ───────────────────────── actions ─────────────────────────

function Wait-AppReady {
    param([int]$Seconds = 30)
    for ($i = 1; $i -le $Seconds; $i++) {
        if ((Get-AppHealth) -eq "running") { return $true }
        Start-Sleep -Seconds 1
    }
    return $false
}

function Invoke-StartApp {
    if ((Get-AppHealth) -eq "running") {
        Write-Host "Приложение уже запущено: http://localhost:$AppPort" -ForegroundColor Yellow
        return
    }

    $node = Get-Command node -ErrorAction SilentlyContinue
    if (-not $node) {
        Write-Host "[X] Node.js не найден. Установите Node.js 20 LTS с nodejs.org" -ForegroundColor Red
        return
    }

    $env:PORT = $script:AppPort
    $env:HOSTNAME = "0.0.0.0"
    if ($script:EnvVars["COOKIE_SECURE"]) { $env:COOKIE_SECURE = $script:EnvVars["COOKIE_SECURE"] }

    if (Get-Command pm2 -ErrorAction SilentlyContinue) {
        $pm2Proc = Get-Pm2Process
        if ($pm2Proc) {
            Write-Host "Запуск через PM2..." -ForegroundColor Cyan
            & pm2 restart cert-manager | Out-Null
        } else {
            Write-Host "Создание процесса в PM2..." -ForegroundColor Cyan
            $entry = if (Test-Path (Join-Path $AppDir "standalone-start.cjs")) { "standalone-start.cjs" } else { "server.js" }
            & pm2 start $entry --name cert-manager | Out-Null
            & pm2 save | Out-Null
        }
    } else {
        Write-Host "Запуск как фонового процесса (PM2 не установлен)..." -ForegroundColor Cyan
        $logDir = Join-Path $AppDir "logs"
        if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir | Out-Null }
        $entry = if (Test-Path (Join-Path $AppDir "standalone-start.cjs")) { "standalone-start.cjs" } else { "server.js" }
        try {
            Start-Process -FilePath "node" -ArgumentList $entry -WorkingDirectory $AppDir -WindowStyle Hidden `
                -RedirectStandardOutput (Join-Path $logDir "app.log") `
                -RedirectStandardError (Join-Path $logDir "app.err.log")
        } catch {
            Write-Host "[X] Не удалось запустить: $($_.Exception.Message)" -ForegroundColor Red
            return
        }
        Write-Host "      Приложение работает в фоне. Логи: logs\app.log" -ForegroundColor DarkCyan
        Write-Host "      Важно: после перезагрузки сервера приложение само не стартует. Попросите ИТ установить PM2 (см. README, раздел «PM2»)." -ForegroundColor Yellow
    }

    if (Wait-AppReady -Seconds 30) {
        Write-Host "[+] Приложение запущено: http://localhost:$AppPort" -ForegroundColor Green
    } else {
        Write-Host "[X] Приложение не ответило за 30 секунд. Посмотрите логи (пункт 6)." -ForegroundColor Red
    }
}

function Invoke-StopApp {
    $stopped = $false
    $pm2Proc = Get-Pm2Process
    if ($pm2Proc) {
        Write-Host "Остановка через PM2..." -ForegroundColor Cyan
        & pm2 stop cert-manager | Out-Null
        $stopped = $true
    } else {
        $conn = $null
        try { $conn = Get-NetTCPConnection -LocalPort $AppPort -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1 } catch { }
        if ($conn) {
            try {
                Stop-Process -Id $conn.OwningProcess -Force
                Write-Host "Остановлен процесс (PID $($conn.OwningProcess)), слушавший порт $AppPort" -ForegroundColor Cyan
                $stopped = $true
            } catch {
                Write-Host "[X] Не удалось остановить процесс PID $($conn.OwningProcess): $($_.Exception.Message)" -ForegroundColor Red
            }
        }
    }
    if ($stopped -and (Get-AppHealth) -eq "down") {
        Write-Host "[+] Приложение остановлено" -ForegroundColor Green
    } elseif (-not $stopped) {
        Write-Host "[X] Не нашлось ни PM2-процесса, ни процесса на порту $AppPort — возможно, приложение уже остановлено" -ForegroundColor Yellow
    } else {
        Write-Host "[!] Команда остановки отправлена, но приложение ещё отвечает" -ForegroundColor Yellow
    }
}

function Invoke-RestartApp {
    Invoke-StopApp
    Start-Sleep -Seconds 2
    Invoke-StartApp
}

function Invoke-Migrate {
    Write-Host "Применение обновлений базы данных..." -ForegroundColor Cyan
    & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $AppDir "run-migrate.ps1")
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[+] База данных обновлена" -ForegroundColor Green
    } else {
        Write-Host "[X] Не удалось применить обновления базы. Обычно помогает проверить пароль в DB_URL (.env) и что PostgreSQL запущена." -ForegroundColor Red
    }
}

function Show-Logs {
    Write-Host "=== Последние события ===" -ForegroundColor Cyan
    $logFiles = @(
        @("logs\app.log", "Вывод приложения"),
        @("logs\app.err.log", "Ошибки приложения"),
        @("logs\watchdog.log", "Сторож (падения приложения)")
    )
    $foundAny = $false
    foreach ($lf in $logFiles) {
        $path = Join-Path $AppDir $lf[0]
        if (Test-Path $path) {
            $foundAny = $true
            Write-Host ""
            Write-Host "--- $($lf[1]) ($($lf[0])) ---" -ForegroundColor DarkCyan
            Get-Content $path -Tail 15
        }
    }
    if (-not $foundAny) {
        Write-Host "Логи пока пусты — файлов нет." -ForegroundColor Yellow
    }
}

# ───────────────────────── entry ─────────────────────────

try {
    Read-DotEnv

    if ($Action) {
        switch ($Action.ToLower()) {
            "status"      { Show-Status }
            "start"       { Invoke-StartApp }
            "stop"        { Invoke-StopApp }
            "restart"     { Invoke-RestartApp }
            "migrate"     { Invoke-Migrate }
            "diagnostics" { Show-Status; Show-Logs }
            default {
                Write-Host "Неизвестное действие: $Action" -ForegroundColor Red
                Write-Host "Доступны: status | start | stop | restart | migrate | diagnostics"
                exit 1
            }
        }
        exit 0
    }

    # Интерактивное меню
    while ($true) {
        Clear-Host
        Write-Host "==============================================================" -ForegroundColor Cyan
        Write-Host "   Cert Manager — управление приложением" -ForegroundColor Cyan
        Write-Host "==============================================================" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Текущее состояние:" -ForegroundColor White
        Show-Status
        Write-Host ""
        Write-Host "--------------------------------------------------------------" -ForegroundColor DarkGray
        Write-Host "Действия:"
        Write-Host "  1 — Запустить приложение"
        Write-Host "  2 — Перезапустить приложение"
        Write-Host "  3 — Остановить приложение"
        Write-Host "  4 — Применить обновления базы данных (миграции)"
        Write-Host "  5 — Обновить состояние (проверить заново)"
        Write-Host "  6 — Последние события (логи)"
        Write-Host "  0 — Выход"
        Write-Host ""
        $choice = Read-Host "Введите номер и нажмите Enter"

        switch ($choice) {
            "1" { Invoke-StartApp }
            "2" { Invoke-RestartApp }
            "3" { Invoke-StopApp }
            "4" { Invoke-Migrate }
            "5" { }
            "6" { Show-Logs }
            "0" { exit 0 }
            default { Write-Host "Нет такого пункта: $choice" -ForegroundColor Yellow }
        }
        Write-Host ""
        Read-Host "Нажмите Enter, чтобы вернуться в меню" | Out-Null
    }
} catch {
    Write-Host ""
    Write-Host "=== Непредвиденная ошибка ===" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Read-Host "Нажмите Enter, чтобы закрыть окно" | Out-Null
    exit 1
}
