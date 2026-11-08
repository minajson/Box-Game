@echo off
rem Crack the Box - NAPE 2026 (offline). Double-click this file to start the game.
rem Uses the Node.js engine bundled in the "runtime" folder - nothing to install.
setlocal
cd /d "%~dp0"
title Crack the Box - NAPE 2026 (offline) - leave this window open
echo ==============================================
echo    CRACK THE BOX - NAPE 2026   (offline)
echo ==============================================

rem Windows opens a zip like a folder; the game cannot run from inside it.
echo "%~dp0" | findstr /i /c:"\Temp1_" >nul
if not errorlevel 1 goto inzip

set "NODE=%~dp0runtime\node.exe"
if not exist "%NODE%" goto trysystem
"%NODE%" --version >nul 2>nul
if errorlevel 1 goto trysystem
goto run

:trysystem
rem Last resort: a Node.js the computer already has.
where node >nul 2>nul
if errorlevel 1 goto noengine
set "NODE=node"
node -e "process.exit(Number(process.versions.node.split('.')[0]) >= 18 ? 0 : 1)" >nul 2>nul
if errorlevel 1 goto noengine

:run
set OPEN_BROWSER=1
"%NODE%" "%~dp0server\serve-offline.mjs"
if errorlevel 1 pause
exit /b %errorlevel%

:inzip
echo.
echo   This folder is still INSIDE the zip file.
echo   Close this window, then right-click the zip file and choose "Extract All...",
echo   open the new folder it creates, and double-click START-GAME-Windows.bat there.
echo.
pause
exit /b 1

:noengine
echo.
echo   The game engine could not start on this computer.
echo   - Make sure you copied and extracted the WHOLE folder (it must contain a "runtime" folder).
echo   - If antivirus removed runtime\node.exe, restore it or copy the folder again.
echo   - This game needs Windows 10 or newer (64-bit).
echo.
pause
exit /b 1
