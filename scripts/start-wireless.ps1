# Run on a trusted Private Wi-Fi network. Never changes the network category.
# Firewall setup requires an Administrator PowerShell on Windows.
param([switch]$MobileOnly, [switch]$ServerOnly)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$wifiProfile = Get-NetConnectionProfile -InterfaceAlias 'Wi-Fi'
if ($wifiProfile.NetworkCategory -ne 'Private') {
    throw 'Wi-Fi must be a trusted network marked Private before starting wireless development.'
}
$wifiAddress = Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias 'Wi-Fi' |
    Where-Object { $_.IPAddress -match '^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)' } |
    Select-Object -First 1 -ExpandProperty IPAddress
if (-not $wifiAddress) { throw 'No private Wi-Fi IPv4 address found.' }
$nodePath = (Get-Command node.exe).Source
$ruleName = 'Dungeonbound-Phone-WiFi-4000-8082'
if (-not (Get-NetFirewallRule -Name $ruleName -ErrorAction SilentlyContinue)) {
    New-NetFirewallRule -Name $ruleName -DisplayName 'Dungeonbound phone development (Private Wi-Fi only)' `
        -Group 'Dungeonbound Development' -Direction Inbound -Action Allow -Enabled True `
        -Profile Private -InterfaceAlias 'Wi-Fi' -Protocol TCP -LocalPort 4000,8082 `
        -RemoteAddress LocalSubnet -Program $nodePath -EdgeTraversalPolicy Block | Out-Null
}

# Stop only a listener on these ports whose command line matches this project's
# existing server/Expo launch. Refuse to terminate unrelated applications.
if ($MobileOnly -and $ServerOnly) { throw 'Choose either MobileOnly or ServerOnly.' }
$devPorts = if ($MobileOnly) { @(8082) } elseif ($ServerOnly) { @(4000) } else { @(4000,8082) }
foreach ($devPort in $devPorts) {
    $listeners = Get-NetTCPConnection -State Listen -LocalPort $devPort -ErrorAction SilentlyContinue
    # Some Windows providers omit listeners created before the current session.
    # Cross-check native netstat and still validate each owning process below.
    $nativeListenerPids = @(& netstat.exe -ano -p tcp | ForEach-Object {
        if ($_ -match "^\s*TCP\s+\S+:${devPort}\s+\S+\s+LISTENING\s+(\d+)\s*$") { [int]$Matches[1] }
    })
    $listenerPids = @(@($listeners | Select-Object -ExpandProperty OwningProcess) + $nativeListenerPids | Select-Object -Unique)
    foreach ($listenerPid in $listenerPids) {
        $running = Get-CimInstance Win32_Process -Filter "ProcessId=$listenerPid"
        if (-not $running) { continue }
        if ($running.Name -ne 'node.exe' -or $running.CommandLine -notmatch 'src/server\.js|node_modules[\\/]expo[\\/]bin[\\/]cli') {
            throw "Port $devPort belongs to another application; no process was stopped."
        }
        Stop-Process -Id $running.ProcessId -Force
    }
}
$env:HOST = $wifiAddress
$env:EXPO_PUBLIC_API_URL = "http://${wifiAddress}:4000"
$env:REACT_NATIVE_PACKAGER_HOSTNAME = $wifiAddress
$env:EXPO_OFFLINE = '1'
Remove-Item Env:CI -ErrorAction SilentlyContinue
if (-not $MobileOnly) {
$apiProcess = Start-Process -FilePath $nodePath -ArgumentList @('src/server.js') -PassThru `
    -WorkingDirectory (Join-Path $projectRoot 'server') -WindowStyle Hidden `
    -RedirectStandardOutput (Join-Path $projectRoot 'evidence/api-wifi.log') `
    -RedirectStandardError (Join-Path $projectRoot 'evidence/api-wifi-error.log')
Set-Content -LiteralPath (Join-Path $projectRoot 'evidence/api-wifi-pid.txt') -Value $apiProcess.Id
}
if (-not $ServerOnly) {
Start-Process -FilePath $nodePath `
    -ArgumentList @('node_modules/expo/bin/cli','start','--go','--lan','--port','8082','--max-workers','2','--clear') `
    -WorkingDirectory (Join-Path $projectRoot 'mobile') -WindowStyle Hidden `
    -RedirectStandardOutput (Join-Path $projectRoot 'evidence/metro-wifi.log') `
    -RedirectStandardError (Join-Path $projectRoot 'evidence/metro-wifi-error.log')
}
& $nodePath (Join-Path $PSScriptRoot 'make-phone-qr.mjs') $wifiAddress
Write-Host "Phone Expo URL: exp://${wifiAddress}:8082"
Write-Host "Phone API health: http://${wifiAddress}:4000/health"
Write-Host 'Connect the phone to the same Wi-Fi and scan phone-qr-wifi.png in compatible Expo Go.'
