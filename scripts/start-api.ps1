$root = Split-Path -Parent $PSScriptRoot
Push-Location (Join-Path $root 'server')
try {
    Write-Host 'Dungeonbound API: http://localhost:4000/health' -ForegroundColor Cyan
    & npm.cmd run dev
} finally { Pop-Location }
