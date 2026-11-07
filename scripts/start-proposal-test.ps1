# Disposable local verification servers. No firewall or administrator changes.
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$nodePath = (Get-Command node.exe).Source
$env:HOST = '127.0.0.1'
$env:PORT = '4001'
$env:EXPO_PUBLIC_API_URL = 'http://127.0.0.1:4001'
$env:EXPO_OFFLINE = '1'
$env:REACT_NATIVE_PACKAGER_HOSTNAME = '127.0.0.1'
Remove-Item Env:CI -ErrorAction SilentlyContinue
$apiProcess = Start-Process -FilePath $nodePath -ArgumentList @('src/server.js') `
    -WorkingDirectory (Join-Path $projectRoot 'server') -WindowStyle Hidden -PassThru `
    -RedirectStandardOutput (Join-Path $projectRoot 'evidence/proposal-api.log') `
    -RedirectStandardError (Join-Path $projectRoot 'evidence/proposal-api-error.log')
$metroProcess = Start-Process -FilePath $nodePath `
    -ArgumentList @('node_modules/expo/bin/cli','start','--go','--localhost','--port','8083','--max-workers','2') `
    -WorkingDirectory (Join-Path $projectRoot 'mobile') -WindowStyle Hidden -PassThru `
    -RedirectStandardOutput (Join-Path $projectRoot 'evidence/proposal-metro.log') `
    -RedirectStandardError (Join-Path $projectRoot 'evidence/proposal-metro-error.log')
@{ apiPid=$apiProcess.Id; metroPid=$metroProcess.Id; apiPort=4001; metroPort=8083 } |
    ConvertTo-Json | Set-Content -LiteralPath (Join-Path $projectRoot 'evidence/proposal-local-processes.json') -Encoding UTF8
Write-Host 'Local verification servers started on 4001/8083; no phone-network service was restarted.'
