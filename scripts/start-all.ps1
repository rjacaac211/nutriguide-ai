# NutriGuide-AI - Start all services
# Requires: OPENAI_API_KEY in .env at project root
# Run from project root: .\scripts\start-all.ps1

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

if (-not (Test-Path ".env")) {
    Write-Host "Create .env with OPENAI_API_KEY=sk-your-key" -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
}

Write-Host "Starting NutriGuide-AI services..." -ForegroundColor Cyan
Write-Host "1. AI Agent (Python) - http://localhost:8000"
Write-Host "2. Backend (Node) - http://localhost:3001"
Write-Host "3. Frontend (React) - http://localhost:5173"
Write-Host ""

# Start AI agent
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\ai-agent'; python main.py"
Start-Sleep -Seconds 3

# Start backend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\backend'; npm run dev"
Start-Sleep -Seconds 2

# Start frontend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\frontend'; npm run dev"

Write-Host "All services started. Open http://localhost:5173" -ForegroundColor Green
