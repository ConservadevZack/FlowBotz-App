# FlowBotz WebSocket Real-Time Architecture
*Designed by: backend-security-developer*
*Date: August 15, 2025*

## ARCHITECTURE OVERVIEW

Implementing Socket.IO for bi-directional real-time communication between frontend and backend, enabling live AI generation feedback, progress tracking, and instant updates.

## 1. TECHNOLOGY STACK

### Backend Stack
```python
# Core dependencies
fastapi==0.110.0
python-socketio==5.11.0
python-socketio[asyncio]==5.11.0
aioredis==2.0.1  # For pub/sub and scaling
uvicorn[standard]==0.27.0  # WebSocket support
```

### Frontend Stack
```javascript
// Core dependencies
"socket.io-client": "^4.7.0",
"react-use-websocket": "^4.5.0",  // Optional React hooks
```

## 2. BACKEND IMPLEMENTATION

### Socket.IO Server Setup
```python
# backend/app/websocket/socket_manager.py
import socketio
from typing import Dict, Any, Optional
import asyncio
from datetime import datetime
import json

class SocketManager:
    """Manages WebSocket connections and real-time events"""
    
    def __init__(self):
        # Create Socket.IO server with CORS
        self.sio = socketio.AsyncServer(
            async_mode='asgi',
            cors_allowed_origins=[
                "http://localhost:3000",
                "https://flowbotz.com",
                "https://*.flowbotz.com"
            ],
            logger=True,
            engineio_logger=True
        )
        
        # Connection tracking
        self.active_connections: Dict[str, Dict] = {}
        self.user_sessions: Dict[str, str] = {}  # user_id -> sid mapping
        
        # Register event handlers
        self._register_handlers()
    
    def _register_handlers(self):
        """Register all Socket.IO event handlers"""
        
        @self.sio.event
        async def connect(sid, environ, auth):
            """Handle new connections"""
            print(f"Client connected: {sid}")
            
            # Validate authentication
            if auth and 'token' in auth:
                user_id = await self._validate_token(auth['token'])
                if user_id:
                    self.active_connections[sid] = {
                        'user_id': user_id,
                        'connected_at': datetime.utcnow(),
                        'rooms': []
                    }
                    self.user_sessions[user_id] = sid
                    
                    # Join user's personal room
                    await self.sio.enter_room(sid, f"user_{user_id}")
                    
                    # Send connection success
                    await self.sio.emit('connection_success', {
                        'message': 'Connected to FlowBotz real-time server',
                        'user_id': user_id
                    }, room=sid)
                else:
                    await self.sio.disconnect(sid)
            else:
                await self.sio.disconnect(sid)
        
        @self.sio.event
        async def disconnect(sid):
            """Handle disconnections"""
            print(f"Client disconnected: {sid}")
            
            if sid in self.active_connections:
                user_id = self.active_connections[sid]['user_id']
                del self.active_connections[sid]
                if user_id in self.user_sessions:
                    del self.user_sessions[user_id]
        
        @self.sio.event
        async def ai_generation_start(sid, data):
            """Handle AI generation start"""
            user_id = self.active_connections[sid]['user_id']
            generation_id = data.get('generation_id')
            
            # Join generation room for updates
            await self.sio.enter_room(sid, f"generation_{generation_id}")
            
            # Start progress tracking
            asyncio.create_task(
                self._track_ai_generation(generation_id, user_id)
            )
    
    async def _track_ai_generation(self, generation_id: str, user_id: str):
        """Track AI generation progress and send updates"""
        stages = [
            ("Analyzing prompt", 10, 2),
            ("Preparing AI model", 25, 3),
            ("Generating initial concept", 40, 5),
            ("Refining details", 60, 4),
            ("Enhancing quality", 80, 3),
            ("Finalizing image", 95, 2),
            ("Complete", 100, 1)
        ]
        
        for stage, progress, duration in stages:
            await asyncio.sleep(duration)
            
            await self.sio.emit('generation_progress', {
                'generation_id': generation_id,
                'stage': stage,
                'progress': progress,
                'estimated_time_remaining': sum(d for _, _, d in stages[stages.index((stage, progress, duration))+1:])
            }, room=f"generation_{generation_id}")
    
    async def _validate_token(self, token: str) -> Optional[str]:
        """Validate JWT token and return user_id"""
        # Implementation depends on your auth system
        # This is a placeholder
        return "user_123"  # Replace with actual validation

# Initialize Socket.IO manager
socket_manager = SocketManager()
```

