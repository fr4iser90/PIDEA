#!/usr/bin/env bash

cd "$HOME/Documents" || exit 1

# IDE Konfigurationen - werden vom Backend geladen
declare -A IDES

# Version-Profile-Konfiguration für Cursor
declare -A CURSOR_VERSIONS=(
  ["1"]="Cursor-1.5.7-x86_64.AppImage"    # Default
  ["2"]="Cursor-1.6.46-x86_64.AppImage"   
  ["3"]="Cursor-1.7.17-x86_64.AppImage"   
)

# Default Version-Profile (kann geändert werden)
DEFAULT_CURSOR_VERSION="1"

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
    if [[ $ide == "cursor" ]]; then
      echo "   $ide (Ports $range) - Version-Profile verfügbar"
    else
      echo "   $ide (Ports $range)"
    fi
  done
}

# Hilfsfunktion: zeigt verfügbare Cursor-Versionen
show_cursor_versions() {
  echo "📋 Verfügbare Cursor-Versionen:"
  for version in "${!CURSOR_VERSIONS[@]}"; do
    local file="${CURSOR_VERSIONS[$version]}"
    local status=""
    if [[ -f "$file" ]]; then
      status="✅"
    else
      status="❌"
    fi
    if [[ "$version" == "$DEFAULT_CURSOR_VERSION" ]]; then
      echo "   $version) $file $status (Default)"
    else
      echo "   $version) $file $status"
    fi
  done
}

# Hilfsfunktion: bestimmt Cursor-Pfad basierend auf Version-Profile
get_cursor_path() {
  local version_profile=$1
  
  if [[ -z "$version_profile" ]]; then
    version_profile="$DEFAULT_CURSOR_VERSION"
  fi
  
  if [[ -v CURSOR_VERSIONS[$version_profile] ]]; then
    echo "${CURSOR_VERSIONS[$version_profile]}"
  else
    echo "❌ Unbekanntes Version-Profile: $version_profile"
    show_cursor_versions
    return 1
  fi
}

# Hilfsfunktion: zeigt Hilfe
show_help() {
  echo "🚀 IDE Starter Script - Explanation"
  echo ""
  echo "📖 WHAT IS WHAT?"
  echo "  IDE        = Integrated Development Environment (Editor)"
  echo "  Slot       = Port number for Remote Debugging (9222-9242)"
  echo "  Version    = Different Cursor versions (1.5.7, 1.6.46, 1.7.17)"
  echo "  Profile    = Numbered versions for easy selection"
  echo ""
  echo "🎯 USAGE:"
  echo "  $0 [ide] [slot] [version-options]"
  echo "  $0 [ide] auto [version-options]"
  echo "  $0 menu"
  echo ""
  echo "📋 ARGUMENTS:"
  echo "  ide        - Which IDE to start? (cursor, vscode)"
  echo "  slot       - Which port? (1-11 for Cursor, 1-10 for VSCode)"
  echo "  auto       - Automatically find free port"
  echo "  menu       - Interactive menu with selection"
  echo ""
  echo "🔧 VERSION OPTIONS (Cursor only):"
  echo "  -v[N]              # Short: Use version profile N"
  echo "  --version-profile=N # Long: Use version profile N"
  echo ""
  show_ides
  echo ""
  show_cursor_versions
  echo ""
  echo "💡 EXAMPLES WITH EXPLANATION:"
  echo "  $0 cursor                    # Cursor with standard version (1.5.7)"
  echo "  $0 cursor auto -v2          # Cursor version 1.6.46, free port"
  echo "  $0 cursor 3 --version-profile=3 # Cursor version 1.7.17 on port 9224"
  echo "  $0 vscode 3                 # VSCode on port 9235"
  echo ""
  echo "🔍 PORT RANGES:"
  echo "  Cursor:  9222-9232 (Slots 1-11)"
  echo "  VSCode:  9233-9242 (Slots 1-10)"
  echo ""
  echo "📁 DIRECTORIES:"
  echo "  Each IDE instance gets its own directory:"
  echo "  ~/.pidea/cursor_9222/  (Cursor on port 9222)"
  echo "  ~/.pidea/vscode_9233/ (VSCode on port 9233)"
}

