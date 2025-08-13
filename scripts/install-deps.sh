#!/bin/bash

echo "🔧 Installing FlowBotz Dependencies..."
echo "====================================="

# Get the script directory and navigate to it
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
cd "$SCRIPT_DIR"

echo "📍 Working in: $SCRIPT_DIR"

echo "🧹 Cleaning previous installations..."
rm -rf node_modules package-lock.json .next

echo "📦 Installing dependencies..."
npm install

echo "✅ Installation complete!"
echo ""
echo "You can now run:"
echo "  ./start-flowbotz.sh  - Full stack"
echo "  npm run dev          - Frontend only"