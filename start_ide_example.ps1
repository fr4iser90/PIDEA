# IDE Starter Script für Windows PowerShell
param(
    [string]$IDE,
    [string]$Slot
)

# IDE Konfigurationen
$IDES = @{
    "cursor" = ".\Cursor.exe"
    "vscode" = "code"
}

# Port Ranges für verschiedene IDEs
$PORT_RANGES = @{
    "cursor" = @(9222..9232)
    "vscode" = @(9233..9242)
}

# Hilfsfunktion: prüft ob Port frei ist
function Test-PortInUse {
    param([int]$Port)
    
    try {
        $connection = Test-NetConnection -ComputerName "localhost" -Port $Port -InformationLevel Quiet -WarningAction SilentlyContinue
        return $connection.TcpTestSucceeded
    }
    catch {
        return $false
    }
}

# Hilfsfunktion: findet freien Port in Range
function Find-FreePort {
    param([int[]]$PortRange)
    
    foreach ($port in $PortRange) {
        if (-not (Test-PortInUse -Port $port)) {
            return $port
        }
    }
    return $null
}

# Hilfsfunktion: zeigt verfügbare IDEs
function Show-IDEs {
    Write-Host "📋 Verfügbare IDEs:" -ForegroundColor Cyan
    foreach ($ide in $IDES.Keys) {
        $range = $PORT_RANGES[$ide]
        Write-Host "   $ide (Ports $($range[0])-$($range[-1]))" -ForegroundColor Yellow
    }
}

# Hilfsfunktion: zeigt Hilfe
function Show-Help {
    Write-Host "🚀 IDE Starter Script" -ForegroundColor Green
    Write-Host ""
    Write-Host "Verwendung:" -ForegroundColor White
    Write-Host "  .\start_ide_example.ps1 [ide] [slot]" -ForegroundColor Gray
    Write-Host "  .\start_ide_example.ps1 [ide] auto" -ForegroundColor Gray
    Write-Host "  .\start_ide_example.ps1 menu" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Argumente:" -ForegroundColor White
    Write-Host "  ide    - cursor, vscode" -ForegroundColor Gray
    Write-Host "  slot   - spezifischer Slot (Zahl)" -ForegroundColor Gray
    Write-Host "  auto   - automatisch freien Slot finden" -ForegroundColor Gray
    Write-Host "  menu   - interaktives Menü" -ForegroundColor Gray
    Write-Host ""
    Show-IDEs
    Write-Host ""
    Write-Host "Beispiele:" -ForegroundColor White
    Write-Host "  .\start_ide_example.ps1 cursor        # Cursor mit freiem Port starten" -ForegroundColor Gray
    Write-Host "  .\start_ide_example.ps1 vscode 3      # VSCode auf Slot 3 starten" -ForegroundColor Gray
    Write-Host "  .\start_ide_example.ps1 cursor auto   # Cursor mit automatischem Slot" -ForegroundColor Gray
}

# Interaktives Menü
function Show-Menu {
    Write-Host "🎯 IDE Starter - Wähle deine IDE:" -ForegroundColor Green
    Write-Host ""
    
    $i = 1
    foreach ($ide in $IDES.Keys) {
        $range = $PORT_RANGES[$ide]
        Write-Host "  $i) $ide (Ports $($range[0])-$($range[-1]))" -ForegroundColor Yellow
        $i++
    }
    Write-Host "  $i) Hilfe" -ForegroundColor Cyan
    Write-Host "  0) Beenden" -ForegroundColor Red
    Write-Host ""
    
    $choice = Read-Host "Wähle eine Option (0-$i)"
    
    switch ($choice) {
        "0" { exit }
        "$i" { Show-Help; exit }
        default {
            $idesArray = @($IDES.Keys)
            if ([int]$choice -ge 1 -and [int]$choice -le $idesArray.Count) {
                $selectedIDE = $idesArray[[int]$choice - 1]
                Write-Host ""
                $slot = Read-Host "Slot für $selectedIDE (Zahl oder 'auto')"
                Start-IDE -IDE $selectedIDE -Slot $slot
            }
            else {
                Write-Host "❌ Ungültige Auswahl" -ForegroundColor Red
                exit 1
            }
        }
    }
}

