@echo off
rem ------------------------------------------------------------
rem Launch Super Rogues dev server and open the game in a browser
rem ------------------------------------------------------------

rem Change directory to the Rogues repo root
cd /d "%~dp0"

rem Start the dev server in a new detached window
start "Super Rogues Server" cmd /c "node tools\dev-server.js 3791"

rem Wait a few seconds for the server to start
ping -n 6 127.0.0.1 >nul

rem Open the game URL in the default browser (or Chrome if installed)
start "" "http://localhost:3791"

rem End of script
exit /b 0
