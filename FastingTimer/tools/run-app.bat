@echo off
title Fasting Sentinel Desktop HUD
cd /d "%~dp0\.."
echo ========================================================
echo   Fasting Sentinel - Living Ring Desktop HUD
echo ========================================================
echo.
echo Launching native Windows application...
echo.

node .\node_modules\electron\cli.js .

echo.
echo Application closed.
pause
