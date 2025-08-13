#!/bin/bash

# FlowBotz Stop Script
echo "🛑 Stopping FlowBotz Platform..."

# Stop backend if running
if [ -f "backend.pid" ]; then
    BACKEND_PID=$(cat backend.pid)
    if kill -0 $BACKEND_PID 2>/dev/null; then
        kill $BACKEND_PID
        echo "✅ Backend (PID: $BACKEND_PID) stopped"
    fi
    rm backend.pid
else
    echo "⚠️  No backend PID file found"
fi

# Kill any remaining processes
pkill -f "uvicorn main:app" 2>/dev/null
pkill -f "next dev" 2>/dev/null

# Kill processes on specific ports
lsof -ti:3000 | xargs kill -9 2>/dev/null
lsof -ti:8000 | xargs kill -9 2>/dev/null

echo "✅ All FlowBotz processes stopped"