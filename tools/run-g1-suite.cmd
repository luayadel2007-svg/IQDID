@echo off
rem TEST ONLY - runs the frozen G1 suite check. Exit: 0=PASS 1=FAIL 2=BLOCKED
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0run-g1-suite.ps1" %*
exit /b %ERRORLEVEL%
