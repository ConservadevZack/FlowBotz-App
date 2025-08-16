#!/bin/bash

# FlowBotz Quick Start Script
echo "🚀 FlowBotz Quick Start"
echo "======================"

# Get project root
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
ROOT_DIR=$(dirname "$SCRIPT_DIR")
cd "$ROOT_DIR"

# Kill existing processes
echo "🧹 Cleaning up..."
pkill -f "uvicorn main:app" 2>/dev/null || true
pkill -f "next dev" 2>/dev/null || true
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:8000 | xargs kill -9 2>/dev/null || true

# Start backend
echo "🔧 Starting backend..."
cd backend
source venv/bin/activate 2>/dev/null || python3 -m venv venv && source venv/bin/activate
pip install --quiet -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload > ../backend.log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > ../backend.pid

# Wait for backend
sleep 2

# Test backend
if curl -s http://localhost:8000/ > /dev/null; then
    echo "✅ Backend running on http://localhost:8000"
else
    echo "⚠️  Backend may not be ready yet"
fi

# Start frontend
echo "🎨 Starting frontend..."
cd ../frontend

# Clear Next.js cache to avoid compilation issues
rm -rf .next 2>/dev/null || true

# Create minimal environment if needed
if [ ! -f ".env.local" ]; then
    cat > .env.local << 'EOF'
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_APP_URL=http://localhost:3000
EOF
fi

echo ""
echo "🌐 Starting Next.js development server..."
echo "This may take a moment to compile..."
echo ""

# Start frontend with forced port
PORT=3000 npm run dev

EOF