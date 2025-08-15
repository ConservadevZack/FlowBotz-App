import { io, Socket } from 'socket.io-client';
import { EventEmitter } from 'events';

export interface CollaborationUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  color: string;
  cursor?: {
    x: number;
    y: number;
  };
  selection?: {
    layerId: string;
    tool: string;
  };
  isActive: boolean;
  lastActivity: Date;
}

export interface CollaborationSession {
  id: string;
  projectId: string;
  owner: CollaborationUser;
  participants: CollaborationUser[];
  createdAt: Date;
  updatedAt: Date;
  isPublic: boolean;
  permissions: {
    canEdit: boolean;
    canComment: boolean;
    canExport: boolean;
  };
}

export interface CanvasOperation {
  id: string;
  type: 'add' | 'update' | 'delete' | 'move' | 'transform';
  layerId?: string;
  data: any;
  userId: string;
  timestamp: number;
  version: number;
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  text: string;
  position?: {
    x: number;
    y: number;
  };
  layerId?: string;
  timestamp: Date;
  replies: Comment[];
  resolved: boolean;
}

export interface CollaborationEvents {
  'user:joined': (user: CollaborationUser) => void;
  'user:left': (userId: string) => void;
  'user:cursor': (data: { userId: string; x: number; y: number }) => void;
  'user:selection': (data: { userId: string; layerId: string; tool: string }) => void;
  'canvas:operation': (operation: CanvasOperation) => void;
  'canvas:sync': (state: any) => void;
  'comment:added': (comment: Comment) => void;
  'comment:updated': (comment: Comment) => void;
  'comment:deleted': (commentId: string) => void;
  'session:updated': (session: CollaborationSession) => void;
  'error': (error: Error) => void;
  'reconnect': () => void;
  'disconnect': () => void;
}

class CollaborationService extends EventEmitter {
  private socket: Socket | null = null;
  private session: CollaborationSession | null = null;
  private users: Map<string, CollaborationUser> = new Map();
  private operationQueue: CanvasOperation[] = [];
  private isConnected: boolean = false;
  private currentVersion: number = 0;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  
  constructor() {
    super();
    this.setMaxListeners(50); // Increase max listeners for collaboration events
  }
  
  // Connect to collaboration session
  async connect(sessionId: string, userId: string, token: string): Promise<void> {
    if (this.socket?.connected) {
      await this.disconnect();
    }
    
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';
    
    this.socket = io(socketUrl, {
      auth: {
        token,
        sessionId,
        userId
      },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000
    });
    
    this.setupEventHandlers();
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, 10000);
      
      this.socket!.once('connect', () => {
        clearTimeout(timeout);
        this.isConnected = true;
        this.startHeartbeat();
        resolve();
      });
      
