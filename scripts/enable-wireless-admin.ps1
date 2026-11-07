# Administrator entry point after the user confirms the active Wi-Fi is trusted.
param([switch]$MobileOnly, [switch]$ServerOnly)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$resultPath = Join-Path $projectRoot 'evidence/wireless-setup.json'
try {
    Set-NetConnectionProfile -InterfaceAlias 'Wi-Fi' -NetworkCategory Private
    & (Join-Path $PSScriptRoot 'start-wireless.ps1') -MobileOnly:$MobileOnly -ServerOnly:$ServerOnly
    @{ status = 'started'; completedAt = (Get-Date).ToString('o') } |
        ConvertTo-Json | Set-Content -LiteralPath $resultPath -Encoding UTF8
} catch {
    @{ status = 'failed'; error = $_.Exception.Message; completedAt = (Get-Date).ToString('o') } |
        ConvertTo-Json | Set-Content -LiteralPath $resultPath -Encoding UTF8
    exit 1
}
