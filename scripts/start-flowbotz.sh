#!/bin/bash

# FlowBotz Complete Startup Script
echo "🚀 Starting FlowBotz Platform..."
echo "================================"

# Get the script directory and go to project root
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
ROOT_DIR=$(dirname "$SCRIPT_DIR")

# Function to kill processes on specific ports
kill_port() {
    local port=$1
    local process_name=$2
    
    echo "🔍 Checking for processes on port $port..."
    
    # Find and kill processes using the port
    local pids=$(lsof -ti:$port 2>/dev/null)
    
    if [ ! -z "$pids" ]; then
        echo "⚠️  Found $process_name process(es) on port $port. Killing..."
        echo "$pids" | xargs kill -9 2>/dev/null
        sleep 1
        
        # Verify the port is free
        if lsof -ti:$port >/dev/null 2>&1; then
            echo "❌ Failed to kill process on port $port. You may need to kill it manually."
        else
            echo "✅ Successfully freed port $port"
        fi
    else
        echo "✅ Port $port is available"
    fi
}

# Function to setup clean environment
setup_clean_environment() {
    echo "🧹 Setting up clean environment..."
    
    # Kill any existing FlowBotz processes
    kill_port 3000 "Frontend (Next.js)"
    kill_port 8000 "Backend (FastAPI)"
    
    # Also kill any node processes that might be hanging
    echo "🔍 Cleaning up any hanging Node.js processes..."
    pkill -f "next dev" 2>/dev/null || true
    pkill -f "npm run dev" 2>/dev/null || true
    
    # Clean up any existing PID files
    if [ -f "$ROOT_DIR/backend.pid" ]; then
        rm "$ROOT_DIR/backend.pid"
        echo "✅ Cleaned up backend PID file"
    fi
    
    echo "✅ Environment cleaned up"
}

# Function to start backend in background
start_backend() {
    echo "🔧 Starting Backend..."
    cd "$ROOT_DIR/backend"
    
    # Check if .env exists
    if [ ! -f ".env" ]; then
        if [ -f ".env.example" ]; then
            cp .env.example .env
            echo "✅ Created backend .env from example"
        else
            echo "⚠️  Creating basic .env file - please update with your API keys"
            cat > .env << EOF
# Copy your API keys from the main .env.local file
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
OPENAI_API_KEY=your_openai_key
STRIPE_SECRET_KEY=your_stripe_secret_key
EOF
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
    pip install -r requirements.txt > "$ROOT_DIR/backend.log" 2>&1
    
    # Start backend
    echo "⚡ Backend starting on http://localhost:8000"
    uvicorn main:app --host 0.0.0.0 --port 8000 --reload > "$ROOT_DIR/backend.log" 2>&1 &
    BACKEND_PID=$!
    echo $BACKEND_PID > "$ROOT_DIR/backend.pid"
    
    # Return to root directory
    cd "$ROOT_DIR"
}

# Function to start frontend
start_frontend() {
    echo "🎨 Starting Frontend..."
    
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
    # Force Next.js to use port 3000 (it should be free now)
    PORT=3000 npm run dev
}

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down FlowBotz..."
    if [ -f "backend.pid" ]; then
        BACKEND_PID=$(cat backend.pid)
        kill $BACKEND_PID 2>/dev/null
        rm backend.pid
        echo "✅ Backend stopped"
    fi
    echo "✅ Frontend stopped"
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup INT TERM

# Setup clean environment first
setup_clean_environment

# Start backend in background
start_backend

# Wait a moment for backend to start
echo "⏳ Waiting for backend to initialize..."
sleep 5

# Start frontend (this will block)
start_frontend