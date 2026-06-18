@echo off
setlocal

set "NODE_EXE=C:\Users\kosuk\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
set "NEXT_CLI=%~dp0node_modules\next\dist\bin\next"

if not exist "%NODE_EXE%" (
  echo Node.js runtime was not found.
  echo Please install Node.js, then run: npm install
  pause
  exit /b 1
)

if not exist "%NEXT_CLI%" (
  echo App dependencies were not found.
  echo Please ask Codex to reinstall the dependencies.
  pause
  exit /b 1
)

echo.
echo Shindan OS is starting...
echo Open http://localhost:3000 in your browser.
echo Keep this window open while using the app.
echo.

"%NODE_EXE%" "%NEXT_CLI%" dev

endlocal