### FastAPI Integration
```python
# backend/main.py updates
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import socketio
from app.websocket.socket_manager import socket_manager

# Create FastAPI app
app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create Socket.IO app
socket_app = socketio.ASGIApp(
    socket_manager.sio,
    other_asgi_app=app,
    socketio_path='/socket.io/'
)

# AI Generation endpoint with WebSocket integration
@app.post("/api/ai/generate")
async def generate_image(request: AIGenerationRequest):
    generation_id = str(uuid4())
    
    # Notify via WebSocket that generation started
    await socket_manager.sio.emit('generation_started', {
        'generation_id': generation_id,
        'prompt': request.prompt,
        'timestamp': datetime.utcnow().isoformat()
    }, room=f"user_{request.user_id}")
    
    # Start async generation
    asyncio.create_task(
        process_ai_generation(generation_id, request)
    )
    
    return {"generation_id": generation_id, "status": "started"}

async def process_ai_generation(generation_id: str, request: AIGenerationRequest):
    """Process AI generation with progress updates"""
    try:
        # Update progress: Analyzing prompt
        await socket_manager.sio.emit('generation_progress', {
            'generation_id': generation_id,
            'stage': 'Analyzing prompt',
            'progress': 10
        }, room=f"generation_{generation_id}")
        
        # Call AI service
        result = await ai_service.generate(request.prompt)
        
        # Send completion
        await socket_manager.sio.emit('generation_complete', {
            'generation_id': generation_id,
            'image_url': result.image_url,
            'metadata': result.metadata
        }, room=f"generation_{generation_id}")
        
    except Exception as e:
        # Send error
        await socket_manager.sio.emit('generation_error', {
            'generation_id': generation_id,
            'error': str(e)
        }, room=f"generation_{generation_id}")

# Use the socket app as the main ASGI app
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(socket_app, host="0.0.0.0", port=8000)
```

## 3. FRONTEND IMPLEMENTATION

### WebSocket Service (Singleton Pattern)
```typescript
// frontend/lib/services/websocket-service.ts
import { io, Socket } from 'socket.io-client';

interface GenerationProgress {
  generation_id: string;
  stage: string;
  progress: number;
  estimated_time_remaining?: number;
}

interface GenerationComplete {
  generation_id: string;
  image_url: string;
  metadata: any;
}

class WebSocketService {
  private static instance: WebSocketService;
  private socket: Socket | null = null;
  private listeners: Map<string, Set<Function>> = new Map();
  
  private constructor() {}
  
  static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }
  
  connect(token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        resolve();
        return;
      }
      
      this.socket = io(process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:8000', {
        path: '/socket.io/',
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
      });
      
      this.socket.on('connect', () => {
        console.log('WebSocket connected');
        this.setupEventListeners();
        resolve();
      });
      
      this.socket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error);
        reject(error);
      });
      
      this.socket.on('disconnect', (reason) => {
        console.log('WebSocket disconnected:', reason);
        if (reason === 'io server disconnect') {
          // Server initiated disconnect, attempt reconnection
          this.socket?.connect();
        }
      });
    });
  }
  
  private setupEventListeners() {
    if (!this.socket) return;
    
    // AI Generation events
    this.socket.on('generation_started', (data) => {
      this.emit('generation_started', data);
    });
    
    this.socket.on('generation_progress', (data: GenerationProgress) => {
      this.emit('generation_progress', data);
    });
    
    this.socket.on('generation_complete', (data: GenerationComplete) => {
      this.emit('generation_complete', data);
    });
    
    this.socket.on('generation_error', (data) => {
      this.emit('generation_error', data);
    });
  }
  
  startAIGeneration(generationId: string) {
    this.socket?.emit('ai_generation_start', { generation_id: generationId });
  }
  
  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)?.add(callback);
  }
  
  off(event: string, callback: Function) {
    this.listeners.get(event)?.delete(callback);
  }
  
  private emit(event: string, data: any) {
    this.listeners.get(event)?.forEach(callback => callback(data));
  }
  
  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }
}

export default WebSocketService.getInstance();
```

