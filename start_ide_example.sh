#!/usr/bin/env bash

cd "$HOME/Documents" || exit 1

APPIMAGE="./Cursor-1.2.2-x86_64.AppImage"
RUNNER="appimage-run"

# Hilfsfunktion: prüft ob Port frei ist
port_in_use() {
  lsof -i ":$1" &>/dev/null
}

# Standard: Slot 2 (Port 9222)
if [[ -z "$1" ]]; then
  PORT=9222
  DIR="$HOME/.fr4iser2"
  if port_in_use "$PORT"; then
    echo "❌ Port $PORT ist bereits belegt. Bitte schließe die andere Instanz oder nutze einen anderen Slot."
    exit 1
  fi
  $RUNNER "$APPIMAGE" \
    --user-data-dir="$DIR" \
    --remote-debugging-port=$PORT &
  exit 0
fi

# Manueller Slot (Zahl)
if [[ "$1" =~ ^[0-9]+$ ]]; then
  DIR="$HOME/.fr4iser$1"
  PORT=$((9220 + $1))
  if port_in_use "$PORT"; then
    echo "❌ Port $PORT (Slot $1) ist bereits belegt."
    exit 1
  fi
  $RUNNER "$APPIMAGE" \
    --user-data-dir="$DIR" \
    --remote-debugging-port=$PORT &
  exit 0
fi

# Automatisch freien Slot finden
if [[ "$1" == "auto" ]]; then
  for i in {3..30}; do
    DIR="$HOME/.fr4iser$i"
    PORT=$((9220 + i))
    if [[ ! -d "$DIR" ]] && ! port_in_use "$PORT"; then
      $RUNNER "$APPIMAGE" \
        --user-data-dir="$DIR" \
        --remote-debugging-port=$PORT &
      exit 0
    fi
  done
  echo "❌ Keine freien Slots (Ports 9223–9250) gefunden."
  exit 1
fi

# Ungültiger Parameter
echo "❗ Ungültiges Argument:"
echo "   -> Kein Argument: startet Slot 2 (Port 9222)"
echo "   -> <Zahl>: startet entsprechenden Slot"
echo "   -> auto: sucht nächsten freien Slot"
exit 1
