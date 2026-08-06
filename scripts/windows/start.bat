@echo off
title Review Grader
cd /d "%~dp0"

"%~dp0jre\bin\java.exe" -jar "%~dp0review-grader.jar"

echo.
echo   Review Grader has stopped.
pause >nul
