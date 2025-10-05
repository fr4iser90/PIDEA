#!/bin/bash

# Node Wrapper with automatic module alias loading
# This script replaces the node command and automatically loads module aliases

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NODE_REPLACEMENT="$SCRIPT_DIR/node-replacement"

# Check if the node replacement exists
if [ ! -f "$NODE_REPLACEMENT" ]; then
    echo "❌ Error: Node replacement script not found at $NODE_REPLACEMENT"
    exit 1
fi

# Execute the node replacement with all arguments
exec "$NODE_REPLACEMENT" "$@"
