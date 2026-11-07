# Restart an explicitly inspected Dungeonbound process when Windows' listener
# provider fails to return it. Caller must supply its observed PID/start time.
param(
    [Parameter(Mandatory=$true)][ValidateSet(4000,8082)][int]$Port,
    [Parameter(Mandatory=$true)][int]$ExpectedPid,
    [Parameter(Mandatory=$true)][string]$ExpectedStartedAt
)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$targetProcess = Get-Process -Id $ExpectedPid -ErrorAction Stop
if ($targetProcess.ProcessName -ne 'node' -or $targetProcess.StartTime.ToString('yyyy-MM-dd HH:mm:ss') -ne $ExpectedStartedAt) {
    throw 'Inspected process identity changed; no process was stopped.'
}
$command = (Get-CimInstance Win32_Process -Filter "ProcessId=$ExpectedPid").CommandLine
$pattern = if ($Port -eq 4000) { 'src/server\.js' } else { 'node_modules[\\/]expo[\\/]bin[\\/]cli.+8082' }
if (-not $command -or $command -notmatch $pattern) { throw 'Process does not match the inspected Dungeonbound service.' }
Stop-Process -Id $ExpectedPid -Force
$nodePath = (Get-Command node.exe).Source
$env:EXPO_PUBLIC_API_URL = 'http://192.168.1.7:4000'
$env:REACT_NATIVE_PACKAGER_HOSTNAME = '192.168.1.7'
$env:EXPO_OFFLINE = '1'
Remove-Item Env:CI -ErrorAction SilentlyContinue
if ($Port -eq 4000) {
    $env:HOST = '192.168.1.7'; $env:PORT = '4000'
    $serviceArgs = @('src/server.js'); $serviceDirectory = 'server'
} else {
    $serviceArgs = @('node_modules/expo/bin/cli','start','--go','--lan','--port','8082','--max-workers','1')
    $serviceDirectory = 'mobile'
}
$child = Start-Process -FilePath $nodePath -ArgumentList $serviceArgs -WindowStyle Hidden -PassThru `
    -WorkingDirectory (Join-Path $projectRoot $serviceDirectory) `
    -RedirectStandardOutput (Join-Path $projectRoot "evidence/restarted-$Port.log") `
    -RedirectStandardError (Join-Path $projectRoot "evidence/restarted-$Port-error.log")
@{port=$Port;pid=$child.Id;replacedPid=$ExpectedPid;startedAt=(Get-Date).ToString('o')} |
    ConvertTo-Json | Set-Content -LiteralPath (Join-Path $projectRoot "evidence/restarted-$Port.json") -Encoding UTF8
