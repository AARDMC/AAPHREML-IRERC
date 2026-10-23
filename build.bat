@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0build_preview.ps1"
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Preview build failed with code %ERRORLEVEL%.
    exit /b %ERRORLEVEL%
)
