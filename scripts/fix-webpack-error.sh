#!/bin/bash

echo "🔧 Fixing Next.js Webpack Factory Error..."
echo "=========================================="

# Get the script directory
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
cd "$SCRIPT_DIR"

echo "🧹 Complete webpack cleanup..."
rm -rf .next
rm -rf node_modules/.cache
rm -rf node_modules/.next
find . -name "*.tsbuildinfo" -delete
npm cache clean --force

echo "🔄 Reinstalling critical packages..."
npm uninstall next react react-dom
npm install next@14.2.15 react@18.3.1 react-dom@18.3.1

echo "✅ Webpack fix applied!"
echo ""
echo "Now run: ./start-flowbotz.sh"
echo ""
echo "This fix:"
echo "- Disables problematic webpack chunk splitting"
echo "- Updates to Next.js 14.2.15 (has webpack fixes)"
echo "- Clears all webpack caches"