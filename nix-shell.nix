{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  buildInputs = with pkgs; [
    # Nur Chromium für Playwright
    chromium
  ];
  
  shellHook = ''
    echo "🚀 Playwright-Shell mit Environment-Variablen bereit!"
    
    # Setze Node-Wrapper für Module-Aliase
    alias node='$(pwd)/scripts/node-replacement'
    
    # Setze NixOS Environment-Variablen (wie in Cursor AppImage)
    export NIX_PROFILES="/run/current-system/sw /nix/var/nix/profiles/default"
    export NIX_PATH="nixpkgs=flake:nixpkgs"
    export NIX_LDFLAGS="-L/usr/lib -L/usr/lib32"
    export LD_LIBRARY_PATH="/usr/lib:/usr/lib32:$LD_LIBRARY_PATH"
    export NIX_LD="/usr/bin/ld"
    export NIX_LD_LIBRARY_PATH="/usr/lib:/usr/lib32"
    
    echo "🔧 Environment-Variablen gesetzt für NixOS Kompatibilität"
    echo "🌐 Chromium: $(chromium --version 2>/dev/null || echo 'verfügbar')"
    echo ""
    echo "💡 Jetzt sollte Playwright funktionieren!"
  '';
}