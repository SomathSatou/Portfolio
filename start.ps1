# Starts backend (Django) and frontend (Vite) in separate PowerShell windows
$ErrorActionPreference = 'Stop'

function Start-AppWindow {
  param(
    [string]$Title,
    [string]$WorkingDir,
    [string]$Command
  )
  $cmd = @"
try {
  Write-Host ("=> {0}" -f $Title) -ForegroundColor Cyan
  Set-Location "$WorkingDir"
  $Command
} catch {
  Write-Host ("[{0}] ERROR: {1}" -f $Title, $_.Exception.Message) -ForegroundColor Red
}
"@

  $psArgs = @(
    '-NoExit',
    '-Command',
    $cmd
  )
  Start-Process -FilePath powershell -ArgumentList $psArgs | Out-Null
}

# Resolve absolute paths
$RepoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir = Join-Path $RepoRoot 'backend'
$FrontendDir = Join-Path $RepoRoot 'frontend'

# Backend command with auto venv activation (root .venv or backend/.venv)
$BackendCmd = @"
if (Test-Path "${RepoRoot}\.venv\Scripts\Activate.ps1") {
  & "${RepoRoot}\.venv\Scripts\Activate.ps1"
} elseif (Test-Path "${BackendDir}\.venv\Scripts\Activate.ps1") {
  & "${BackendDir}\.venv\Scripts\Activate.ps1"
}
python manage.py runserver 8000
"@
$FrontendCmd = 'npm run dev'

Start-AppWindow -Title 'Backend: Django (http://localhost:8000)' -WorkingDir $BackendDir -Command $BackendCmd
Start-AppWindow -Title 'Frontend: Vite (http://localhost:5173)' -WorkingDir $FrontendDir -Command $FrontendCmd

Write-Host "Launched backend and frontend in separate windows." -ForegroundColor Green
Write-Host "Backend => http://localhost:8000" -ForegroundColor Yellow
Write-Host "Frontend => http://localhost:5173" -ForegroundColor Yellow
