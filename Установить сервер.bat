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

echo [OK] Node.js найден
echo.

REM Проверка и установка зависимостей установщика
if not exist "installer\node_modules" (
    echo [!] Зависимости не найдены. Установка...
    echo.
    cd installer
    call npm install
    if %errorlevel% neq 0 (
        cd ..
        echo.
        echo [ERROR] Ошибка установки зависимостей!
        echo Попробуйте вручную:
        echo   cd installer
        echo   npm install
        pause
        exit /b 1
    )
    cd ..
    echo [OK] Зависимости установлены
    echo.
) else (
    echo [OK] Зависимости найдены
    echo.
)

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