# IDE starten
function Start-IDE {
    param(
        [string]$IDE,
        [string]$Slot
    )
    
    # Prüfe ob IDE existiert
    if (-not $IDES.ContainsKey($IDE)) {
        Write-Host "❌ Unbekannte IDE: $IDE" -ForegroundColor Red
        Show-IDEs
        exit 1
    }
    
    $idePath = $IDES[$IDE]
    $portRange = $PORT_RANGES[$IDE]
    
    # Prüfe ob IDE verfügbar ist
    if ($IDE -eq "cursor") {
        if (-not (Test-Path $idePath)) {
            Write-Host "❌ Cursor nicht gefunden: $idePath" -ForegroundColor Red
            Write-Host "   Stelle sicher, dass Cursor.exe im aktuellen Verzeichnis liegt" -ForegroundColor Yellow
            exit 1
        }
    }
    else {
        try {
            Get-Command $idePath -ErrorAction Stop | Out-Null
        }
        catch {
            Write-Host "❌ $IDE ist nicht installiert oder nicht im PATH" -ForegroundColor Red
            exit 1
        }
    }
    
    $port = $null
    $dir = $null
    
    # Port und Verzeichnis bestimmen
    if ([string]::IsNullOrEmpty($Slot)) {
        # Automatisch freien Port finden
        $port = Find-FreePort -PortRange $portRange
        if ($null -eq $port) {
            Write-Host "❌ Kein freier Port in Range $($portRange[0])-$($portRange[-1]) verfügbar" -ForegroundColor Red
            exit 1
        }
        $dir = "$env:USERPROFILE\.pidea\.${IDE}_$port"
    }
    elseif ($Slot -eq "auto") {
        # Automatisch freien Port finden
        $port = Find-FreePort -PortRange $portRange
        if ($null -eq $port) {
            Write-Host "❌ Kein freier Port in Range $($portRange[0])-$($portRange[-1]) verfügbar" -ForegroundColor Red
            exit 1
        }
        $dir = "$env:USERPROFILE\.pidea\.${IDE}_$port"
    }
    elseif ($Slot -match '^\d+$') {
        # Spezifischer Slot
        $slotNumber = [int]$Slot
        $port = $portRange[0] + $slotNumber - 1
        
        if ($port -gt $portRange[-1]) {
            Write-Host "❌ Slot $Slot ist außerhalb der verfügbaren Range ($($portRange[0])-$($portRange[-1]))" -ForegroundColor Red
            exit 1
        }
        
        if (Test-PortInUse -Port $port) {
            Write-Host "❌ Port $port (Slot $Slot) ist bereits belegt" -ForegroundColor Red
            exit 1
        }
        
        $dir = "$env:USERPROFILE\.pidea\.${IDE}_$port"
    }
    else {
        Write-Host "❌ Ungültiger Slot: $Slot" -ForegroundColor Red
        exit 1
    }
    
    # Verzeichnis erstellen falls nicht vorhanden
    $pideaDir = "$env:USERPROFILE\.pidea"
    if (-not (Test-Path $pideaDir)) {
        New-Item -ItemType Directory -Path $pideaDir -Force | Out-Null
    }
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
    
    # IDE starten
    Write-Host "🚀 Starte $IDE auf Port $port..." -ForegroundColor Green
    
    try {
        if ($IDE -eq "cursor") {
            Start-Process -FilePath $idePath -ArgumentList "--user-data-dir=`"$dir`"", "--remote-debugging-port=$port" -WindowStyle Normal
        }
        else {
            Start-Process -FilePath $idePath -ArgumentList "--user-data-dir=`"$dir`"", "--remote-debugging-port=$port" -WindowStyle Normal
        }
        
        Write-Host "✅ $IDE gestartet auf Port $port" -ForegroundColor Green
        Write-Host "   Verzeichnis: $dir" -ForegroundColor Gray
        Write-Host "   Debug URL: http://localhost:$port" -ForegroundColor Gray
    }
    catch {
        Write-Host "❌ Fehler beim Starten von $IDE: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
}

# Hauptlogik
if ($IDE -eq "menu") {
    Show-Menu
}
elseif ($IDE -in @("help", "-h", "--help")) {
    Show-Help
}
elseif ([string]::IsNullOrEmpty($IDE)) {
    Write-Host "❌ Keine IDE angegeben" -ForegroundColor Red
    Write-Host ""
    Show-Help
    exit 1
}
else {
    Start-IDE -IDE $IDE -Slot $Slot
} 