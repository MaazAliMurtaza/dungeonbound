# Start the official Codex CLI in the root project and provide its brief.
$root = Split-Path -Parent $PSScriptRoot
if (-not (Get-Command 'codex.cmd' -ErrorAction SilentlyContinue)) {
    throw 'Codex CLI is not installed. Run scripts/install-codex.ps1 first, then reopen PowerShell.'
}
Push-Location $root
try {
    $task = 'Read AGENTS.md and CODEX_TASK.md. Execute Phase A on my local PC: inspect prerequisites, install project dependencies when I approve, run and fix tests, and write verified results. Then proceed through Phase B for a locally working Android game. Ask my permission before paid services or external deployment in Phase C.'
    & codex.cmd $task
} finally { Pop-Location }