      this.socket!.once('connect_error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }
  
  // Disconnect from session
  async disconnect(): Promise<void> {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    this.isConnected = false;
    this.users.clear();
    this.operationQueue = [];
    this.session = null;
    this.currentVersion = 0;
  }
  
  // Setup socket event handlers
  private setupEventHandlers(): void {
    if (!this.socket) return;
    
    // Connection events
    this.socket.on('connect', () => {
      console.log('Connected to collaboration server');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.emit('reconnect');
      
      // Resend queued operations
      this.flushOperationQueue();
    });
    
    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected from collaboration server:', reason);
      this.isConnected = false;
      this.emit('disconnect');
    });
    
    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        this.emit('error', new Error('Failed to connect after maximum attempts'));
      }
    });
    
    // Session events
    this.socket.on('session:joined', (data: {
      session: CollaborationSession;
      users: CollaborationUser[];
      canvasState: any;
      version: number;
    }) => {
      this.session = data.session;
      this.currentVersion = data.version;
      
      // Update users map
      this.users.clear();
      data.users.forEach(user => {
        this.users.set(user.id, user);
      });
      
      this.emit('canvas:sync', data.canvasState);
      this.emit('session:updated', data.session);
    });
    
    // User events
    this.socket.on('user:joined', (user: CollaborationUser) => {
      this.users.set(user.id, user);
      this.emit('user:joined', user);
    });
    
    this.socket.on('user:left', (userId: string) => {
      this.users.delete(userId);
      this.emit('user:left', userId);
    });
    
    this.socket.on('user:cursor', (data: { userId: string; x: number; y: number }) => {
      const user = this.users.get(data.userId);
      if (user) {
        user.cursor = { x: data.x, y: data.y };
        this.emit('user:cursor', data);
      }
    });
    
    this.socket.on('user:selection', (data: { 
      userId: string; 
      layerId: string; 
      tool: string 
    }) => {
      const user = this.users.get(data.userId);
      if (user) {
        user.selection = { layerId: data.layerId, tool: data.tool };
        this.emit('user:selection', data);
      }
    });
    
    // Canvas events
    this.socket.on('canvas:operation', (operation: CanvasOperation) => {
      // Check if operation is newer than current version
      if (operation.version > this.currentVersion) {
        this.currentVersion = operation.version;
        this.emit('canvas:operation', operation);
      }
    });
    
    this.socket.on('canvas:conflict', (data: {
      operation: CanvasOperation;
      resolution: any;
    }) => {
      // Handle operation conflict
      console.warn('Operation conflict detected:', data);
      // Apply conflict resolution
      this.emit('canvas:operation', data.resolution);
    });
    
    // Comment events
    this.socket.on('comment:added', (comment: Comment) => {
      this.emit('comment:added', comment);
    });
    
    this.socket.on('comment:updated', (comment: Comment) => {
      this.emit('comment:updated', comment);
    });
    
    this.socket.on('comment:deleted', (commentId: string) => {
      this.emit('comment:deleted', commentId);
    });
    
    // Error handling
    this.socket.on('error', (error: any) => {
      console.error('Socket error:', error);
      this.emit('error', new Error(error.message || 'Unknown socket error'));
    });
  }
  
  // Send cursor position
  sendCursorPosition(x: number, y: number): void {
    if (!this.isConnected || !this.socket) return;
    
    this.socket.emit('user:cursor', { x, y });
  }
  
  // Send selection update
  sendSelection(layerId: string, tool: string): void {
    if (!this.isConnected || !this.socket) return;
    
    this.socket.emit('user:selection', { layerId, tool });
  }
  
  // Send canvas operation
  sendOperation(operation: Omit<CanvasOperation, 'id' | 'timestamp' | 'version'>): void {
    const fullOperation: CanvasOperation = {
      ...operation,
      id: `op-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      version: this.currentVersion + 1
    };
    
    if (!this.isConnected || !this.socket) {
      // Queue operation for later
      this.operationQueue.push(fullOperation);
      return;
    }
    
    this.socket.emit('canvas:operation', fullOperation);
    this.currentVersion++;
  }
  
  // Batch send operations
  sendOperations(operations: Omit<CanvasOperation, 'id' | 'timestamp' | 'version'>[]): void {
    const fullOperations = operations.map((op, index) => ({
      ...op,
      id: `op-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now() + index,
      version: this.currentVersion + index + 1
    }));
    
    if (!this.isConnected || !this.socket) {
      this.operationQueue.push(...fullOperations);
      return;
    }
    
    this.socket.emit('canvas:operations', fullOperations);
    this.currentVersion += fullOperations.length;
  }
  
  // Add comment
  addComment(comment: Omit<Comment, 'id' | 'timestamp'>): void {
    if (!this.isConnected || !this.socket) return;
    
    const fullComment: Comment = {
      ...comment,
      id: `comment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      replies: [],
      resolved: false
    };
    
    this.socket.emit('comment:add', fullComment);
  }
  
  // Update comment
  updateComment(commentId: string, updates: Partial<Comment>): void {
    if (!this.isConnected || !this.socket) return;
    
    this.socket.emit('comment:update', { commentId, updates });
  }
  
  // Delete comment
  deleteComment(commentId: string): void {
    if (!this.isConnected || !this.socket) return;
    
    this.socket.emit('comment:delete', commentId);
  }
  
  // Reply to comment
  replyToComment(commentId: string, reply: Omit<Comment, 'id' | 'timestamp'>): void {
    if (!this.isConnected || !this.socket) return;
    
    const fullReply: Comment = {
      ...reply,
      id: `reply-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      replies: [],
      resolved: false
    };
    
    this.socket.emit('comment:reply', { commentId, reply: fullReply });
  }
  
  // Resolve/unresolve comment
  toggleCommentResolved(commentId: string): void {
    if (!this.isConnected || !this.socket) return;
    
    this.socket.emit('comment:toggle-resolved', commentId);
  }
  
  // Request canvas sync
  requestSync(): void {
    if (!this.isConnected || !this.socket) return;
    
    this.socket.emit('canvas:request-sync');
  }
  
  // Flush operation queue
  private flushOperationQueue(): void {
    if (!this.isConnected || !this.socket || this.operationQueue.length === 0) return;
    
    this.socket.emit('canvas:operations', this.operationQueue);
    this.operationQueue = [];
  }
  
  // Start heartbeat
  private startHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit('heartbeat');
      }
    }, 30000); // Send heartbeat every 30 seconds
  }
  
  // Get session info
  getSession(): CollaborationSession | null {
    return this.session;
  }
  
  // Get active users
  getUsers(): CollaborationUser[] {
    return Array.from(this.users.values());
  }
  
  // Get user by ID
  getUser(userId: string): CollaborationUser | undefined {
    return this.users.get(userId);
  }
  
  // Check if connected
  isConnectedToSession(): boolean {
    return this.isConnected;
  }
  
  // Get current version
  getCurrentVersion(): number {
    return this.currentVersion;
  }
  
  // Create new session
  async createSession(projectId: string, isPublic: boolean = false): Promise<CollaborationSession> {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/collaboration/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ projectId, isPublic })
    });
    
    if (!response.ok) {
      throw new Error('Failed to create collaboration session');
    }
    
    return response.json();
  }
  
  // Join existing session
  async joinSession(sessionId: string): Promise<void> {
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('userId');
    
    if (!token || !userId) {
      throw new Error('Authentication required');
    }
    
    await this.connect(sessionId, userId, token);
  }
  
  // Leave session
  async leaveSession(): Promise<void> {
    await this.disconnect();
  }
  
  // Invite user to session
  async inviteUser(email: string, permissions: any): Promise<void> {
    if (!this.session) {
      throw new Error('No active session');
    }
    
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/collaboration/sessions/${this.session.id}/invite`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ email, permissions })
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to invite user');
    }
  }
  
  // Remove user from session
  async removeUser(userId: string): Promise<void> {
    if (!this.session) {
      throw new Error('No active session');
    }
    
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/collaboration/sessions/${this.session.id}/users/${userId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to remove user');
    }
  }
}

// Export singleton instance
export const collaborationService = new CollaborationService();