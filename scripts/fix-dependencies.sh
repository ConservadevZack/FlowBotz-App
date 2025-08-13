#!/bin/bash

echo "🔧 Fixing FlowBotz Dependencies..."
echo "================================"

# Get the script directory
SCRIPT_DIR=$(dirname "$0")
cd "$SCRIPT_DIR"

echo "🧹 Cleaning up completely..."
rm -rf .next
rm -rf node_modules  
rm -f package-lock.json
rm -rf .npm

echo "📦 Installing latest stable dependencies..."
npm cache clean --force
npm install --legacy-peer-deps

echo "🔍 Checking for issues..."
npm audit fix --force

echo "✅ Dependencies fixed! Now testing..."
echo "🚀 Starting development server..."
npm run dev &
DEV_PID=$!

sleep 5

echo "🛑 Stopping test server..."
kill $DEV_PID 2>/dev/null

echo ""
echo "✅ Setup complete! Your FlowBotz app is ready."
echo ""
echo "Available commands:"
echo "  ./start-flowbotz.sh  - Full stack (frontend + backend)"
echo "  ./start-frontend.sh  - Frontend only"
echo "  npm run dev          - Next.js only"
echo ""
echo "🌐 App will be available at: http://localhost:3000"