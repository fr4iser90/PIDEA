# Dev shell: run from repo root — `nix-shell shell2.nix`
# VNC (headless GUI): `start-pidea-vnc` → `export DISPLAY=:1` → `start-ide-example cursor`
# Uses Xvnc directly (avoids vncserver’s system Xsession). Logs: ~/.vnc/Xvnc-<n>.log
# Stop: `stop-pidea-vnc`. First time: `pidea-vnc-passwd` (or `vncpasswd ~/.vnc/passwd`).
# TigerVNC’s default without a path is ~/.config/tigervnc/passwd — we use ~/.vnc/passwd for Xvnc.
# Remote: `ssh -L 5901:localhost:5901 user@host`
# From a flake, wire `devShells.<system>.default = import ./shell2.nix { inherit pkgs; };`
{ pkgs ? import <nixpkgs> { } }:

let
  inherit (pkgs) lib;

  runtimeLibs = with pkgs; [
    xorg.libX11
    xorg.libxkbfile
    xorg.libxcb
    xorg.libXext
    xorg.libXtst
    libxkbcommon
  ];

  # TigerVNC 1.15+ defaults to $XDG_CONFIG_HOME/tigervnc/passwd; Xvnc here uses ~/.vnc/passwd only.
  vncPasswdScript = pkgs.writeShellScriptBin "pidea-vnc-passwd" ''
    set -euo pipefail
    vnc_dir="$HOME/.vnc"
    mkdir -p "$vnc_dir"
    chmod 700 "$vnc_dir"
    exec ${pkgs.tigervnc}/bin/vncpasswd "$vnc_dir/passwd"
  '';

  vncStartScript = pkgs.writeShellScriptBin "start-pidea-vnc" ''
    set -euo pipefail
    display_num="''${1:-1}"
    geometry="''${VNC_GEOMETRY:-1920x1080}"
    depth="''${VNC_DEPTH:-24}"
    pidfile="$HOME/.vnc/pidea-xvnc-$display_num.pid"
    logfile="$HOME/.vnc/Xvnc-$display_num.log"

    if [[ "$display_num" == "-h" || "$display_num" == "--help" ]]; then
      echo "Usage: start-pidea-vnc [display-number]"
      echo "  Starts Xvnc on :<n> (default 1). RFB port = 5900 + n."
      echo "  Requires ~/.vnc/passwd — run: pidea-vnc-passwd  (or: vncpasswd ~/.vnc/passwd)"
      echo "  Then: export DISPLAY=:<n> && start-ide-example cursor"
      echo "  Env: VNC_GEOMETRY (default 1920x1080), VNC_DEPTH (default 24)"
      echo "  Logs: ~/.vnc/Xvnc-<n>.log — Stop: stop-pidea-vnc [<n>]"
      exit 0
    fi

    vnc_dir="$HOME/.vnc"
    if [[ -e "$vnc_dir" && ! -d "$vnc_dir" ]]; then
      echo "[ERR] $vnc_dir must be a directory but is not (often it was created as a file)." >&2
      echo "    TigerVNC then fails with: Could not create VNC config directory: File exists" >&2
      echo "    Fix: mv \"$vnc_dir\" \"''${vnc_dir}.bak\" && mkdir -p \"$vnc_dir\" && pidea-vnc-passwd" >&2
      exit 1
    fi
    mkdir -p "$vnc_dir"
    if [[ ! -w "$vnc_dir" ]]; then
      echo "[ERR] $vnc_dir is not writable — check permissions (need chmod u+w or correct owner)" >&2
      exit 1
    fi
    if [[ ! -f "$vnc_dir/passwd" ]]; then
      echo "[ERR] Missing $vnc_dir/passwd — run: pidea-vnc-passwd" >&2
      echo "    (Plain vncpasswd uses ~/.config/tigervnc/passwd; this shell expects ~/.vnc/passwd.)" >&2
      exit 1
    fi

    if [[ -f "$pidfile" ]] && kill -0 "$(cat "$pidfile")" 2>/dev/null; then
      echo "[ERR] Display :$display_num already running (PID $(cat "$pidfile")). Stop: stop-pidea-vnc $display_num" >&2
      exit 1
    fi

    # Direct Xvnc — vncserver’s wrapper expects /etc/X11/Xsession (missing in nix-shell).
    # -ac: allow local clients (e.g. fluxbox) without separate xauth cookie setup.
    ${pkgs.tigervnc}/bin/Xvnc ":$display_num" \
      -ac \
      -geometry "$geometry" \
      -depth "$depth" \
      -PasswordFile "$HOME/.vnc/passwd" \
      -SecurityTypes VncAuth \
      >>"$logfile" 2>&1 &
    echo $! >"$pidfile"

    for _ in $(seq 1 100); do
      if [[ -S "/tmp/.X11-unix/X$display_num" ]]; then
        break
      fi
      sleep 0.05
    done
    if [[ ! -S "/tmp/.X11-unix/X$display_num" ]]; then
      echo "[ERR] Xvnc did not open /tmp/.X11-unix/X$display_num — see $logfile" >&2
      if kill -0 "$(cat "$pidfile")" 2>/dev/null; then kill "$(cat "$pidfile")" || true; fi
      rm -f "$pidfile"
      exit 1
    fi

    DISPLAY=":$display_num" ${pkgs.fluxbox}/bin/fluxbox >>"$HOME/.vnc/fluxbox-$display_num.log" 2>&1 &
    disown 2>/dev/null || true

    echo "[OK] VNC display :$display_num — RFB port $((5900 + display_num))"
    echo "     Log: $logfile"
    echo "     In this shell: export DISPLAY=:$display_num"
    echo "     Then: start-ide-example cursor"
  '';

  vncStopScript = pkgs.writeShellScriptBin "stop-pidea-vnc" ''
    set -euo pipefail
    display_num="''${1:-1}"
    pidfile="$HOME/.vnc/pidea-xvnc-$display_num.pid"

    if [[ "$display_num" == "-h" || "$display_num" == "--help" ]]; then
      echo "Usage: stop-pidea-vnc [display-number]"
      exit 0
    fi

    if [[ -f "$pidfile" ]]; then
      pid=$(cat "$pidfile")
      if kill -0 "$pid" 2>/dev/null; then
        kill "$pid" || true
      fi
      rm -f "$pidfile"
      echo "[OK] Stopped Xvnc on :$display_num (PID was $pid)"
    else
      echo "[WARN] No pidfile $pidfile — nothing to stop (or session was not started by start-pidea-vnc)" >&2
    fi
  '';

  ideStarterScript = pkgs.writeShellScriptBin "start-ide-example" ''
    set -euo pipefail

    cd "$HOME/test" || exit 1

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

    # Default profile = highest numeric key (latest). Add e.g. ["7"]=... and default moves to 7.
    _cursor_profile_latest() {
      local max=0
      local k
      for k in "''${!CURSOR_VERSIONS[@]}"; do
        [[ "$k" =~ ^[0-9]+$ ]] || continue
        (( 10#$k > max )) && max=$((10#$k))
      done
      if (( max == 0 )); then
        echo "[ERR] CURSOR_VERSIONS: no numeric profile keys" >&2
        return 1
      fi
      echo "$max"
    }

    DEFAULT_CURSOR_VERSION="$(_cursor_profile_latest)"
    RUNNER="${pkgs.appimage-run}/bin/appimage-run"

    declare -A PORT_RANGES=(
      ["cursor"]="9222:9232"
      ["vscode"]="9233:9242"
    )

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

    find_free_port() {
      local range="$1"
      local start_port
      local end_port
      start_port="$(echo "$range" | cut -d: -f1)"
      end_port="$(echo "$range" | cut -d: -f2)"

      for port in $(seq "$start_port" "$end_port"); do
        if ! port_in_use "$port"; then
          echo "$port"
          return 0
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
      for version in $(printf '%s\n' "''${!CURSOR_VERSIONS[@]}" | sort -n); do
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
        if port_in_use "$port"; then
          echo "[ERR] Port $port (Slot $slot) ist bereits belegt"
          exit 1
        fi
      else
        echo "[ERR] Ungueltiger Slot: $slot"
        exit 1
      fi

      dir="$HOME/.pidea/''${ide}_''${port}"
      mkdir -p "$dir"

      if [[ "$ide" == "cursor" ]]; then
        local profile_display="''${version_profile:-$DEFAULT_CURSOR_VERSION}"
        echo "[INFO] Starte $ide (Version-Profile $profile_display) auf Port $port..."
        echo "   Datei: $ide_path"
        "$RUNNER" "$ide_path" --user-data-dir="$dir" --remote-debugging-port="$port" &
      else
        echo "[INFO] Starte $ide auf Port $port..."
        "$ide_path" --user-data-dir="$dir" --remote-debugging-port="$port" &
      fi

      echo "[OK] $ide gestartet auf Port $port"
      echo "   Verzeichnis: $dir"
      echo "   Debug URL: http://localhost:$port"
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
pkgs.mkShell {
  packages = with pkgs; [
    socat
    curl
    jq
    iproute2
    nettools
    lsof
    appimage-run
    tigervnc
    fluxbox
    vncPasswdScript
    vncStartScript
    vncStopScript
    ideStarterScript
  ];

  shellHook = ''
    export LD_LIBRARY_PATH=${lib.makeLibraryPath runtimeLibs}:''$LD_LIBRARY_PATH
    echo "IDE helper: start-ide-example | VNC: pidea-vnc-passwd → start-pidea-vnc → export DISPLAY=:1 → …"
  '';
}
