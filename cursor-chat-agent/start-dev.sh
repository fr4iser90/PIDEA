#!/bin/bash

echo "🚀 Starting Cursor Chat Agent Development Environment..."

# Always install dependencies to ensure everything is up to date
echo "📦 Installing dependencies..."
npm install

# Start the full development environment
echo "🔥 Starting hot reload development server..."
npm run dev:full 