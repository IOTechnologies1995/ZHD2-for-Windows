# ZHD2 Media Player — Windows Standalone EXE Build Script
# Run in PowerShell on Windows 10/11 with Node.js 20+ installed:
#   powershell -ExecutionPolicy Bypass -File .\scripts\build-windows-exe.ps1

$ErrorActionPreference = "Stop"

Write-Host "===============================================" -ForegroundColor Magenta
Write-Host "  ZHD2 Media Player — Windows EXE Builder" -ForegroundColor White
Write-Host "===============================================" -ForegroundColor Magenta

Write-Host "`n[1/4] Installing project dependencies..." -ForegroundColor Cyan
npm install

Write-Host "`n[2/4] Ensuring Electron and electron-builder are installed..." -ForegroundColor Cyan
npm install -D electron electron-builder

Write-Host "`n[3/4] Building ZHD2 web bundle (Vite)..." -ForegroundColor Cyan
npm run build

Write-Host "`n[4/4] Packaging standalone Windows executable (.exe)..." -ForegroundColor Cyan
npx electron-builder --win portable --config electron-builder.yml

Write-Host "`nDone! Your Windows executable is located in .\release\" -ForegroundColor Green
Get-ChildItem .\release\*.exe | ForEach-Object { Write-Host "  -> $($_.FullName)" -ForegroundColor Yellow }
