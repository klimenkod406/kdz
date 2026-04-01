@echo off
chcp 65001 >nul
title Запуск Server 2 - Админ-панель

cd /d "%~dp0"

if not exist "server2" (
    echo [ERROR] Папка server2 не найдена!
    echo Похоже, этот сервер уже был настроен как Server 1.
    pause
    exit /b 1
)

if not exist "server2\.env" (
    echo [ERROR] Файл server2\.env не найден!
    echo Сначала запустите установщик и выберите Server 2.
    pause
    exit /b 1
)

if not exist "server2\node_modules" (
    echo Установка зависимостей...
    cd server2
    call npm install
    cd ..
)

echo.
echo ================================================
echo    Запуск Server 2 - Админ-панель
echo ================================================
echo.

cd server2
node src/index.js

pause
