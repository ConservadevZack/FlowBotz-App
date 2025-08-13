#!/bin/bash

# FlowBotz Backend Startup Script
echo "🚀 Starting FlowBotz Backend (FastAPI)..."

# Navigate to backend directory
cd FLOWBOTZ_PROJECT_TO_MOVE/backend

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  No .env file found in backend. Creating from example..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "✅ Created .env from example. Please update with your API keys."
    else
        echo "❌ No .env.example found. Please create .env manually."
        echo "You should copy your API keys from the main .env.local file."
    fi
fi

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "🐍 Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "📦 Installing Python dependencies..."
pip install -r requirements.txt

# Start the backend
echo "⚡ Starting FastAPI server..."
echo "🌐 Backend will be available at: http://localhost:8000"
echo "📚 API Documentation: http://localhost:8000/docs"
echo "📝 Press Ctrl+C to stop the server"
echo ""

# Start with uvicorn
uvicorn main:app --host 0.0.0.0 --port 8000 --reload