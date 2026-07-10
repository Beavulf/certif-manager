# Hotfix: disable Secure flag on auth cookies in already-built release (HTTP without HTTPS)
# Run from release folder: powershell -ExecutionPolicy Bypass -File .\patch-cookie-secure.ps1

$ErrorActionPreference = "Stop"
$AppDir = $PSScriptRoot
$chunksDir = Join-Path $AppDir ".next\server\chunks"

if (-not (Test-Path $chunksDir)) {
    Write-Error "Folder not found: $chunksDir"
}

$patterns = @(
    @{
        Old = 'name:s.COOKIE_INFO.name,value:r,httpOnly:!0,secure:!0,sameSite:"lax"'
        New = 'name:s.COOKIE_INFO.name,value:r,httpOnly:!0,secure:!1,sameSite:"lax"'
    },
    @{
        Old = 'name:h.COOKIE_INFO.name,value:e,httpOnly:!0,secure:!0,sameSite:"lax"'
        New = 'name:h.COOKIE_INFO.name,value:e,httpOnly:!0,secure:!1,sameSite:"lax"'
    }
)

$changed = 0
Get-ChildItem -Path $chunksDir -Recurse -Filter "*.js" | ForEach-Object {
    $content = Get-Content $_.FullName -Raw -Encoding UTF8
    $updated = $content
    foreach ($pattern in $patterns) {
        $updated = $updated.Replace($pattern.Old, $pattern.New)
    }
    if ($updated -ne $content) {
        Set-Content -Path $_.FullName -Value $updated -Encoding UTF8 -NoNewline
        Write-Host "Patched: $($_.FullName)" -ForegroundColor Green
        $changed++
    }
}

if ($changed -eq 0) {
    Write-Warning "No files patched. Rebuild release with npm run deploy:pack instead."
} else {
    Write-Host ""
    Write-Host "Patched $changed file(s)." -ForegroundColor Green
    Write-Host "1. Restart app (pm2 restart cert-manager)"
    Write-Host "2. Delete old cookies in browser for this site"
    Write-Host "3. Login again and check Document / request has Cookie header"
}
