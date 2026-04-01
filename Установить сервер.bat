@echo off
chcp 65001 >nul
title Ticket System Installer

cd /d "%~dp0"

echo.
echo ================================================
echo    Установщик системы заявок
echo ================================================
echo.

REM Проверка Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js не найден!
    echo Установите Node.js с https://nodejs.org/
    pause
    exit /b 1
)

REM Проверка зависимостей установщика
if not exist "installer\node_modules" (
    echo Установка зависимостей установщика...
    cd installer
    call npm install
    cd ..
    if %errorlevel% neq 0 (
        echo [ERROR] Ошибка установки зависимостей!
        pause
        exit /b 1
    )
)

echo.
echo ================================================
echo ЗАПУСК УСТАНОВЩИКА...
echo ================================================
echo.
echo Открывается новое окно консоли для установки.
echo Не закрывайте окно до завершения установки!
echo.
pause

REM Запускаем установщик в новом окне консоли
start "Установщик системы заявок" cmd /k "cd /d %cd% && node installer\setup.js"

REM Ждём завершения
exit
