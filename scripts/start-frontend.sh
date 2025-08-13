#!/bin/bash

# FlowBotz Frontend Only Startup Script
echo "🎨 Starting FlowBotz Frontend..."
echo "================================"

# Get the script directory and go to project root
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
ROOT_DIR=$(dirname "$SCRIPT_DIR")

# Go to frontend directory
cd "$ROOT_DIR/frontend"

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "⚠️  No .env.local found. Please copy your environment variables."
    echo "The backend may not work without proper API keys."
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install
fi

echo "🌐 Frontend starting on http://localhost:3000"
npm run dev