### React Hook for WebSocket
```typescript
// frontend/hooks/useWebSocket.ts
import { useEffect, useState, useCallback } from 'react';
import WebSocketService from '@/lib/services/websocket-service';
import { useAuth } from '@/components/AuthProvider';

interface UseWebSocketOptions {
  onProgress?: (data: any) => void;
  onComplete?: (data: any) => void;
  onError?: (data: any) => void;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const { user } = useAuth();
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  
  useEffect(() => {
    if (!user?.access_token) return;
    
    const connect = async () => {
      setConnecting(true);
      try {
        await WebSocketService.connect(user.access_token);
        setConnected(true);
      } catch (error) {
        console.error('Failed to connect WebSocket:', error);
        setConnected(false);
      } finally {
        setConnecting(false);
      }
    };
    
    connect();
    
    return () => {
      WebSocketService.disconnect();
      setConnected(false);
    };
  }, [user?.access_token]);
  
  useEffect(() => {
    if (!connected) return;
    
    const handleProgress = (data: any) => options.onProgress?.(data);
    const handleComplete = (data: any) => options.onComplete?.(data);
    const handleError = (data: any) => options.onError?.(data);
    
    WebSocketService.on('generation_progress', handleProgress);
    WebSocketService.on('generation_complete', handleComplete);
    WebSocketService.on('generation_error', handleError);
    
    return () => {
      WebSocketService.off('generation_progress', handleProgress);
      WebSocketService.off('generation_complete', handleComplete);
      WebSocketService.off('generation_error', handleError);
    };
  }, [connected, options.onProgress, options.onComplete, options.onError]);
  
  const startGeneration = useCallback((generationId: string) => {
    if (connected) {
      WebSocketService.startAIGeneration(generationId);
    }
  }, [connected]);
  
  return {
    connected,
    connecting,
    startGeneration,
  };
}
```

