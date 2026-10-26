@echo off
setlocal
cd /d "%~dp0site"
where node >nul 2>nul
if errorlevel 1 (
  echo Please install Node.js 22 or later, then run this file again.
  pause
  exit /b 1
)
echo Starting JY FITNESS ATLAS...
node server.mjs %*
if errorlevel 1 pause
