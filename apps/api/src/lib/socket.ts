import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { verifyToken } from '@clerk/backend';

let io: Server | null = null;

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

/**
 * Initialize Socket.IO server
 */
export function initSocketServer(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // Authentication middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const verifiedToken = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY,
      });

      if (!verifiedToken) {
        return next(new Error('Invalid token'));
      }

      socket.userId = verifiedToken.sub;
      next();
    } catch (error) {
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`User connected: ${socket.userId}`);

    // Join user's personal room
    if (socket.userId) {
      socket.join(`user:${socket.userId}`);
    }

    // Handle joining game rooms
    socket.on('join:game', (gameId: string) => {
      socket.join(`game:${gameId}`);
      console.log(`User ${socket.userId} joined game ${gameId}`);
    });

    // Handle leaving game rooms
    socket.on('leave:game', (gameId: string) => {
      socket.leave(`game:${gameId}`);
      console.log(`User ${socket.userId} left game ${gameId}`);
    });

    // Handle joining club rooms
    socket.on('join:club', (clubId: string) => {
      socket.join(`club:${clubId}`);
    });

    // Handle leaving club rooms
    socket.on('leave:club', (clubId: string) => {
      socket.leave(`club:${clubId}`);
    });

    // Handle joining tournament rooms
    socket.on('join:tournament', (tournamentId: string) => {
      socket.join(`tournament:${tournamentId}`);
    });

    // Handle matchmaking queue
    socket.on('matchmaking:join', () => {
      socket.join('matchmaking:queue');
    });

    socket.on('matchmaking:leave', () => {
      socket.leave('matchmaking:queue');
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.userId}`);
    });
  });

  return io;
}

/**
 * Get Socket.IO server instance
 */
export function getSocketServer(): Server | null {
  return io;
}

/**
 * Emit event to specific user
 */
export function emitToUser(userId: string, event: string, data: unknown) {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
}

/**
 * Emit event to game room
 */
export function emitToGame(gameId: string, event: string, data: unknown) {
  if (io) {
    io.to(`game:${gameId}`).emit(event, data);
  }
}

/**
 * Emit event to club room
 */
export function emitToClub(clubId: string, event: string, data: unknown) {
  if (io) {
    io.to(`club:${clubId}`).emit(event, data);
  }
}

/**
 * Emit event to tournament room
 */
export function emitToTournament(tournamentId: string, event: string, data: unknown) {
  if (io) {
    io.to(`tournament:${tournamentId}`).emit(event, data);
  }
}

/**
 * Emit matchmaking event
 */
export function emitMatchmakingUpdate(event: string, data: unknown) {
  if (io) {
    io.to('matchmaking:queue').emit(event, data);
  }
}

/**
 * Broadcast to all connected clients
 */
export function broadcast(event: string, data: unknown) {
  if (io) {
    io.emit(event, data);
  }
}

/**
 * Socket event types for type safety
 */
export const SocketEvents = {
  // Notification events
  NOTIFICATION: 'notification',
  NOTIFICATION_READ: 'notification:read',

  // Game events
  GAME_STARTED: 'game:started',
  GAME_SCORE_UPDATE: 'game:score_update',
  GAME_ENDED: 'game:ended',
  GAME_VERIFIED: 'game:verified',
  GAME_DISPUTED: 'game:disputed',

  // Matchmaking events
  MATCH_FOUND: 'matchmaking:match_found',
  MATCH_EXPIRED: 'matchmaking:match_expired',
  QUEUE_UPDATE: 'matchmaking:queue_update',

  // Club events
  CLUB_MESSAGE: 'club:message',
  CLUB_MEMBER_JOINED: 'club:member_joined',
  CLUB_MEMBER_LEFT: 'club:member_left',
  CLUB_EVENT_CREATED: 'club:event_created',

  // Tournament events
  TOURNAMENT_STARTED: 'tournament:started',
  TOURNAMENT_MATCH_UPDATE: 'tournament:match_update',
  TOURNAMENT_BRACKET_UPDATE: 'tournament:bracket_update',
  TOURNAMENT_ENDED: 'tournament:ended',

  // Social events
  FRIEND_REQUEST: 'social:friend_request',
  FRIEND_ACCEPTED: 'social:friend_accepted',
  FRIEND_ONLINE: 'social:friend_online',
  FRIEND_OFFLINE: 'social:friend_offline',
} as const;
