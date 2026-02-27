@echo off
echo Starting Mengko Agents with debug mode...
echo.

REM Find the installed app
set APP_PATH=%LOCALAPPDATA%\Programs\Mengko Agents\Mengko Agents.exe

if exist "%APP_PATH%" (
    echo Found app at: %APP_PATH%
    echo Starting with --debug flag...
    "%APP_PATH%" --debug
) else (
    echo App not found at: %APP_PATH%
    echo.
    echo Checking alternative locations...

    REM Check for alternative install locations
    if exist "%LOCALAPPDATA%\Programs\@mengko-agents\electron\Mengko Agents.exe" (
        echo Found at: %LOCALAPPDATA%\Programs\@mengko-agents\electron\Mengko Agents.exe
        "%LOCALAPPDATA%\Programs\@mengko-agents\electron\Mengko Agents.exe" --debug
    ) else (
        echo App not found. Please check installation.
    )
)

echo.
echo Check logs at: %APPDATA%\Mengko Agents\logs\main.log
pause