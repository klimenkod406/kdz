@echo off
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
    echo Install from https://nodejs.org/
    pause
    exit /b 1
)

echo [OK] Node.js found
echo.

echo Checking installer dependencies...
if not exist "installer\node_modules" (
    echo Installing dependencies...
    cd installer
    call npm install
    if %errorlevel% neq 0 (
        cd ..
        echo.
        echo [ERROR] Failed to install!
        echo Run: install-dependencies.bat
        pause
        exit /b 1
    )
    cd ..
    echo [OK] Dependencies installed
    echo.
) else (
    echo [OK] Dependencies found
    echo.
)

echo ================================================
echo Starting Installer...
echo ================================================
echo.
echo Opening new console window...
echo.
pause

start "Ticket System Installer" cmd /k "cd /d %cd% && node installer\setup.js"

exit
