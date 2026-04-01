@echo off
title Start Server 1

cd /d "%~dp0"

if not exist "server1" (
    echo [ERROR] This is Server 2! server1 folder not found.
    pause
    exit /b 1
)

if not exist "server1\.env" (
    echo [ERROR] Run installer first!
    pause
    exit /b 1
)

cd server1
node src\index.js
