#!/bin/bash

# Setup script to make node command automatically load module aliases
# This script creates an alias that replaces the node command

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NODE_WRAPPER="$SCRIPT_DIR/node-wrapper.sh"

echo "🔧 Setting up Node Wrapper with automatic module aliases..."
echo ""

# Check if the wrapper exists
if [ ! -f "$NODE_WRAPPER" ]; then
    echo "❌ Error: Node wrapper not found at $NODE_WRAPPER"
    exit 1
fi

# Get the shell profile file
if [ -n "$ZSH_VERSION" ]; then
    PROFILE_FILE="$HOME/.zshrc"
elif [ -n "$BASH_VERSION" ]; then
    PROFILE_FILE="$HOME/.bashrc"
else
    PROFILE_FILE="$HOME/.profile"
fi

echo "📝 Adding alias to $PROFILE_FILE..."

# Create backup
cp "$PROFILE_FILE" "$PROFILE_FILE.backup.$(date +%Y%m%d_%H%M%S)" 2>/dev/null || true

# Add alias to profile
ALIAS_LINE="alias node='$NODE_WRAPPER'"

# Check if alias already exists
if grep -q "alias node=" "$PROFILE_FILE" 2>/dev/null; then
    echo "⚠️  Warning: Node alias already exists in $PROFILE_FILE"
    echo "   Please remove the existing alias manually and run this script again"
    exit 1
fi

# Add the alias
echo "" >> "$PROFILE_FILE"
echo "# Node wrapper with automatic module aliases" >> "$PROFILE_FILE"
echo "$ALIAS_LINE" >> "$PROFILE_FILE"

echo "✅ Alias added to $PROFILE_FILE"
echo ""
echo "🔄 To activate the alias, run:"
echo "   source $PROFILE_FILE"
echo ""
echo "🧪 Test it with:"
echo "   node backend/scripts/test-playwright.js"
echo ""
echo "📝 To remove the alias later, delete these lines from $PROFILE_FILE:"
echo "   # Node wrapper with automatic module aliases"
echo "   $ALIAS_LINE"
