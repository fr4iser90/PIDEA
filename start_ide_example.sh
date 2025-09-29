#!/usr/bin/env bash

cd "$HOME/Documents" || exit 1

# IDE Konfigurationen - werden vom Backend geladen
declare -A IDES

# Pfade vom Backend laden
load_ide_paths() {
  echo "📡 Lade IDE-Pfade vom Backend..."
  
  # Backend API aufrufen
  local response=$(curl -s http://localhost:3000/api/ide/configurations/executable-paths 2>/dev/null)
  
  if [[ $? -eq 0 && -n "$response" ]]; then
    # JSON parsen und in IDES Array laden
    local cursor_path=$(echo "$response" | jq -r '.data.cursor // empty' 2>/dev/null)
    local vscode_path=$(echo "$response" | jq -r '.data.vscode // empty' 2>/dev/null)
    
    if [[ -n "$cursor_path" ]]; then
      IDES["cursor"]="$cursor_path"
    else
      IDES["cursor"]="./Cursor-1.5.7-x86_64.AppImage"  # Fallback
    fi
    
    if [[ -n "$vscode_path" ]]; then
      IDES["vscode"]="$vscode_path"
    else
      IDES["vscode"]="code"  # Fallback
    fi
    
    echo "✅ IDE-Pfade geladen"
  else
    echo "⚠️  Backend nicht erreichbar, verwende Fallback-Pfade"
    # Fallback zu hardcoded Pfaden
    IDES["cursor"]="./Cursor-1.5.7-x86_64.AppImage"
    IDES["vscode"]="code"
  fi
}

# Port Ranges für verschiedene IDEs
declare -A PORT_RANGES=(
  ["cursor"]="9222:9232"
  ["vscode"]="9233:9242"
)

RUNNER="appimage-run"

# Hilfsfunktion: prüft ob Port frei ist
port_in_use() {
  local port=$1
  
  # Prüfe verfügbare Tools in Reihenfolge der Präferenz
  if command -v ss &> /dev/null; then
    ss -tuln | grep -q ":$port "
    return $?
  elif command -v netstat &> /dev/null; then
    netstat -tuln | grep -q ":$port "
    return $?
  elif command -v lsof &> /dev/null; then
    lsof -i ":$port" &>/dev/null
    return $?
  else
    echo "❌ No port check tool available!"
    echo "   Please install one of these tools:"
    echo "   - ss (iproute2): sudo apt install iproute2"
    echo "   - netstat (net-tools): sudo apt install net-tools" 
    echo "   - lsof: sudo apt install lsof"
    echo ""
    echo "   Without port checking, conflicts may occur."
    echo "   Do you want to continue anyway? (y/N)"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
      return 1  # Treat port as "free"
    else
      exit 1
    fi
  fi
}

# Hilfsfunktion: findet freien Port in Range
find_free_port() {
  local range=$1
  local start_port=$(echo $range | cut -d: -f1)
  local end_port=$(echo $range | cut -d: -f2)
  
  for port in $(seq $start_port $end_port); do
    if ! port_in_use "$port"; then
      echo $port
      return 0
    fi
  done
  return 1
}

# Hilfsfunktion: zeigt verfügbare IDEs
show_ides() {
  echo "📋 Verfügbare IDEs:"
  for ide in "${!IDES[@]}"; do
    local range="${PORT_RANGES[$ide]}"
    echo "   $ide (Ports $range)"
  done
}

# Hilfsfunktion: zeigt Hilfe
show_help() {
  echo "🚀 IDE Starter Script"
  echo ""
  echo "Verwendung:"
  echo "  $0 [ide] [slot]"
  echo "  $0 [ide] auto"
  echo "  $0 menu"
  echo ""
  echo "Argumente:"
  echo "  ide    - cursor, vscode"
  echo "  slot   - spezifischer Slot (Zahl)"
  echo "  auto   - automatisch freien Slot finden"
  echo "  menu   - interaktives Menü"
  echo ""
  show_ides
  echo ""
  echo "Beispiele:"
  echo "  $0 cursor        # Cursor mit freiem Port starten"
  echo "  $0 vscode 3      # VSCode auf Slot 3 starten"
  echo "  $0 cursor auto   # Cursor mit automatischem Slot"
}

# Interaktives Menü
show_menu() {
  echo "🎯 IDE Starter - Wähle deine IDE:"
  echo ""
  local i=1
  for ide in "${!IDES[@]}"; do
    local range="${PORT_RANGES[$ide]}"
    echo "  $i) $ide (Ports $range)"
    ((i++))
  done
  echo "  $i) Hilfe"
  echo "  0) Beenden"
  echo ""
  read -p "Wähle eine Option (0-$i): " choice
  
  case $choice in
    0) exit 0 ;;
    $i) show_help; exit 0 ;;
    *) 
      local ides_array=($(echo "${!IDES[@]}" | tr ' ' '\n'))
      if [[ $choice -ge 1 && $choice -le ${#ides_array[@]} ]]; then
        local selected_ide="${ides_array[$((choice-1))]}"
        echo ""
        read -p "Slot für $selected_ide (Zahl oder 'auto'): " slot
        start_ide "$selected_ide" "$slot"
      else
        echo "❌ Ungültige Auswahl"
        exit 1
      fi
      ;;
  esac
}

# IDE starten
start_ide() {
  local ide=$1
  local slot=$2
  
  # Prüfe ob IDE existiert
  if [[ ! -v IDES[$ide] ]]; then
    echo "❌ Unbekannte IDE: $ide"
    show_ides
    exit 1
  fi
  
  local ide_path="${IDES[$ide]}"
  local port_range="${PORT_RANGES[$ide]}"
  
  # Prüfe ob IDE verfügbar ist
  if [[ $ide == "cursor" ]]; then
    if [[ ! -f "$ide_path" ]]; then
      echo "❌ Cursor AppImage nicht gefunden: $ide_path"
      exit 1
    fi
  else
    if ! command -v "$ide_path" &> /dev/null; then
      echo "❌ $ide ist nicht installiert oder nicht im PATH"
      exit 1
    fi
  fi
  
  local port
  local dir
  
  # Port und Verzeichnis bestimmen
  if [[ -z "$slot" ]]; then
    # Automatisch freien Port finden
    port=$(find_free_port "$port_range")
    if [[ -z "$port" ]]; then
      echo "❌ Kein freier Port in Range $port_range verfügbar"
      exit 1
    fi
    dir="$HOME/.pidea/${ide}_${port}"
  elif [[ "$slot" == "auto" ]]; then
    # Automatisch freien Port finden
    port=$(find_free_port "$port_range")
    if [[ -z "$port" ]]; then
      echo "❌ Kein freier Port in Range $port_range verfügbar"
      exit 1
    fi
    dir="$HOME/.pidea/${ide}_${port}"
  elif [[ "$slot" =~ ^[0-9]+$ ]]; then
    # Spezifischer Slot
    local start_port=$(echo $port_range | cut -d: -f1)
    port=$((start_port + slot - 1))
    local end_port=$(echo $port_range | cut -d: -f2)
    
    if [[ $port -gt $end_port ]]; then
      echo "❌ Slot $slot ist außerhalb der verfügbaren Range ($port_range)"
      exit 1
    fi
    
    if port_in_use "$port"; then
      echo "❌ Port $port (Slot $slot) ist bereits belegt"
      exit 1
    fi
    
    dir="$HOME/.pidea/${ide}_${port}"
  else
    echo "❌ Ungültiger Slot: $slot"
    exit 1
  fi
  
  # Verzeichnis erstellen falls nicht vorhanden
  mkdir -p "$dir"
  
  # IDE starten
  echo "🚀 Starte $ide auf Port $port..."
  
  if [[ $ide == "cursor" ]]; then
    $RUNNER "$ide_path" \
      --user-data-dir="$dir" \
      --remote-debugging-port=$port &
  else
    # VSCode mit Remote Debugging starten
    "$ide_path" \
      --user-data-dir="$dir" \
      --remote-debugging-port=$port &
  fi
  
  echo "✅ $ide gestartet auf Port $port"
  echo "   Verzeichnis: $dir"
  echo "   Debug URL: http://localhost:$port"
}

# Hauptlogik
# IDE-Pfade vom Backend laden
load_ide_paths

if [[ "$1" == "menu" ]]; then
  show_menu
elif [[ "$1" == "help" || "$1" == "-h" || "$1" == "--help" ]]; then
  show_help
elif [[ -z "$1" ]]; then
  echo "❌ Keine IDE angegeben"
  echo ""
  show_help
else
  start_ide "$1" "$2"
fi
