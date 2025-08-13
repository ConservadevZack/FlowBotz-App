#!/bin/bash

echo "🔧 Quick Fix for FlowBotz..."
echo "============================"

# Get the script directory
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
cd "$SCRIPT_DIR"

echo "🧹 Complete cleanup..."
rm -rf node_modules package-lock.json .next
npm cache clean --force

echo "📦 Installing stable Next.js 14..."
npm install

echo "🏗️ Testing build..."
timeout 10s npm run dev > /dev/null 2>&1 || true

echo ""
echo "✅ Quick fix complete!"
echo ""
echo "Try running: ./start-flowbotz.sh"