# Interaktives Menü
show_menu() {
  echo "🎯 IDE Starter - Wähle deine IDE:"
  echo ""
  local i=1
  for ide in "${!IDES[@]}"; do
    local range="${PORT_RANGES[$ide]}"
    if [[ $ide == "cursor" ]]; then
      echo "  $i) $ide (Ports $range) - Version-Profile verfügbar"
    else
      echo "  $i) $ide (Ports $range)"
    fi
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
        
        # Version-Auswahl für Cursor
        local version_profile=""
        if [[ $selected_ide == "cursor" ]]; then
          echo ""
          show_cursor_versions
          echo ""
          read -p "Version-Profile für Cursor (Enter für Default $DEFAULT_CURSOR_VERSION): " version_input
          if [[ -n "$version_input" ]]; then
            version_profile="$version_input"
          fi
        fi
        
        start_ide "$selected_ide" "$slot" "$version_profile"
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
  local version_profile=$3
  
  # Prüfe ob IDE existiert
  if [[ ! -v IDES[$ide] ]]; then
    echo "❌ Unbekannte IDE: $ide"
    show_ides
    exit 1
  fi
  
  # Bestimme IDE-Pfad
  local ide_path
  if [[ $ide == "cursor" ]]; then
    # Für Cursor: Version-Profile verwenden
    ide_path=$(get_cursor_path "$version_profile")
    if [[ $? -ne 0 ]]; then
      exit 1
    fi
  else
    # Für andere IDEs: Standard-Pfad
    ide_path="${IDES[$ide]}"
  fi
  
  local port_range="${PORT_RANGES[$ide]}"
  
  # Prüfe ob IDE verfügbar ist
  if [[ $ide == "cursor" ]]; then
    if [[ ! -f "$ide_path" ]]; then
      echo "❌ Cursor AppImage nicht gefunden: $ide_path"
      echo "   Verfügbare Versionen:"
      show_cursor_versions
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
  if [[ $ide == "cursor" ]]; then
    local version_info=""
    if [[ -n "$version_profile" ]]; then
      version_info=" (Version-Profile $version_profile)"
    else
      version_info=" (Version-Profile $DEFAULT_CURSOR_VERSION - Default)"
    fi
    echo "🚀 Starte $ide$version_info auf Port $port..."
    echo "   Datei: $ide_path"
  else
    echo "🚀 Starte $ide auf Port $port..."
  fi
  
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

# Hilfsfunktion: parst Kommandozeilen-Argumente
parse_arguments() {
  local ide=""
  local slot=""
  local version_profile=""
  
  # Alle Argumente durchgehen
  for arg in "$@"; do
    case $arg in
      -v[0-9]*)
        version_profile="${arg#-v}"
        ;;
      --version-profile=*)
        version_profile="${arg#--version-profile=}"
        ;;
      menu|help|-h|--help)
        echo "$arg"
        return
        ;;
      auto|[0-9]*)
        if [[ -z "$slot" ]]; then
          slot="$arg"
        fi
        ;;
      cursor|vscode)
        if [[ -z "$ide" ]]; then
          ide="$arg"
        fi
        ;;
      *)
        if [[ -z "$ide" ]]; then
          ide="$arg"
        elif [[ -z "$slot" ]]; then
          slot="$arg"
        fi
        ;;
    esac
  done
  
  echo "$ide|$slot|$version_profile"
}

# Hauptlogik
# IDE-Pfade vom Backend laden
load_ide_paths

# Argumente parsen
if [[ $# -eq 0 ]]; then
  echo "❌ Keine IDE angegeben"
  echo ""
  show_help
  exit 1
fi

# Spezielle Befehle
if [[ "$1" == "menu" ]]; then
  show_menu
  exit 0
elif [[ "$1" == "help" || "$1" == "-h" || "$1" == "--help" ]]; then
  show_help
  exit 0
fi

# Argumente parsen
parsed=$(parse_arguments "$@")
if [[ $? -ne 0 ]]; then
  echo "❌ Fehler beim Parsen der Argumente"
  exit 1
fi

# Parsed Werte extrahieren
IFS='|' read -r ide slot version_profile <<< "$parsed"

if [[ -z "$ide" ]]; then
  echo "❌ Keine IDE angegeben"
  echo ""
  show_help
  exit 1
fi

# IDE starten
start_ide "$ide" "$slot" "$version_profile"
