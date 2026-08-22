@echo off
title Phase 10: Final Boss - Deep System Cleanup
chcp 65001 >nul

:: Check for Administrative rights
net session >nul 2>&1
if %errorLevel% == 0 (
    goto :run_cleanup
) else (
    echo [System] Requesting Administrator rights...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

:run_cleanup
echo =======================================================
echo === Final Boss: Windows Deep Component Cleanup ===
echo =======================================================
echo.
echo [1/2] Running DISM Component Cleanup (This takes a few minutes)...
echo This will remove superseded Windows Update backups deep in WinSxS.
dism /Online /Cleanup-Image /StartComponentCleanup

echo.
echo [2/2] Running Windows Disk Cleanup (Automated)...
cleanmgr /sagerun:1

echo.
echo =======================================================
echo === ALL DONE! Your PC is now completely sanitized. ===
echo =======================================================
pause
