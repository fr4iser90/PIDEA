#!/bin/sh
# Node.js entrypoint.sh

# Exit on error
set -e

echo "🚀 Starting PIDEA Backend Entrypoint..."

# Debug: Show current directory and files
echo "📁 Current directory: $(pwd)"
echo "📄 Files in current directory:"
ls -la

# Debug: Check if script exists
if [ -f "scripts/create-default-user.js" ]; then
    echo "✅ create-default-user.js found"
else
    echo "❌ create-default-user.js NOT found"
    echo "📄 Files in scripts directory:"
    ls -la scripts/ || echo "scripts directory not found"
fi

# Default user anlegen und auf Erfolg warten
echo "👤 Creating default user..."
MAX_RETRIES=5
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    echo "🔄 Attempt $((RETRY_COUNT + 1)) of $MAX_RETRIES"
    
    # Führe das Skript aus und speichere Exit-Code
    if node scripts/create-default-user.js; then
        echo "✅ Default user created successfully!"
        break
    else
        echo "❌ Failed to create user, retrying in 5 seconds..."
        RETRY_COUNT=$((RETRY_COUNT + 1))
        sleep 5
    fi
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo "💥 Failed to create default user after $MAX_RETRIES attempts"
    echo "💥 Server cannot start without default user"
    exit 1
fi

# Backend starten
echo "🚀 Starting backend server..."
exec node server.js 