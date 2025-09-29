@echo off
setlocal enabledelayedexpansion

cd /d "%USERPROFILE%\Documents" || exit /b 1

REM IDE Konfigurationen
set "CURSOR_PATH=.\Cursor-1.5.7-x86_64.AppImage"
set "VSCODE_PATH="

REM Port Ranges für verschiedene IDEs
set "CURSOR_RANGE=9222:9232"
set "VSCODE_RANGE=9233:9242"

REM Hilfsfunktion: prüft ob Port frei ist
:port_in_use
set "port=%1"
netstat -an | find ":%port% " >nul 2>&1
if %errorlevel% equ 0 (
    exit /b 1
) else (
    exit /b 0
)

REM Hilfsfunktion: findet freien Port in Range
:find_free_port
set "range=%1"
for /f "tokens=1,2 delims=:" %%a in ("%range%") do (
    set "start_port=%%a"
    set "end_port=%%b"
)

for /l %%i in (%start_port%,1,%end_port%) do (
    call :port_in_use %%i
    if !errorlevel! equ 0 (
        echo %%i
        exit /b 0
    )
)
exit /b 1

REM Hilfsfunktion: zeigt verfügbare IDEs
:show_ides
echo 📋 Verfügbare IDEs:
echo    cursor (Ports %CURSOR_RANGE%)
echo    vscode (Ports %VSCODE_RANGE%)
goto :eof

REM Hilfsfunktion: zeigt Hilfe
:show_help
echo 🚀 IDE Starter Script
echo.
echo Verwendung:
echo   %0 [ide] [slot]
echo   %0 [ide] auto
echo   %0 menu
echo.
echo Argumente:
echo   ide    - cursor, vscode
echo   slot   - spezifischer Slot (Zahl)
echo   auto   - automatisch freien Slot finden
echo   menu   - interaktives Menü
echo.
call :show_ides
echo.
echo Beispiele:
echo   %0 cursor        # Cursor mit freiem Port starten
echo   %0 vscode 3      # VSCode auf Slot 3 starten
echo   %0 cursor auto   # Cursor mit automatischem Slot
goto :eof

REM Interaktives Menü
:show_menu
echo 🎯 IDE Starter - Wähle deine IDE:
echo.
echo   1) cursor (Ports %CURSOR_RANGE%)
echo   2) vscode (Ports %VSCODE_RANGE%)
echo   3) Hilfe
echo   0) Beenden
echo.
set /p "choice=Wähle eine Option (0-3): "

if "%choice%"=="0" exit /b 0
if "%choice%"=="3" (
    call :show_help
    exit /b 0
)
if "%choice%"=="1" (
    set "selected_ide=cursor"
    goto :get_slot
)
if "%choice%"=="2" (
    set "selected_ide=vscode"
    goto :get_slot
)
echo ❌ Ungültige Auswahl
exit /b 1

:get_slot
echo.
set /p "slot=Slot für %selected_ide% (Zahl oder 'auto'): "
call :start_ide "%selected_ide%" "%slot%"
goto :eof

REM IDE starten
:start_ide
set "ide=%1"
set "slot=%2"

REM Prüfe ob IDE existiert
if not "%ide%"=="cursor" if not "%ide%"=="vscode" (
    echo ❌ Unbekannte IDE: %ide%
    call :show_ides
    exit /b 1
)

REM Setze IDE-spezifische Variablen
if "%ide%"=="cursor" (
    set "ide_path=%CURSOR_PATH%"
    set "port_range=%CURSOR_RANGE%"
) else (
    set "ide_path=%VSCODE_PATH%"
    set "port_range=%VSCODE_RANGE%"
)

REM Prüfe ob IDE verfügbar ist
if "%ide%"=="cursor" (
    if not exist "%ide_path%" (
        echo ❌ Cursor AppImage nicht gefunden: %ide_path%
        exit /b 1
    )
) else (
    where %ide_path% >nul 2>&1
    if %errorlevel% neq 0 (
        echo ❌ %ide% ist nicht installiert oder nicht im PATH
        exit /b 1
    )
)

REM Port und Verzeichnis bestimmen
if "%slot%"=="" (
    REM Automatisch freien Port finden
    for /f %%p in ('call :find_free_port "%port_range%"') do set "port=%%p"
    if "%port%"=="" (
        echo ❌ Kein freier Port in Range %port_range% verfügbar
        exit /b 1
    )
    set "dir=%USERPROFILE%\.pidea\.%ide%_%port%"
) else if "%slot%"=="auto" (
    REM Automatisch freien Port finden
    for /f %%p in ('call :find_free_port "%port_range%"') do set "port=%%p"
    if "%port%"=="" (
        echo ❌ Kein freier Port in Range %port_range% verfügbar
        exit /b 1
    )
    set "dir=%USERPROFILE%\.pidea\.%ide%_%port%"
) else (
    REM Spezifischer Slot
    for /f "tokens=1,2 delims=:" %%a in ("%port_range%") do (
        set "start_port=%%a"
        set "end_port=%%b"
    )
    set /a "port=%start_port% + %slot% - 1"
    set /a "end_port_num=%end_port%"
    
    if %port% gtr %end_port_num% (
        echo ❌ Slot %slot% ist außerhalb der verfügbaren Range (%port_range%)
        exit /b 1
    )
    
    call :port_in_use %port%
    if !errorlevel! equ 1 (
        echo ❌ Port %port% (Slot %slot%) ist bereits belegt
        exit /b 1
    )
    
    set "dir=%USERPROFILE%\.pidea\.%ide%_%port%"
)

REM Verzeichnis erstellen falls nicht vorhanden
if not exist "%USERPROFILE%\.pidea" mkdir "%USERPROFILE%\.pidea"
if not exist "%dir%" mkdir "%dir%"

REM IDE starten
echo 🚀 Starte %ide% auf Port %port%...

if "%ide%"=="cursor" (
    REM Für Windows müsstest du einen AppImage-Runner installieren
    REM oder Cursor direkt als .exe verwenden
    echo ⚠️  Cursor AppImage benötigt einen Windows AppImage-Runner
    echo    Verwende stattdessen die .exe Version von Cursor
    REM start "" "%ide_path%" --user-data-dir="%dir%" --remote-debugging-port=%port%
) else (
    REM VSCode mit Remote Debugging starten
    start "" "%ide_path%" --user-data-dir="%dir%" --remote-debugging-port=%port%
)

echo ✅ %ide% gestartet auf Port %port%
echo    Verzeichnis: %dir%
echo    Debug URL: http://localhost:%port%
goto :eof

REM Hauptlogik
if "%1"=="menu" goto :show_menu
if "%1"=="help" goto :show_help
if "%1"=="-h" goto :show_help
if "%1"=="--help" goto :show_help
if "%1"=="" (
    echo ❌ Keine IDE angegeben
    echo.
    call :show_help
    exit /b 1
)

call :start_ide "%1" "%2" 
