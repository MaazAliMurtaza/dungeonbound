# Starts the separate Android 11 test profile. Does not replace existing AVDs.
$sdkPath = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
$emulatorPath = Join-Path $sdkPath 'emulator\emulator.exe'
$adbPath = Join-Path $sdkPath 'platform-tools\adb.exe'
$available = & $emulatorPath -list-avds
if ($available -notcontains 'Dungeonbound_LowEnd_API30') {
    throw 'Dungeonbound_LowEnd_API30 is missing. Create an Android 11 AOSP x86_64 AVD first; see .project-docs/ECLIPSE_PROTOCOL.md.'
}
Start-Process -FilePath $emulatorPath -ArgumentList @('-avd', 'Dungeonbound_LowEnd_API30', '-memory', '2048', '-cores', '2', '-no-boot-anim', '-no-snapshot', '-gpu', 'auto') -WindowStyle Hidden
& $adbPath wait-for-device
for ($attempt = 0; $attempt -lt 150; $attempt++) {
    if (((& $adbPath shell getprop sys.boot_completed) -join '').Trim() -eq '1') { break }
    Start-Sleep -Seconds 2
}
if (((& $adbPath shell getprop sys.boot_completed) -join '').Trim() -ne '1') { throw 'Android did not finish booting within five minutes.' }
& $adbPath shell wm density 160
& $adbPath reverse tcp:4000 tcp:4000
& $adbPath reverse tcp:8082 tcp:8082
& $adbPath shell am start -a android.intent.action.VIEW -d 'exp://127.0.0.1:8082?__expo_disable_onboarding=1' host.exp.exponent
Write-Host 'Emulator: 480x800, 2 GB RAM, two cores. Game performance mode is on by default.'
