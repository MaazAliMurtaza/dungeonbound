# Install the official Codex CLI and VS Code extension on Windows (opt-in).
# Run from PowerShell in this project's extracted directory:
#   & .\scripts\install-codex.ps1
# Does not install Node, change OS security settings, or sign in for you.
$ErrorActionPreference = 'Stop'
function Require-Command([string]$name, [string]$help) {
    if (-not (Get-Command $name -ErrorAction SilentlyContinue)) { throw "$name is missing. $help" }
}
Write-Host 'Dungeonbound: Codex integration for Windows' -ForegroundColor Cyan
Require-Command 'node.exe' 'Install Node.js LTS from https://nodejs.org/ and restart PowerShell.'
Require-Command 'npm.cmd' 'Reinstall or repair Node.js to enable npm.'
Write-Host "Node: $(& node.exe --version)"
Write-Host 'Installing/updating official @openai/codex via npm...' -ForegroundColor Yellow
& npm.cmd install -g '@openai/codex@latest'
if ($LASTEXITCODE -ne 0) { throw 'Codex installation failed; check the npm output above.' }
$codexCmd = Get-Command 'codex.cmd' -ErrorAction SilentlyContinue
if ($codexCmd) { & codex.cmd --version }
else { Write-Warning 'Codex installed but is not on PATH yet. Reopen PowerShell.' }
if (Get-Command 'code.cmd' -ErrorAction SilentlyContinue) {
    Write-Host 'Installing Codex extension into Visual Studio Code...'
    & code.cmd --install-extension OpenAI.chatgpt --force
    if ($LASTEXITCODE -ne 0) { Write-Warning 'VS Code extension install failed. Install through VS Code Extensions instead.' }
} else {
    Write-Warning 'VS Code CLI not detected. Install Codex manually: https://marketplace.visualstudio.com/items?itemName=OpenAI.chatgpt'
}
Write-Host ''
Write-Host 'Next: open this folder in VS Code, open Codex, and sign in with ChatGPT.' -ForegroundColor Green
Write-Host 'Or run codex from this folder in a NEW PowerShell terminal.'
Write-Host 'Tell Codex: Read AGENTS.md and CODEX_TASK.md and carry out Phase A.'
