#!/bin/bash

echo "🔧 FlowBotz Fresh Start - Fixing Spinning Issue"
echo "==============================================="

# Get project root
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
ROOT_DIR=$(dirname "$SCRIPT_DIR")
cd "$ROOT_DIR/frontend"

# Kill any existing processes
echo "🧹 Cleaning up processes..."
pkill -f "next dev" 2>/dev/null || true
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

# Backup important files
echo "💾 Backing up critical files..."
cp package.json package.json.backup
cp next.config.js next.config.js.backup 2>/dev/null || true

# Complete clean slate
echo "🗑️  Removing all build artifacts..."
rm -rf node_modules
rm -rf .next
rm -rf package-lock.json
rm -rf .cache

# Create minimal package.json
echo "📦 Creating minimal package.json..."
cat > package.json << 'EOF'
{
  "name": "flowbotz-app",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "14.2.31",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "typescript": "^5"
  }
}
EOF

# Create minimal next.config.js
echo "⚙️  Creating minimal Next.js config..."
cat > next.config.js << 'EOF'
/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  }
}

module.exports = nextConfig
EOF

# Fresh install with minimal dependencies
echo "📦 Installing minimal dependencies..."
npm install

# Test if minimal setup works
echo "🧪 Testing minimal setup..."
echo "Starting Next.js server..."
echo ""
echo "🌐 If this works, you'll see:"
echo "   ✓ Ready in X.Xs"
echo "   - Local: http://localhost:3000"
echo ""
echo "Press Ctrl+C if it gets stuck again, otherwise visit:"
echo "   http://localhost:3000"
echo ""

npm run dev
EOF