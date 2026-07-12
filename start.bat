@echo off
title Inventory System
color 0A

if not exist venv (
    echo It looks like setup hasn't been run yet.
    echo Please double-click setup.bat first.
    pause
    exit /b 1
)

call venv\Scripts\activate.bat

echo Starting the Inventory System...
echo.
echo Your browser will open automatically in a few seconds.
echo Do NOT close this black window while you are using the system —
echo closing it will shut the system down.
echo.

start "" cmd /c "timeout /t 2 >nul && start http://127.0.0.1:5000"
python app.py