@echo off
chcp 65001 >nul
title Ticket System Installer

cd /d "%~dp0"

echo.
echo ================================================
echo    Ticket System Installer
echo ================================================
echo.

echo Checking Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found!
    echo Install Node.js from https://nodejs.org/
    pause
    exit /b 1
)
echo [OK] Node.js found

echo Checking npm...
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] npm not found!
    pause
    exit /b 1
)
echo [OK] npm found

echo Checking installer dependencies...
if not exist "installer\node_modules" (
    echo Installing dependencies...
    cd installer
    call npm install
    cd ..
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install dependencies!
        pause
        exit /b 1
    )
    echo [OK] Dependencies installed
) else (
    echo [OK] Dependencies already installed
)

echo.
echo Starting installer...
echo.
node installer\setup.js
set INSTALLER_RESULT=%ERRORLEVEL%

if %INSTALLER_RESULT% neq 0 (
    echo.
    echo [ERROR] Installer failed with code %INSTALLER_RESULT%!
    echo Press any key to exit...
    pause
    exit /b %INSTALLER_RESULT%
)

echo.
echo ================================================
echo    Installation completed!
echo ================================================
echo.
echo Press any key to continue...
pause >nul
