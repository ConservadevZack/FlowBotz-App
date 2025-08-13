#!/bin/bash

# FlowBotz Frontend Startup Script
echo "🚀 Starting FlowBotz Frontend..."

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "⚠️  No .env.local file found. Creating from example..."
    if [ -f ".env.local.example" ]; then
        cp .env.local.example .env.local
        echo "✅ Created .env.local from example. Please update with your API keys."
    else
        echo "❌ No .env.local.example found. Please create .env.local manually."
        echo "You can copy from the existing .env.local with all your API keys."
    fi
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Start the frontend
echo "🎨 Starting Next.js development server..."
echo "🌐 Frontend will be available at: http://localhost:3000"
echo "📝 Press Ctrl+C to stop the server"
echo ""

npm run dev