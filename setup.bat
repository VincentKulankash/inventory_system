@echo off
setlocal enabledelayedexpansion
title Inventory System - First Time Setup
color 0A

echo ============================================
echo   INVENTORY SYSTEM - FIRST TIME SETUP
echo ============================================
echo.

REM ── Check Python is installed ──
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python was not found on this computer.
    echo Please install Python from https://www.python.org/downloads/
    echo IMPORTANT: during install, tick the box "Add Python to PATH".
    echo Then run this file again.
    pause
    exit /b 1
)
echo [OK] Python found.

REM ── Check PostgreSQL client is installed ──
psql --version >nul 2>&1
if errorlevel 1 (
    echo [WARNING] PostgreSQL command-line tool "psql" was not found.
    echo Make sure PostgreSQL is installed and running before continuing.
    echo Download it from: https://www.postgresql.org/download/windows/
    echo.
    pause
)

REM ── Create virtual environment ──
if not exist venv (
    echo Creating virtual environment...
    python -m venv venv
) else (
    echo Virtual environment already exists, skipping.
)

call venv\Scripts\activate.bat

echo Installing required packages, this may take a minute...
pip install --upgrade pip >nul
pip install -r requirements.txt
if errorlevel 1 (
    echo [ERROR] Package installation failed. Check the messages above.
    pause
    exit /b 1
)
echo [OK] Packages installed.

REM ── Create .env file if it doesn't exist ──
if not exist .env (
    echo.
    echo No .env file found — let's create one now.
    echo (This stores your database connection details.)
    echo.
    set /p DB_USER="PostgreSQL username: "
    set /p DB_PASS="PostgreSQL password: "
    set /p DB_NAME="Database name (e.g. inventory_db): "

    (
        echo DATABASE_URL=postgresql://!DB_USER!:!DB_PASS!@localhost:5432/!DB_NAME!
        echo SECRET_KEY=change-this-to-a-random-string
    ) > .env

    echo [OK] .env file created.
) else (
    echo .env file already exists, skipping.
)

echo.
echo Setting up the database tables...
flask db upgrade
if errorlevel 1 (
    echo [ERROR] Database setup failed. Confirm PostgreSQL is running and
    echo the database named in your .env file already exists, then try again.
    pause
    exit /b 1
)

echo.
echo ============================================
echo   SETUP COMPLETE
echo   Double-click start.bat any time to launch
echo   the system.
echo ============================================
pause