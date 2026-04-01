@echo off
title Install Dependencies

cd /d "%~dp0"

echo.
echo ================================================
echo    Install Dependencies
echo ================================================
echo.

echo Checking Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found!
    pause
    exit /b 1
)

echo [OK] Node.js found
echo.

echo Installing installer dependencies...
cd installer
call npm install
if %errorlevel% neq 0 (
    cd ..
    echo.
    echo [ERROR] Failed to install dependencies!
    echo Try manually:
    echo   cd installer
    echo   npm install
    pause
    exit /b 1
)
cd ..

echo.
echo [OK] Done!
echo.
echo Now run "Install Server.bat" or:
echo   node installer\setup.js
echo.
pause
