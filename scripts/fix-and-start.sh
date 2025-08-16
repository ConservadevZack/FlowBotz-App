#!/bin/bash

# FlowBotz Fix and Start Script
echo "🔧 FlowBotz Fix & Start Script"
echo "=============================="

# Get the script directory and go to project root
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
ROOT_DIR=$(dirname "$SCRIPT_DIR")
cd "$ROOT_DIR"

# Kill any existing processes
echo "🧹 Cleaning up existing processes..."
pkill -f "uvicorn main:app" 2>/dev/null || true
pkill -f "next dev" 2>/dev/null || true
pkill -f "npm run dev" 2>/dev/null || true
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:8000 | xargs kill -9 2>/dev/null || true
echo "✅ Processes cleaned up"

# Check and fix backend environment
echo "🔧 Setting up backend environment..."
cd "$ROOT_DIR/backend"

# Create basic .env if it doesn't exist
if [ ! -f ".env" ]; then
    echo "📝 Creating basic backend .env..."
    cat > .env << 'EOF'
# Basic environment for development
DATABASE_URL=postgresql://localhost:5432/flowbotz
SUPABASE_URL=https://placeholder.supabase.co
SUPABASE_ANON_KEY=placeholder_key
SUPABASE_SERVICE_ROLE_KEY=placeholder_service_key
OPENAI_API_KEY=sk-placeholder
STRIPE_SECRET_KEY=sk_test_placeholder
STRIPE_WEBHOOK_SECRET=whsec_placeholder
CSRF_SECRET_KEY=your_csrf_secret_key_here
REPLICATE_API_TOKEN=r8_placeholder
STABILITY_API_KEY=sk-placeholder
EOF
    echo "✅ Created basic backend .env"
fi

# Check Python virtual environment
if [ ! -d "venv" ]; then
    echo "🐍 Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate and install dependencies
echo "📦 Installing backend dependencies..."
source venv/bin/activate
pip install --quiet -r requirements.txt

# Create a basic main.py if needed
if [ ! -f "main.py" ]; then
    echo "📝 Creating basic main.py..."
    cat > main.py << 'EOF'
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import auth, ai, payments, pod
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = FastAPI(
    title="FlowBotz API",
    description="AI-Powered Design & Print-on-Demand Platform API",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(ai.router, prefix="/api/ai", tags=["ai"])
app.include_router(payments.router, prefix="/api/payments", tags=["payments"])
app.include_router(pod.router, prefix="/api/pod", tags=["pod"])

@app.get("/")
async def root():
    return {"message": "FlowBotz API is running!", "status": "healthy"}

@app.get("/health")
async def health():
    return {"status": "healthy", "version": "1.0.0"}

@app.on_event("startup")
async def startup_event():
    print("🚀 FlowBotz API starting up...")

@app.on_event("shutdown") 
async def shutdown_event():
    print("🛑 FlowBotz API shutting down...")
EOF
    echo "✅ Created basic main.py"
fi

# Start backend in background
echo "⚡ Starting backend on http://localhost:8000..."
uvicorn main:app --host 0.0.0.0 --port 8000 --reload > ../backend.log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > ../backend.pid

# Wait for backend to start
echo "⏳ Waiting for backend to initialize..."
sleep 3

# Test backend
echo "🔍 Testing backend connection..."
if curl -s http://localhost:8000/health > /dev/null; then
    echo "✅ Backend is responding"
else
    echo "⚠️  Backend may not be fully ready yet"
fi

# Setup frontend
echo "🎨 Setting up frontend..."
cd "$ROOT_DIR/frontend"

# Check environment
if [ ! -f ".env.local" ]; then
    echo "📝 Creating basic frontend .env.local..."
    cat > .env.local << 'EOF'
# Frontend Environment Variables
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_placeholder
NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder_key
EOF
    echo "✅ Created basic frontend .env.local"
fi

# Install dependencies if needed
if [ ! -d "node_modules" ] || [ ! -f "node_modules/.installed" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install --silent
    touch node_modules/.installed
    echo "✅ Frontend dependencies installed"
fi

# Check for missing critical files
echo "🔍 Checking for critical frontend files..."

# Check if lib/supabase.ts exists
if [ ! -f "lib/supabase.ts" ]; then
    echo "📝 Creating lib/supabase.ts..."
    mkdir -p lib
    cat > lib/supabase.ts << 'EOF'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder_key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
EOF
    echo "✅ Created lib/supabase.ts"
fi

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down FlowBotz..."
    if [ -f "../backend.pid" ]; then
        BACKEND_PID=$(cat ../backend.pid)
        kill $BACKEND_PID 2>/dev/null
        rm ../backend.pid
        echo "✅ Backend stopped"
    fi
    echo "✅ Frontend stopped"
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup INT TERM

echo ""
echo "🚀 Starting FlowBotz Platform..."
echo "================================"
echo "Frontend: http://localhost:3000"
echo "Backend:  http://localhost:8000"
echo "API Docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Start frontend (this will block)
PORT=3000 npm run dev
EOF