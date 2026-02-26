# Startup script for SynChain 2.0 Backend
Write-Host "Starting SynChain 2.0 Backend..." -ForegroundColor Yellow

# Get the directory of this script (backend folder)
$backendDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
if (-not $backendDir) { $backendDir = Get-Location }

Set-Location $backendDir

# Ensure the parent directory is in PYTHONPATH so "backend.main" or "main" can resolve depending on command
$env:PYTHONPATH = ".;.."

# Run uvicorn from the backend directory using just "main:app"
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