### AI Generation Component with Real-Time Feedback
```typescript
// frontend/components/creator/AIGenerationPanel.tsx
import React, { useState } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { apiService } from '@/lib/api';

export function AIGenerationPanel() {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [generationId, setGenerationId] = useState<string | null>(null);
  
  const { connected, startGeneration } = useWebSocket({
    onProgress: (data) => {
      if (data.generation_id === generationId) {
        setProgress(data.progress);
        setStage(data.stage);
      }
    },
    onComplete: (data) => {
      if (data.generation_id === generationId) {
        setGeneratedImage(data.image_url);
        setIsGenerating(false);
        setProgress(100);
        setStage('Complete!');
      }
    },
    onError: (data) => {
      if (data.generation_id === generationId) {
        console.error('Generation error:', data.error);
        setIsGenerating(false);
        setStage('Error occurred');
      }
    },
  });
  
  const handleGenerate = async () => {
    if (!prompt.trim() || !connected) return;
    
    setIsGenerating(true);
    setProgress(0);
    setStage('Initializing...');
    
    try {
      const response = await apiService.ai.generateImage(prompt);
      const genId = response.generation_id;
      setGenerationId(genId);
      startGeneration(genId);
    } catch (error) {
      console.error('Failed to start generation:', error);
      setIsGenerating(false);
    }
  };
  
  const handleCancel = () => {
    // Implement cancellation logic
    setIsGenerating(false);
    setProgress(0);
    setStage('');
  };
  
  return (
    <div className="glass-panel p-6">
      <h2 className="text-2xl font-bold mb-4">AI Image Generation</h2>
      
      {/* WebSocket Connection Status */}
      <div className="mb-4">
        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
          connected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
        }`}>
          <div className={`w-2 h-2 rounded-full ${
            connected ? 'bg-green-400' : 'bg-red-400'
          } animate-pulse`} />
          {connected ? 'Connected' : 'Disconnected'}
        </div>
      </div>
      
      {/* Prompt Input */}
      <div className="mb-4">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe your image..."
          className="w-full p-3 bg-white/5 border border-white/10 rounded-lg 
                     text-white placeholder-white/50 resize-none"
          rows={3}
          disabled={isGenerating}
        />
      </div>
      
      {/* Generation Progress */}
      {isGenerating && (
        <div className="mb-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-white/70">{stage}</span>
            <span className="text-white/70">{progress}%</span>
          </div>
          
          <div className="relative h-2 bg-white/10 rounded-full overflow-hidden">
            <div 
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-500 to-pink-500 
                         rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          
          {/* Animated loading indicator */}
          <div className="flex items-center gap-2 mt-2">
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-2 h-2 bg-white/50 rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 0.1}s` }}
                />
              ))}
            </div>
            <span className="text-xs text-white/50">Processing your request...</span>
          </div>
        </div>
      )}
      
      {/* Generated Image Preview */}
      {generatedImage && !isGenerating && (
        <div className="mb-4">
          <img 
            src={generatedImage} 
            alt="Generated" 
            className="w-full rounded-lg shadow-xl"
          />
        </div>
      )}
      
      {/* Action Buttons */}
      <div className="flex gap-2">
        {!isGenerating ? (
          <button
            onClick={handleGenerate}
            disabled={!prompt.trim() || !connected}
            className="flex-1 py-3 px-4 bg-gradient-to-r from-purple-500 to-pink-500 
                       text-white rounded-lg font-medium hover:shadow-lg 
                       disabled:opacity-50 disabled:cursor-not-allowed
                       transition-all duration-200"
          >
            Generate Image
          </button>
        ) : (
          <button
            onClick={handleCancel}
            className="flex-1 py-3 px-4 bg-red-500/20 border border-red-500/50 
                       text-red-400 rounded-lg font-medium hover:bg-red-500/30
                       transition-all duration-200"
          >
            Cancel Generation
          </button>
        )}
      </div>
    </div>
  );
}
```

## 4. SCALING ARCHITECTURE

### Redis Pub/Sub for Multiple Servers
```python
# backend/app/websocket/redis_manager.py
import aioredis
import json
from typing import Optional

class RedisManager:
    """Manages Redis pub/sub for WebSocket scaling"""
    
    def __init__(self):
        self.redis: Optional[aioredis.Redis] = None
        self.pubsub: Optional[aioredis.client.PubSub] = None
    
    async def connect(self):
        """Connect to Redis"""
        self.redis = await aioredis.from_url(
            "redis://localhost:6379",
            encoding="utf-8",
            decode_responses=True
        )
        self.pubsub = self.redis.pubsub()
    
    async def publish(self, channel: str, message: dict):
        """Publish message to Redis channel"""
        await self.redis.publish(
            channel,
            json.dumps(message)
        )
    
    async def subscribe(self, channels: list):
        """Subscribe to Redis channels"""
        await self.pubsub.subscribe(*channels)
    
    async def listen(self):
        """Listen for messages"""
        async for message in self.pubsub.listen():
            if message['type'] == 'message':
                yield json.loads(message['data'])
```

## 5. SECURITY CONSIDERATIONS

### Authentication & Authorization
```python
# backend/app/websocket/auth.py
from jose import JWTError, jwt
from typing import Optional

async def validate_socket_token(token: str) -> Optional[dict]:
    """Validate JWT token for WebSocket connection"""
    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )
        return payload
    except JWTError:
        return None

# Rate limiting for WebSocket events
class RateLimiter:
    def __init__(self, max_events: int = 100, window: int = 60):
        self.max_events = max_events
        self.window = window
        self.events = {}
    
    async def check_rate_limit(self, user_id: str) -> bool:
        """Check if user exceeded rate limit"""
        # Implementation here
        pass
```

### Input Validation
```python
# Validate all incoming WebSocket messages
from pydantic import BaseModel, validator

class GenerationRequest(BaseModel):
    prompt: str
    generation_id: str
    
    @validator('prompt')
    def validate_prompt(cls, v):
        if len(v) > 1000:
            raise ValueError('Prompt too long')
        # Add more validation
        return v
```

## 6. MONITORING & DEBUGGING

### WebSocket Metrics
```python
# backend/app/websocket/metrics.py
class WebSocketMetrics:
    """Track WebSocket metrics"""
    
    def __init__(self):
        self.active_connections = 0
        self.messages_sent = 0
        self.messages_received = 0
        self.errors = 0
    
    async def log_metrics(self):
        """Log metrics to monitoring service"""
        metrics = {
            'active_connections': self.active_connections,
            'messages_sent': self.messages_sent,
            'messages_received': self.messages_received,
            'errors': self.errors,
            'timestamp': datetime.utcnow()
        }
        # Send to monitoring service
```

## 7. IMPLEMENTATION TIMELINE

### Phase 1: Basic Setup (4 hours)
- [ ] Install Socket.IO dependencies
- [ ] Create WebSocket server
- [ ] Implement basic connection handling
- [ ] Set up frontend WebSocket service

### Phase 2: AI Generation (6 hours)
- [ ] Implement progress tracking
- [ ] Create event handlers
- [ ] Build React components
- [ ] Add cancellation support

### Phase 3: Scaling (4 hours)
- [ ] Add Redis pub/sub
- [ ] Implement room management
- [ ] Add reconnection logic
- [ ] Test multi-server setup

### Phase 4: Security (4 hours)
- [ ] Add authentication
- [ ] Implement rate limiting
- [ ] Add input validation
- [ ] Security testing

## DELIVERABLES

1. **Backend WebSocket Server**: Full Socket.IO implementation
2. **Frontend Service**: Singleton WebSocket service
3. **React Hooks**: Custom hooks for WebSocket usage
4. **Real-time Components**: AI generation with live feedback
5. **Documentation**: API documentation and usage guide

---
*Architecture Ready for Implementation*
*Estimated Time: 18 hours*
*Priority: CRITICAL*