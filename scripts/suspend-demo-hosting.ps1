param([switch]$VerifyOnly)
$ErrorActionPreference='Stop'
# One-time owner-authorized demo cutoff. No API keys, cookies or passwords are
# extracted. This uses the owner's existing interactive Brave/Render session.
$deadline=[DateTimeOffset]::Parse('2026-11-13T07:00:00Z')
if (!$VerifyOnly -and [DateTimeOffset]::UtcNow -lt $deadline) { throw 'The authorized shutdown time has not arrived.' }
if (!$VerifyOnly -and [DateTimeOffset]::UtcNow -gt $deadline.AddDays(1)) { throw 'The one-time shutdown instruction is stale; no action taken.' }
$root=Split-Path $PSScriptRoot -Parent
$log=Join-Path $root 'artifacts/share/shutdown-log.txt'
New-Item -ItemType Directory -Path (Split-Path $log) -Force | Out-Null
function Record([string]$Message) { Add-Content -LiteralPath $log -Value ((Get-Date -Format o)+' '+$Message); Write-Output $Message }
try {
  $candidates=@('C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe','C:/Program Files (x86)/BraveSoftware/Brave-Browser/Application/brave.exe',"$env:LOCALAPPDATA/BraveSoftware/Brave-Browser/Application/brave.exe")
  $brave=$candidates | Where-Object {Test-Path $_} | Select-Object -First 1
  if (!$brave) {throw 'Brave executable unavailable.'}
  Start-Process -FilePath $brave -ArgumentList 'https://dashboard.render.com/web/srv-dbr0lt67bikc73c3r0rg/settings' -WindowStyle Hidden
  Add-Type -AssemblyName UIAutomationTypes
  Add-Type -AssemblyName UIAutomationClient
  $scope=[System.Windows.Automation.TreeScope]::Descendants
  function ServiceWindow {
    [System.Windows.Automation.AutomationElement]::RootElement.FindAll([System.Windows.Automation.TreeScope]::Children,[System.Windows.Automation.Condition]::TrueCondition) | Where-Object {$_.Current.Name -like 'dungeonbound-api-8fur*Render Dashboard - Brave'} | Select-Object -First 1
  }
  function Button($Window,[string]$Name) {
    $Window.FindAll($scope,(New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::ControlTypeProperty,[System.Windows.Automation.ControlType]::Button))) | Where-Object {$_.Current.Name -eq $Name} | Select-Object -First 1
  }
  function InvokeButton($Element) {
    $pattern=$null
    if (!$Element.TryGetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern,[ref]$pattern)) {throw 'Required browser accessibility action unavailable.'}
    $pattern.Invoke()
  }
  $window=$null; $suspend=$null
  for($i=0;$i -lt 15;$i++) {
    $window=ServiceWindow
    if ($window) {
      if ((Button $window 'Resume Web Service') -or (Button $window 'Resume Service')) {Record 'Service already suspended.'; exit 0}
      $suspend=Button $window 'Suspend Web Service'
      if ($suspend) {break}
    }
    Start-Sleep -Seconds 2
  }
  if (!$suspend) {throw 'Suspension control unavailable. Check Brave login and suspend the service manually.'}
  if ($VerifyOnly) {Record 'Verified exact service and accessible Suspend Web Service control; no suspension performed.'; exit 0}
  InvokeButton $suspend
  Start-Sleep -Seconds 2
  # Confirm only inside a dialog belonging to this exact service window.
  $dialogs=$window.FindAll($scope,(New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::ControlTypeProperty,[System.Windows.Automation.ControlType]::Window)))
  foreach($dialog in $dialogs) {
    foreach($edit in $dialog.FindAll($scope,(New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::ControlTypeProperty,[System.Windows.Automation.ControlType]::Edit)))) {
      if ($edit.Current.Name -match 'service|confirm|name' -and $edit.Current.Name -notmatch 'password|token|secret') {
        $value=$null
        if ($edit.TryGetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern,[ref]$value)) {$value.SetValue('dungeonbound-api-8fur')}
      }
    }
    $confirm=Button $dialog 'Suspend Web Service'
    if (!$confirm) {$confirm=Button $dialog 'Suspend'}
    if ($confirm) {InvokeButton $confirm}
  }
  for($i=0;$i -lt 15;$i++) {
    Start-Sleep -Seconds 2
    $window=ServiceWindow
    if ($window -and ((Button $window 'Resume Web Service') -or (Button $window 'Resume Service'))) {Record 'Service suspension confirmed through Resume control.'; exit 0}
  }
  throw 'Suspension could not be confirmed. Check the Render dashboard immediately.'
} catch { Record ('FAILED: '+$_.Exception.Message); exit 1 }
