# Run without needing the database for unit tests. Optionally checks local API health.
$ErrorActionPreference = 'Continue'
$root = Split-Path -Parent $PSScriptRoot
$failed = 0
function Check([string]$label, [scriptblock]$command) {
    Write-Host "== $label ==" -ForegroundColor Cyan
    & $command
    if ($LASTEXITCODE -ne 0) { Write-Warning "$label failed"; $script:failed++ }
}
Push-Location (Join-Path $root 'server')
try { Check 'Server tests' { & npm.cmd test } } finally { Pop-Location }
Push-Location (Join-Path $root 'mobile')
try {
    Check 'Game engine tests' { & npm.cmd test }
    Check 'Mobile TypeScript' { & npm.cmd run typecheck }
    Check 'Expo dependency compatibility' { & npx.cmd expo install --check }
} finally { Pop-Location }
Write-Host '== API health (only if running) ==' -ForegroundColor Cyan
try {
    $result = Invoke-RestMethod -Uri 'http://localhost:4000/health' -TimeoutSec 5
    Write-Host "Server status: $($result.status)"
} catch { Write-Warning 'No live API /health response. Start server or confirm DB is up.' }
if ($failed -gt 0) { throw "$failed check(s) failed. Ask Codex to investigate the terminal output." }
Write-Host 'Automated checks completed. API/device E2E tests require manual verification.' -ForegroundColor Green
