@echo off
title System Test

cd /d "%~dp0"

echo.
echo ================================================
echo    Ticket System - Full Test
echo ================================================
echo.

echo [1/5] Checking Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [FAIL] Node.js not found!
    exit /b 1
)
echo [OK] Node.js: 
node --version

echo.
echo [2/5] Checking npm...
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [FAIL] npm not found!
    exit /b 1
)
echo [OK] npm: 
npm --version

echo.
echo [3/5] Checking installer dependencies...
if not exist "installer\node_modules" (
    echo [INFO] Installing installer dependencies...
    cd installer
    call npm install
    cd ..
)
echo [OK] Installer dependencies

echo.
echo [4/5] Checking server1 dependencies...
if not exist "server1\node_modules" (
    echo [INFO] Installing server1 dependencies...
    cd server1
    call npm install
    cd ..
)
echo [OK] Server 1 dependencies

echo.
echo [5/5] Checking server2 dependencies...
if not exist "server2\node_modules" (
    echo [INFO] Installing server2 dependencies...
    cd server2
    call npm install
    cd ..
)
echo [OK] Server 2 dependencies

echo.
echo ================================================
echo    Dependencies Check Complete
echo ================================================
echo.
echo Next steps:
echo 1. Make sure PostgreSQL is running
echo 2. Run 'node installer\setup.js' to install a server
echo.

pause
