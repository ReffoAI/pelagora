@echo off
REM ─────────────────────────────────────────────────────────
REM  Reffo Beacon — Windows Launcher
REM  Double-click this file in Explorer to start your beacon.
REM ─────────────────────────────────────────────────────────
setlocal enabledelayedexpansion

set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

set "NODE=%SCRIPT_DIR%node\node.exe"
set "APP_ENTRY=%SCRIPT_DIR%app\dist\index.js"

REM ── Preflight checks ────────────────────────────────────
if not exist "%NODE%" (
    echo ERROR: Embedded Node.js not found at %NODE%
    echo This bundle may be incomplete. Re-download from https://github.com/reffo/reffo-beacon/releases
    pause
    exit /b 1
)

if not exist "%APP_ENTRY%" (
    echo ERROR: App entry point not found at %APP_ENTRY%
    echo This bundle may be incomplete. Re-download from https://github.com/reffo/reffo-beacon/releases
    pause
    exit /b 1
)

REM ── First-run setup ─────────────────────────────────────
if not exist "%SCRIPT_DIR%data" mkdir "%SCRIPT_DIR%data"
if not exist "%SCRIPT_DIR%uploads" mkdir "%SCRIPT_DIR%uploads"

if not exist "%SCRIPT_DIR%.env" (
    for /f %%i in ('"%NODE%" -e "console.log(require('crypto').randomUUID())"') do set "BEACON_ID=%%i"
    (
        echo # Reffo Beacon configuration — generated on first run
        echo BEACON_ID=!BEACON_ID!
        echo PORT=3000
    ) > "%SCRIPT_DIR%.env"
    echo Created .env with BEACON_ID=!BEACON_ID!
)

REM ── Start the beacon ────────────────────────────────────
set "PATH=%SCRIPT_DIR%node;%PATH%"
if not defined PORT set "PORT=3000"

echo.
echo   Reffo Beacon
echo   ────────────────────────────────
echo   Starting on http://localhost:%PORT%
echo   Press Ctrl+C to stop.
echo.

REM Open browser after a short delay
start "" /min cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:%PORT%"

REM Run the beacon
"%NODE%" "%APP_ENTRY%"

pause
