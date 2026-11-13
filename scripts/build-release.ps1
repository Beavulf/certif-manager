# Build release package for server deployment (no Docker)
# Run: powershell -ExecutionPolicy Bypass -File .\scripts\build-release.ps1

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

$ReleaseDir = Join-Path $ProjectRoot "release"
$StandaloneDir = Join-Path $ProjectRoot ".next\standalone"
$MigrateDir = Join-Path $ReleaseDir "migrate"

function Remove-ExternalReparsePoints {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RootDir
    )

    $rootFull = (Resolve-Path $RootDir).Path.TrimEnd('\')
    Get-ChildItem -Path $RootDir -Recurse -Force -ErrorAction SilentlyContinue |
        Where-Object {
            $_.PSIsContainer -and
            (($_.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0)
        } |
        ForEach-Object {
            $target = $null
            try { $target = $_.Target } catch { }

            $pointsOutside = $false
            if ($target) {
                foreach ($t in @($target)) {
                    if (-not $t) { continue }
                    try {
                        $targetFull = [IO.Path]::GetFullPath($t).TrimEnd('\')
                        if (-not $targetFull.StartsWith($rootFull, [StringComparison]::OrdinalIgnoreCase)) {
                            $pointsOutside = $true
                        }
                    } catch {
                        $pointsOutside = $true
                    }
                }
            } else {
                # Unknown reparse target — safer to drop from release package
                $pointsOutside = $true
            }

            if ($pointsOutside) {
                Write-Host "Removing external link: $($_.FullName)" -ForegroundColor Yellow
                $_.Delete()
            }
        }
}

Write-Host "=== Cert Manager release build ===" -ForegroundColor Cyan

if (-not (Test-Path ".env")) {
    Write-Warning ".env not found. Build continues, but server needs its own .env file."
}

Write-Host "1/4 Installing dependencies..." -ForegroundColor Cyan
$ErrorActionPreference = "Continue"
npm install
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
$ErrorActionPreference = "Stop"

Write-Host "2/4 Production build..." -ForegroundColor Cyan
$env:NODE_ENV = "production"
$ErrorActionPreference = "Continue"
npm run build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
$ErrorActionPreference = "Stop"

if (-not (Test-Path $StandaloneDir)) {
    Write-Error "Standalone build not found. Check output standalone in next.config.ts"
}

Write-Host "3/4 Packing release folder..." -ForegroundColor Cyan
if (Test-Path $ReleaseDir) {
    Remove-Item $ReleaseDir -Recurse -Force
}
New-Item -ItemType Directory -Path $ReleaseDir | Out-Null

Copy-Item -Path "$StandaloneDir\*" -Destination $ReleaseDir -Recurse
Copy-Item -Path ".next\static" -Destination "$ReleaseDir\.next\static" -Recurse
if (Test-Path "public") {
    Copy-Item -Path "public" -Destination "$ReleaseDir\public" -Recurse
}

Copy-Item -Path "prisma" -Destination "$ReleaseDir\prisma" -Recurse
Copy-Item -Path "prisma.config.ts" -Destination "$ReleaseDir\prisma.config.ts"
Copy-Item -Path ".env.example" -Destination "$ReleaseDir\.env.example"
Copy-Item -Path "scripts\server-start.ps1" -Destination "$ReleaseDir\server-start.ps1"
Copy-Item -Path "scripts\standalone-start.cjs" -Destination "$ReleaseDir\standalone-start.cjs"
Copy-Item -Path "scripts\run-daily-check.ps1" -Destination "$ReleaseDir\run-daily-check.ps1"
Copy-Item -Path "scripts\run-migrate.ps1" -Destination "$ReleaseDir\run-migrate.ps1"
Copy-Item -Path "scripts\init-database.sql" -Destination "$ReleaseDir\init-database.sql"
Copy-Item -Path "scripts\patch-cookie-secure.ps1" -Destination "$ReleaseDir\patch-cookie-secure.ps1"

# Remove package.json so accidental `npm install` in release won't prune standalone node_modules
Remove-Item "$ReleaseDir\package.json" -ErrorAction SilentlyContinue
Remove-Item "$ReleaseDir\package-lock.json" -ErrorAction SilentlyContinue

New-Item -ItemType Directory -Path $MigrateDir | Out-Null
@'
{
  "name": "cert-manager-migrate",
  "private": true,
  "dependencies": {
    "prisma": "7.8.0",
    "dotenv": "17.4.2"
  }
}
'@ | Set-Content -Path "$MigrateDir\package.json" -Encoding ASCII

$ErrorActionPreference = "Continue"
npm install --prefix $MigrateDir --omit=dev --no-package-lock --ignore-workspace
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
$ErrorActionPreference = "Stop"

# npm may create a junction back to the monorepo root (node_modules/cert-manager -> project).
# Zipping that link recurses into the whole repo and fails with file-lock errors.
Remove-ExternalReparsePoints -RootDir $ReleaseDir

Write-Host "4/4 Creating zip archive..." -ForegroundColor Cyan
$ZipPath = Join-Path $ProjectRoot "cert-manager-release.zip"
if (Test-Path $ZipPath) { Remove-Item $ZipPath -Force }

# Compress-Archive is flaky on Windows; prefer tar (Win10+), fallback to .NET ZipFile.
$zipOk = $false
$lastZipError = $null

$tar = Get-Command tar -ErrorAction SilentlyContinue
if ($tar) {
    try {
        & tar -a -c -f $ZipPath -C $ReleaseDir .
        if ($LASTEXITCODE -eq 0 -and (Test-Path $ZipPath)) {
            $zipOk = $true
        } else {
            $lastZipError = "tar exited with code $LASTEXITCODE"
        }
    } catch {
        $lastZipError = $_
    }
}

if (-not $zipOk) {
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    for ($attempt = 1; $attempt -le 5; $attempt++) {
        try {
            if (Test-Path $ZipPath) { Remove-Item $ZipPath -Force -ErrorAction Stop }
            if ($attempt -gt 1) {
                Write-Host "Zip attempt $attempt/5..." -ForegroundColor Yellow
                Start-Sleep -Seconds (2 * $attempt)
            }
            [System.IO.Compression.ZipFile]::CreateFromDirectory(
                $ReleaseDir,
                $ZipPath,
                [System.IO.Compression.CompressionLevel]::Optimal,
                $false
            )
            $zipOk = $true
            break
        } catch {
            $lastZipError = $_
            Write-Warning $_.Exception.Message
        }
    }
}

if (-not $zipOk) {
    Write-Error "Failed to create zip. Last error: $lastZipError"
}

Write-Host ""
Write-Host "=== Done ===" -ForegroundColor Green
Write-Host "Folder: $ReleaseDir"
Write-Host "Zip:    $ZipPath"
Write-Host ""
Write-Host "Copy cert-manager-release.zip to server, unpack, edit .env, run server-start.ps1"
