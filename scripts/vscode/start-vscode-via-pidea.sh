#!/bin/bash

# Start VSCode via PIDEA API
# This script uses PIDEA's API to start a VSCode instance

# Configuration
PIDEA_API_URL=${PIDEA_API_URL:-"http://localhost:3000"}
WORKSPACE_PATH=${1:-$(pwd)}

echo "Starting VSCode via PIDEA API..."
echo "PIDEA API: $PIDEA_API_URL"
echo "Workspace: $WORKSPACE_PATH"

# Check if PIDEA is running
if ! curl -s "$PIDEA_API_URL/api/health" > /dev/null; then
    echo "❌ PIDEA is not running on $PIDEA_API_URL"
    echo "Please start PIDEA first: npm start"
    exit 1
fi

# Start VSCode via API
echo "Sending request to start VSCode..."
RESPONSE=$(curl -s -X POST "$PIDEA_API_URL/api/ide/start-vscode" \
    -H "Content-Type: application/json" \
    -d "{\"workspacePath\": \"$WORKSPACE_PATH\"}")

# Parse response
if echo "$RESPONSE" | jq -e '.success' > /dev/null; then
    PORT=$(echo "$RESPONSE" | jq -r '.data.port')
    STATUS=$(echo "$RESPONSE" | jq -r '.data.status')
    IDE_TYPE=$(echo "$RESPONSE" | jq -r '.data.ideType')
    
    echo "✅ VSCode started successfully!"
    echo "Port: $PORT"
    echo "Status: $STATUS"
    echo "IDE Type: $IDE_TYPE"
    echo ""
    echo "🌐 VSCode URL: http://127.0.0.1:$PORT"
    echo "📁 Workspace: $WORKSPACE_PATH"
    echo ""
    echo "VSCode should be automatically detected by PIDEA."
else
    ERROR=$(echo "$RESPONSE" | jq -r '.error // "Unknown error"')
    echo "❌ Failed to start VSCode: $ERROR"
    echo "Response: $RESPONSE"
    exit 1
fi 