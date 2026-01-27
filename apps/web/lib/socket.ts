import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL;

// Disable socket in production unless explicitly configured
const SOCKET_ENABLED = process.env.NODE_ENV === 'development' || !!SOCKET_URL;

// Socket instance
let socket: Socket | null = null;

// Event types
export interface SocketEvents {
  // Connection events
  connect: () => void;
  disconnect: (reason: string) => void;
  connect_error: (error: Error) => void;

  // Game events
  'game:created': (data: { gameId: string; createdBy: string }) => void;
  'game:updated': (data: { gameId: string; updates: unknown }) => void;
  'game:deleted': (data: { gameId: string }) => void;

  // Match finding events
  'match:request': (data: { userId: string; preferences: unknown }) => void;
  'match:found': (data: { matchId: string; players: string[] }) => void;
  'match:cancelled': (data: { matchId: string }) => void;

  // Notification events
  'notification:new': (data: {
    id: string;
    type: string;
    title: string;
    message: string;
    data?: unknown;
  }) => void;
  'notification:read': (data: { notificationId: string }) => void;

  // Live scoring events
  'score:update': (data: {
    gameId: string;
    team1Score: number;
    team2Score: number;
    currentGame: number;
  }) => void;
  'score:gameEnd': (data: { gameId: string; winner: 'team1' | 'team2' }) => void;
  'score:matchEnd': (data: {
    gameId: string;
    winner: 'team1' | 'team2';
    finalScores: Array<{ team1: number; team2: number }>;
  }) => void;

  // Presence events
  'presence:join': (data: { roomId: string; userId: string }) => void;
  'presence:leave': (data: { roomId: string; userId: string }) => void;
  'presence:online': (data: { users: string[] }) => void;
}

// Initialize socket connection
export function initSocket(authToken?: string): Socket | null {
  // Don't connect in production unless socket URL is explicitly configured
  if (!SOCKET_ENABLED) {
    return null;
  }

  if (socket?.connected) {
    return socket;
  }

  socket = io(SOCKET_URL || 'http://localhost:3001', {
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 10000,
    auth: authToken ? { token: authToken } : undefined,
    transports: ['websocket', 'polling'],
  });

  // Connection event handlers
  socket.on('connect', () => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Socket connected:', socket?.id);
    }
  });

  socket.on('disconnect', (reason) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Socket disconnected:', reason);
    }
  });

  socket.on('connect_error', (error) => {
    if (process.env.NODE_ENV === 'development') {
      console.error('Socket connection error:', error.message);
    }
  });

  return socket;
}

// Get existing socket instance
export function getSocket(): Socket | null {
  return socket;
}

// Connect socket
export function connectSocket(): void {
  if (!SOCKET_ENABLED) return;
  if (socket && !socket.connected) {
    socket.connect();
  }
}

// Disconnect socket
export function disconnectSocket(): void {
  if (socket?.connected) {
    socket.disconnect();
  }
}

// Subscribe to a room (e.g., for live game updates)
export function joinRoom(roomId: string): void {
  socket?.emit('room:join', { roomId });
}

// Unsubscribe from a room
export function leaveRoom(roomId: string): void {
  socket?.emit('room:leave', { roomId });
}

// Emit game score update
export function emitScoreUpdate(
  gameId: string,
  team1Score: number,
  team2Score: number,
  currentGame: number
): void {
  socket?.emit('score:update', {
    gameId,
    team1Score,
    team2Score,
    currentGame,
  });
}

// Request match finding
export function requestMatch(preferences: {
  skillLevel: number;
  gameType: 'singles' | 'doubles';
  location?: { lat: number; lng: number };
  radius?: number;
}): void {
  socket?.emit('match:request', preferences);
}

// Cancel match finding
export function cancelMatchRequest(): void {
  socket?.emit('match:cancel');
}

// Type-safe event listener
export function onSocketEvent<K extends keyof SocketEvents>(
  event: K,
  callback: SocketEvents[K]
): () => void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  socket?.on(event, callback as any);
  return () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    socket?.off(event, callback as any);
  };
}

// Type-safe emit
export function emitSocketEvent<K extends keyof SocketEvents>(
  event: K,
  ...args: Parameters<SocketEvents[K]>
): void {
  socket?.emit(event, ...args);
}

// Hook for socket state (use in components)
interface SocketConnectionState {
  socket: Socket | null;
  isConnected: boolean;
  connect: (token: string) => void;
  disconnect: () => void;
}

export function useSocketConnection(): SocketConnectionState {
  return {
    socket,
    isConnected: socket?.connected ?? false,
    connect: connectSocket,
    disconnect: disconnectSocket,
  };
}
