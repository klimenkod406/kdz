@echo off
chcp 65001 >nul
title Start Server 2

cd /d "%~dp0"

if not exist "server2" (
    echo [ERROR] This is Server 1! server2 folder not found.
    pause
    exit /b 1
)

if not exist "server2\.env" (
    echo [ERROR] Run installer first!
    pause
    exit /b 1
)

cd server2
node src\index.js
