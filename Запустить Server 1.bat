@echo off
chcp 65001 >nul
title Запуск Server 1 - Прием заявок

cd /d "%~dp0"

if not exist "server1" (
    echo [ERROR] Папка server1 не найдена!
    echo Похоже, этот сервер уже был настроен как Server 2.
    pause
    exit /b 1
)

if not exist "server1\.env" (
    echo [ERROR] Файл server1\.env не найден!
    echo Сначала запустите установщик и выберите Server 1.
    pause
    exit /b 1
)

if not exist "server1\node_modules" (
    echo Установка зависимостей...
    cd server1
    call npm install
    cd ..
)

echo.
echo ================================================
echo    Запуск Server 1 - Прием заявок
echo ================================================
echo.

cd server1
node src/index.js

pause
