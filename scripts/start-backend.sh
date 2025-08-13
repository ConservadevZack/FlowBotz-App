#!/bin/bash

# FlowBotz Backend Only Startup Script
echo "🔧 Starting FlowBotz Backend..."
echo "==============================="

# Get the script directory and go to project root
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
ROOT_DIR=$(dirname "$SCRIPT_DIR")

# Go to backend directory
cd "$ROOT_DIR/backend"

# Check if .env exists
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "✅ Created backend .env from example"
    else
        echo "⚠️  Creating basic .env file - please update with your API keys"
        cat > .env << EOL
# Copy your API keys from the frontend .env.local file
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
OPENAI_API_KEY=your_openai_key
STRIPE_SECRET_KEY=your_stripe_secret_key
EOL
    fi
fi

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "🐍 Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment and install dependencies
echo "📦 Installing backend dependencies..."
source venv/bin/activate
pip install -r requirements.txt

# Start backend
echo "⚡ Backend starting on http://localhost:8000"
echo "📚 API Documentation available at http://localhost:8000/docs"
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
