@echo off
title Ticket System Installer

echo.
echo ================================================
echo    Ticket System Installer
echo ================================================
echo.

cd /d "%~dp0"

echo Checking Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found!
    echo Install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo [OK] Node.js found
echo.

echo Checking npm...
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] npm not found!
    pause
    exit /b 1
)

echo [OK] npm found
echo.

echo Installing installer dependencies...
cd installer
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install dependencies!
    pause
    exit /b 1
)

echo [OK] Dependencies installed
echo.

echo Starting installer...
echo.
node setup.js

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Installer failed!
    pause
    exit /b 1
)

echo.
echo ================================================
echo    Installation completed!
echo ================================================
echo.
echo Now you can start the server using:
echo   - Start Server 1.bat  (for ticket server)
echo   - Start Server 2.bat  (for admin panel)
echo.

pause
