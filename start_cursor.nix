{ config, lib, pkgs, ... }:

let
  ideStarterScript = pkgs.writeShellScriptBin "start-ide-example" ''
    #!/usr/bin/env bash
    set -euxo pipefail

    cd "$HOME/Documents" || exit 1

    declare -A IDES

    # Cursor version profiles
    declare -A CURSOR_VERSIONS=(
      ["1"]="Cursor-1.5.7-x86_64.AppImage"
      ["2"]="Cursor-1.6.46-x86_64.AppImage"
      ["3"]="Cursor-1.7.17-x86_64.AppImage"
      ["4"]="Cursor-2.0.34-x86_64.AppImage"
      ["5"]="Cursor-2.3.34-x86_64.AppImage"
      ["6"]="Cursor-2.6.19-x86_64.AppImage"
    )

    DEFAULT_CURSOR_VERSION="6"
    
    RUNNER="${pkgs.appimage-run}/bin/appimage-run"
    SOCAT="${pkgs.socat}/bin/socat"

    declare -A PORT_RANGES=(
      ["cursor"]="9222:9232"
      ["vscode"]="9233:9242"
    )

    # Wie start_ide_example.sh: Endport = PIDEA/CDP; IDE nur intern (Endport + OFFSET)
    DEVTOOLS_INTERNAL_OFFSET=10000

    load_ide_paths() {
      echo "[INFO] Lade IDE-Pfade vom Backend..."
      local response
      response=$(curl -s http://localhost:3000/api/ide/configurations/executable-paths 2>/dev/null || true)

      if [[ -n "$response" ]]; then
        local cursor_path
        local vscode_path
        cursor_path=$(echo "$response" | jq -r '.data.cursor // empty' 2>/dev/null || true)
        vscode_path=$(echo "$response" | jq -r '.data.vscode // empty' 2>/dev/null || true)

        if [[ -n "$cursor_path" ]]; then
          IDES["cursor"]="$cursor_path"
        fi

        if [[ -n "$vscode_path" ]]; then
          IDES["vscode"]="$vscode_path"
        fi

        echo "[OK] IDE-Pfade geladen"
      else
        echo "[WARN] Backend nicht erreichbar"
      fi
    }

    port_in_use() {
      local port="$1"

      if command -v ss >/dev/null 2>&1; then
        ss -tuln | grep -q ":$port "
        return $?
      elif command -v netstat >/dev/null 2>&1; then
        netstat -tuln | grep -q ":$port "
        return $?
      elif command -v lsof >/dev/null 2>&1; then
        lsof -i ":$port" >/dev/null 2>&1
        return $?
      else
        echo "[ERR] No port check tool available!"
        return 0
      fi
    }

    relay_ports_free() {
      local pub="$1"
      local int=$((pub + DEVTOOLS_INTERNAL_OFFSET))
      if port_in_use "$pub"; then return 1; fi
      if port_in_use "$int"; then return 1; fi
      return 0
    }

    find_free_port() {
      local range="$1"
      local start_port
      local end_port
      start_port="$(echo "$range" | cut -d: -f1)"
      end_port="$(echo "$range" | cut -d: -f2)"

      for port in $(seq "$start_port" "$end_port"); do
        if [[ -x "$SOCAT" ]]; then
          if relay_ports_free "$port"; then
            echo "$port"
            return 0
          fi
        else
          if ! port_in_use "$port"; then
            echo "$port"
            return 0
          fi
        fi
      done
      return 1
    }

    show_ides() {
      echo "Verfuegbare IDEs:"
      for ide in "''${!PORT_RANGES[@]}"; do
        echo "   $ide (Ports ''${PORT_RANGES[$ide]})"
      done
    }

    show_cursor_versions() {
      echo "Verfuegbare Cursor-Versionen:"
      for version in "''${!CURSOR_VERSIONS[@]}"; do
        local file="''${CURSOR_VERSIONS[$version]}"
        local status="❌"
        [[ -f "$file" ]] && status="✅"
        if [[ "$version" == "$DEFAULT_CURSOR_VERSION" ]]; then
          echo "   $version) $file $status (Default)"
        else
          echo "   $version) $file $status"
        fi
      done
    }

    get_cursor_path() {
      local version_profile="''${1:-$DEFAULT_CURSOR_VERSION}"
      if [[ -v CURSOR_VERSIONS[$version_profile] ]]; then
        echo "''${CURSOR_VERSIONS[$version_profile]}"
      else
        echo "[ERR] Unbekanntes Version-Profile: $version_profile"
        show_cursor_versions
        return 1
      fi
    }

    start_ide() {
      local ide="$1"
      local slot="''${2:-}"
      local version_profile="''${3:-}"

      local ide_path
      if [[ "$ide" == "cursor" ]]; then
        ide_path="$(get_cursor_path "$version_profile")" || exit 1
      else
        if [[ ! -v IDES[$ide] ]]; then
          echo "[ERR] Unbekannte IDE: $ide"
          show_ides
          exit 1
        fi
        ide_path="''${IDES[$ide]}"
      fi

      local port_range="''${PORT_RANGES[$ide]}"
      local port
      local dir

      if [[ -z "$slot" || "$slot" == "auto" ]]; then
        port="$(find_free_port "$port_range")" || {
          echo "[ERR] Kein freier Port in Range $port_range verfuegbar"
          exit 1
        }
      elif [[ "$slot" =~ ^[0-9]+$ ]]; then
        local start_port
        local end_port
        start_port="$(echo "$port_range" | cut -d: -f1)"
        end_port="$(echo "$port_range" | cut -d: -f2)"
        port=$((start_port + slot - 1))
        if (( port > end_port )); then
          echo "[ERR] Slot $slot ist ausserhalb der verfuegbaren Range ($port_range)"
          exit 1
        fi
        if [[ -x "$SOCAT" ]]; then
          if ! relay_ports_free "$port"; then
            echo "[ERR] Endport $port oder intern $((port + DEVTOOLS_INTERNAL_OFFSET)) (Slot $slot) ist belegt"
            exit 1
          fi
        else
          if port_in_use "$port"; then
            echo "[ERR] Port $port (Slot $slot) ist bereits belegt"
            exit 1
          fi
        fi
      else
        echo "[ERR] Ungueltiger Slot: $slot"
        exit 1
      fi

      dir="$HOME/.pidea/''${ide}_''${port}"
      mkdir -p "$dir"

      local internal_port=$((port + DEVTOOLS_INTERNAL_OFFSET))

      if [[ "$ide" == "cursor" ]]; then
        local profile_display="''${version_profile:-$DEFAULT_CURSOR_VERSION}"
        echo "[INFO] Starte $ide (Version-Profile $profile_display) — Endport/CDP $port, intern $internal_port..."
        echo "   Datei: $ide_path"
      else
        echo "[INFO] Starte $ide — Endport/CDP $port, intern $internal_port..."
      fi

      if [[ -x "$SOCAT" ]]; then
        if port_in_use "$port"; then
          echo "[ERR] Endport $port ist belegt — kein socat moeglich"
          exit 1
        fi
        "$SOCAT" TCP-LISTEN:"$port",fork,bind=0.0.0.0,reuseaddr TCP:127.0.0.1:"$internal_port" &
        local socat_pid=$!
        echo "   socat: 0.0.0.0:$port -> 127.0.0.1:$internal_port"
        if [[ "$ide" == "cursor" ]]; then
          "$RUNNER" "$ide_path" --user-data-dir="$dir" --remote-debugging-port="$internal_port" &
        else
          "$ide_path" --user-data-dir="$dir" --remote-debugging-port="$internal_port" &
        fi
        (
          set +x 2>/dev/null || true
          w=0
          while ! port_in_use "$internal_port" && [[ $w -lt 120 ]]; do sleep 1; w=$((w + 1)); done
          while port_in_use "$internal_port"; do sleep 1; done
          kill "$socat_pid" 2>/dev/null
        ) &
        echo "   [INFO] socat endet wenn DevTools auf $internal_port beendet wird"
      else
        echo "[WARN] socat nicht im PATH — IDE direkt auf Endport $port"
        if [[ "$ide" == "cursor" ]]; then
          "$RUNNER" "$ide_path" --user-data-dir="$dir" --remote-debugging-port="$port" &
        else
          "$ide_path" --user-data-dir="$dir" --remote-debugging-port="$port" &
        fi
      fi

      echo "[OK] $ide gestartet"
      echo "   Verzeichnis: $dir"
      echo "   PIDEA/CDP: http://127.0.0.1:$port (Endport $port)"
    }

    parse_arguments() {
      local ide=""
      local slot=""
      local version_profile=""

      for arg in "$@"; do
        case "$arg" in
          -v[0-9]*)
            version_profile="''${arg#-v}"
            ;;
          --version-profile=*)
            version_profile="''${arg#--version-profile=}"
            ;;
          auto|[0-9]*)
            [[ -z "$slot" ]] && slot="$arg"
            ;;
          cursor|vscode)
            [[ -z "$ide" ]] && ide="$arg"
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

    load_ide_paths

    if [[ $# -eq 0 ]]; then
      echo "[ERR] Keine IDE angegeben"
      exit 1
    fi

    parsed="$(parse_arguments "$@")"
    IFS='|' read -r ide slot version_profile <<< "$parsed"
    if [[ -z "$ide" ]]; then
      echo "[ERR] Keine IDE angegeben"
      exit 1
    fi

    start_ide "$ide" "$slot" "$version_profile"
  '';
in
{
  environment.systemPackages = with pkgs; [
    curl
    jq
    iproute2
    nettools
    lsof
    appimage-run
    ideStarterScript
    xorg.libX11
    xorg.libxkbfile
    xorg.libxcb
    xorg.libXext
    xorg.libXtst
    libxkbcommon
    socat
  ];
}
