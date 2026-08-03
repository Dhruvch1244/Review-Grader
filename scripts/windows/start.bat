@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

set /a PORT=30000 + %RANDOM% %% 10000
set HOSTNAME=0.0.0.0
set PORT=%PORT%

echo.
echo   Review Grader
echo   Starting server on port %PORT% ...
echo.

start "Review Grader Server" /min "%~dp0node\node.exe" "%~dp0server.js"

timeout /t 3 /nobreak >nul
start "" "http://localhost:%PORT%"

echo   Running at http://localhost:%PORT%
echo   Other devices on the same WiFi can reach it at http://YOUR-IP:%PORT%
echo.
echo   Leave this window open while you use Review Grader.
echo   To stop the server: close the minimized "Review Grader Server"
echo   window, or find node.exe in Task Manager and end it.
echo.
pause >nul
