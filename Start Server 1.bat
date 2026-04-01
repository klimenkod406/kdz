@echo off
title Start Server 1 - Ticket Receiver

cd /d "%~dp0"

if not exist "server1" (
    echo [ERROR] server1 folder not found!
    echo This server may already be configured as Server 2.
    pause
    exit /b 1
)

if not exist "server1\.env" (
    echo [ERROR] server1\.env not found!
    echo Run installer first and select Server 1.
    pause
    exit /b 1
)

if not exist "server1\node_modules" (
    echo Installing dependencies...
    cd server1
    call npm install
    cd ..
)

echo.
echo ================================================
echo    Starting Server 1 - Ticket Receiver
echo ================================================
echo.

cd server1
node src/index.js

pause
