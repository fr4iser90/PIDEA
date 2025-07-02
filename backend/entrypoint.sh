#!/bin/sh
# Node.js entrypoint.sh

# Exit on error
set -e

echo "Starting Cursor Chat Agent Backend..."

# Wait for database to be ready (if using external database)
if [ -n "$DATABASE_URL" ]; then
    echo "Waiting for database to be ready..."
    # You can add database connection check here
    # Example: node -e "require('./src/infrastructure/database/DatabaseConnection').waitForConnection()"
fi

# Run database migrations (if auto-migration is enabled)
if [ "$AUTO_MIGRATE" = "true" ]; then
    echo "Running database migrations..."
    # node scripts/migrate.js
fi

# Create default admin user (if auto-setup is enabled)
if [ "$AUTO_SETUP" = "true" ]; then
    echo "Setting up default admin user..."
    # node scripts/setup-admin.js
fi

echo "Starting Node.js server..."

# Execute the original CMD (Node.js server)
exec "$@" 