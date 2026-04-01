@echo off
chcp 65001 >nul
title Install Dependencies

cd /d "%~dp0"

echo.
echo ================================================
echo    Установка зависимостей
echo ================================================
echo.

echo Проверка Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js не найден!
    pause
    exit /b 1
)

echo [OK] Node.js найден
echo.

echo Установка зависимостей установщика...
cd installer
call npm install
cd ..

echo.
echo [OK] Готово!
echo.
echo Теперь запустите "Установить сервер.bat" или:
echo   node installer\setup.js
echo.
pause
