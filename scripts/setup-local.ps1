# Local dev setup for PowerShell. Installs only repo dependencies and starts
# the project's Docker Compose PostgreSQL container; no system-wide installers.
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
function Invoke-Checked([string]$exe, [string[]]$arguments, [string]$location) {
    Push-Location $location
    try {
        & $exe @arguments
        if ($LASTEXITCODE -ne 0) { throw "$exe $($arguments -join ' ') failed with exit code $LASTEXITCODE" }
    } finally { Pop-Location }
}
foreach ($command in @('node.exe', 'npm.cmd', 'docker.exe')) {
    if (-not (Get-Command $command -ErrorAction SilentlyContinue)) { throw "$command not found. Install Node.js LTS and Docker Desktop first." }
}
Write-Host 'Setting up Dungeonbound local development...' -ForegroundColor Cyan
$serverEnv = Join-Path $root 'server\.env'
if (-not (Test-Path $serverEnv)) {
    $template = Get-Content -Raw (Join-Path $root 'server\.env.example')
    $randomBytes = New-Object byte[] 48
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($randomBytes)
    $secret = ([System.BitConverter]::ToString($randomBytes)).Replace('-', '').ToLowerInvariant()
    $template = $template.Replace('REPLACE_WITH_A_LONG_RANDOM_SECRET_AT_LEAST_32_CHARS', $secret)
    [System.IO.File]::WriteAllText($serverEnv, $template, (New-Object System.Text.UTF8Encoding($false)))
    Write-Host 'Created server/.env with a randomized JWT_SECRET (not printed).'
} else {
    Write-Warning 'server/.env already exists. Not changing any secrets; ensure JWT_SECRET is not the placeholder.'
}
$mobileEnv = Join-Path $root 'mobile\.env'
if (-not (Test-Path $mobileEnv)) {
    Copy-Item (Join-Path $root 'mobile\.env.example') $mobileEnv
    Write-Host 'Created mobile/.env with Android-emulator API URL.'
}
Invoke-Checked 'docker.exe' @('compose', 'up', '-d', '--wait') $root
Invoke-Checked 'npm.cmd' @('install') (Join-Path $root 'server')
Invoke-Checked 'npm.cmd' @('run', 'db:migrate') (Join-Path $root 'server')
Invoke-Checked 'npm.cmd' @('test') (Join-Path $root 'server')
Invoke-Checked 'npm.cmd' @('install') (Join-Path $root 'mobile')
Invoke-Checked 'npm.cmd' @('test') (Join-Path $root 'mobile')
Invoke-Checked 'npm.cmd' @('run', 'typecheck') (Join-Path $root 'mobile')
Write-Host ''
Write-Host 'Local setup finished. Open TWO PowerShell terminals:' -ForegroundColor Green
Write-Host '  .\scripts\start-api.ps1'
Write-Host '  .\scripts\start-mobile.ps1'
Write-Host 'Then launch Android Studio emulator; press a in Expo terminal.'
