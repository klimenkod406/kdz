@echo off
title Start Server 2 - Admin Panel

cd /d "%~dp0"

if not exist "server2" (
    echo [ERROR] server2 folder not found!
    echo This server may already be configured as Server 1.
    pause
    exit /b 1
)

if not exist "server2\.env" (
    echo [ERROR] server2\.env not found!
    echo Run installer first and select Server 2.
    pause
    exit /b 1
)

if not exist "server2\node_modules" (
    echo Installing dependencies...
    cd server2
    call npm install
    cd ..
)

echo.
echo ================================================
echo    Starting Server 2 - Admin Panel
echo ================================================
echo.

cd server2
node src/index.js

pause
