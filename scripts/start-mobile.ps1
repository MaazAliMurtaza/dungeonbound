$root = Split-Path -Parent $PSScriptRoot
Push-Location (Join-Path $root 'mobile')
try {
    Write-Host 'Expo will start. Press a for the Android emulator.' -ForegroundColor Cyan
    & npx.cmd expo start --clear
} finally { Pop-Location }
