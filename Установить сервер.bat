@echo off
chcp 65001 >nul
title Установщик системы заявок

echo.
echo ================================================
echo    Установщик системы заявок
echo ================================================
echo.

cd /d "%~dp0"

echo Проверка Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js не найден!
    echo Установите Node.js с https://nodejs.org/
    pause
    exit /b 1
)

echo [OK] Node.js найден
echo.

echo Проверка npm...
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] npm не найден!
    pause
    exit /b 1
)

echo [OK] npm найден
echo.

echo Установка зависимостей установщика...
cd installer
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Ошибка установки зависимостей!
    pause
    exit /b 1
)

echo [OK] Зависимости установлены
echo.

echo Запуск установщика...
echo.
node setup.js

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Ошибка установщика!
    pause
    exit /b 1
)

echo.
echo ================================================
echo    Установка завершена!
echo ================================================
echo.
echo Теперь вы можете запустить сервер через ярлык:
echo   - Запустить Server 1.bat  (для сервера заявок)
echo   - Запустить Server 2.bat  (для админ-панели)
echo.

pause
