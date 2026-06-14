# Starts backend (Django) and frontend (Vite) in separate PowerShell windows
$ErrorActionPreference = 'Stop'

function Start-AppWindow {
  param(
    [string]$Title,
    [string]$WorkingDir,
    [string]$Command
  )

  $script = @"
`$ErrorActionPreference = 'Stop'
`$Title = @'
$Title
'@
`$WorkingDir = @'
$WorkingDir
'@
`$Command = @'
$Command
'@

try {
  Write-Host ("=> {0}" -f `$Title) -ForegroundColor Cyan
  Set-Location `$WorkingDir
  Invoke-Expression `$Command
} catch {
  Write-Host ("[{0}] ERROR: {1}" -f `$Title, `$_.Exception.Message) -ForegroundColor Red
}
"@

  $encoded = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($script))

  $psArgs = @(
    '-NoExit',
    '-EncodedCommand',
    $encoded
  )
  Start-Process -FilePath powershell -ArgumentList $psArgs | Out-Null
}

# Resolve absolute paths
$RepoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir = Join-Path $RepoRoot 'backend'
$FrontendDir = Join-Path $RepoRoot 'frontend'

# Backend command: activate venv, migrate, then runserver
$BackendCmd = @"
if (Test-Path "${RepoRoot}\.venv\Scripts\Activate.ps1") {
  & "${RepoRoot}\.venv\Scripts\Activate.ps1"
} elseif (Test-Path "${BackendDir}\.venv\Scripts\Activate.ps1") {
  & "${BackendDir}\.venv\Scripts\Activate.ps1"
}
Write-Host "=> Applying migrations..." -ForegroundColor Cyan
python manage.py migrate --run-syncdb
Write-Host "=> Starting Django dev server..." -ForegroundColor Cyan
python manage.py runserver 8000
"@

# Frontend command: install deps if missing, then dev server
$FrontendCmd = @"
if (-not (Test-Path "${FrontendDir}\node_modules")) {
  Write-Host "=> node_modules not found, running npm install..." -ForegroundColor Cyan
  npm install
}
npm run dev
"@

Start-AppWindow -Title 'Backend: Django (http://localhost:8000)' -WorkingDir $BackendDir -Command $BackendCmd
Start-AppWindow -Title 'Frontend: Vite (http://localhost:5173)' -WorkingDir $FrontendDir -Command $FrontendCmd

Write-Host ""
Write-Host "Launched backend and frontend in separate windows." -ForegroundColor Green
Write-Host ""
Write-Host "  Portfolio  => http://localhost:5173"           -ForegroundColor Yellow
Write-Host "  JDR        => http://localhost:5173/#/jdr"     -ForegroundColor Yellow
Write-Host "  IRL RPG    => http://localhost:5173/#/irlrpg"  -ForegroundColor Yellow
Write-Host "  API        => http://localhost:8000/api/"      -ForegroundColor Yellow
Write-Host "  Admin      => http://localhost:8000/admin/"    -ForegroundColor Yellow
Write-Host ""
