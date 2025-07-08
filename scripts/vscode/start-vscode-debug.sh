#!/bin/bash

# VSCode Debug Startup Script for PIDEA Integration
# This script starts VSCode with the necessary flags for remote debugging

# Configuration
VSCODE_PORT=${1:-9232}
WORKSPACE_PATH=${2:-$(pwd)}
VSCODE_EXECUTABLE=${VSCODE_EXECUTABLE:-"code"}

echo "Starting VSCode with remote debugging for PIDEA integration..."
echo "Port: $VSCODE_PORT"
echo "Workspace: $WORKSPACE_PATH"
echo "Executable: $VSCODE_EXECUTABLE"

# Check if VSCode is installed
if ! command -v $VSCODE_EXECUTABLE &> /dev/null; then
    echo "Error: VSCode executable '$VSCODE_EXECUTABLE' not found"
    echo "Please install VSCode or set VSCODE_EXECUTABLE environment variable"
    exit 1
fi

# Check if workspace path exists
if [ ! -d "$WORKSPACE_PATH" ]; then
    echo "Error: Workspace path '$WORKSPACE_PATH' does not exist"
    exit 1
fi

# Kill any existing VSCode instances on the port
echo "Checking for existing VSCode instances on port $VSCODE_PORT..."
lsof -ti:$VSCODE_PORT | xargs kill -9 2>/dev/null || true

# Start VSCode with debugging flags
echo "Starting VSCode..."
$VSCODE_EXECUTABLE \
    --remote-debugging-port=$VSCODE_PORT \
    --disable-web-security \
    --disable-features=VizDisplayCompositor \
    --no-sandbox \
    --disable-gpu \
    --disable-dev-shm-usage \
    --disable-background-timer-throttling \
    --disable-backgrounding-occluded-windows \
    --disable-renderer-backgrounding \
    --disable-field-trial-config \
    --disable-ipc-flooding-protection \
    "$WORKSPACE_PATH" &

# Wait a moment for VSCode to start
sleep 3

# Check if VSCode started successfully
if curl -s http://127.0.0.1:$VSCODE_PORT/json/version > /dev/null; then
    echo "✅ VSCode started successfully on port $VSCODE_PORT"
    echo "🌐 Debug URL: http://127.0.0.1:$VSCODE_PORT"
    echo "📁 Workspace: $WORKSPACE_PATH"
    echo ""
    echo "PIDEA should now detect this VSCode instance automatically."
    echo "Test with: curl http://localhost:3000/api/ide/available"
else
    echo "❌ Failed to start VSCode on port $VSCODE_PORT"
    echo "Check if the port is available and VSCode is properly installed"
    exit 1
fi

# Keep the script running to maintain the VSCode process
echo "VSCode is running. Press Ctrl+C to stop..."
wait 