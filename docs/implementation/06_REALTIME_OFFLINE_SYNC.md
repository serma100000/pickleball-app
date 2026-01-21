# Real-Time and Offline Sync Architecture

## Executive Summary

This document defines the real-time communication and offline-first architecture for the pickleball app. Given that **tournament venues often have poor connectivity** and players need instant updates for live scoring, this architecture is critical to the app's success.

**Key Design Principles:**
1. **Offline-First**: App must work fully without connectivity
2. **Optimistic Updates**: UI updates immediately, syncs in background
3. **Conflict Resolution**: Handle multiple users editing same data
4. **Progressive Enhancement**: Degrade gracefully based on connectivity
5. **Battery Efficiency**: Minimize background operations on mobile

---

## Part 1: Real-Time Architecture

### 1.1 Technology Decision: WebSocket + SSE Hybrid

After evaluating options, we recommend a **hybrid approach**:

| Technology | Use Case | Rationale |
|------------|----------|-----------|
| **WebSocket** | Bidirectional real-time (scoring, chat) | Low latency, full-duplex needed |
| **SSE (Server-Sent Events)** | One-way updates (notifications, feeds) | Simpler, auto-reconnect, HTTP/2 compatible |
| **Polling (Fallback)** | Legacy/restricted environments | Universal compatibility |

**Decision Matrix:**

```
Feature                    | WebSocket | SSE  | Polling
---------------------------|-----------|------|--------
Live Tournament Scoring    | PRIMARY   | -    | Fallback
Match Notifications        | -         | PRIMARY | Fallback
Activity Feed Updates      | -         | PRIMARY | Fallback
Chat Messages              | PRIMARY   | -    | Fallback
Game Invites               | -         | PRIMARY | Fallback
Bracket Updates            | PRIMARY   | -    | Fallback
Club Announcements         | -         | PRIMARY | Fallback
```

### 1.2 Connection Architecture

```
                    +-------------------+
                    |   Load Balancer   |
                    |  (WebSocket-aware)|
                    +--------+----------+
                             |
        +--------------------+--------------------+
        |                    |                    |
+-------v-------+   +--------v------+   +--------v------+
|  WS Server 1  |   |  WS Server 2  |   |  WS Server 3  |
|   (Node.js)   |   |   (Node.js)   |   |   (Node.js)   |
+-------+-------+   +--------+------+   +--------+------+
        |                    |                    |
        +--------------------+--------------------+
                             |
                    +--------v----------+
                    |   Redis Pub/Sub   |
                    |  (Message Broker) |
                    +--------+----------+
                             |
        +--------------------+--------------------+
        |                    |                    |
+-------v-------+   +--------v------+   +--------v------+
|  API Server 1 |   |  API Server 2 |   |  API Server 3 |
+---------------+   +---------------+   +---------------+
```

### 1.3 Connection Management

#### Client-Side Connection Manager

```typescript
// /src/lib/realtime/ConnectionManager.ts

interface ConnectionConfig {
  wsUrl: string;
  sseUrl: string;
  reconnectAttempts: number;
  reconnectBaseDelay: number;
  heartbeatInterval: number;
}

type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

class ConnectionManager {
  private ws: WebSocket | null = null;
  private sse: EventSource | null = null;
  private state: ConnectionState = 'disconnected';
  private reconnectAttempts = 0;
  private subscriptions: Map<string, Set<(data: unknown) => void>> = new Map();
  private pendingMessages: Array<{ channel: string; data: unknown }> = [];
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  private readonly config: ConnectionConfig = {
    wsUrl: process.env.NEXT_PUBLIC_WS_URL!,
    sseUrl: process.env.NEXT_PUBLIC_SSE_URL!,
    reconnectAttempts: 10,
    reconnectBaseDelay: 1000,
    heartbeatInterval: 30000,
  };

  // Exponential backoff with jitter
  private getReconnectDelay(): number {
    const exponentialDelay = this.config.reconnectBaseDelay * Math.pow(2, this.reconnectAttempts);
    const jitter = Math.random() * 1000;
    return Math.min(exponentialDelay + jitter, 30000); // Max 30 seconds
  }

  async connect(authToken: string): Promise<void> {
    this.state = 'connecting';

    try {
      // Connect WebSocket for bidirectional communication
      await this.connectWebSocket(authToken);

      // Connect SSE for server-push updates
      await this.connectSSE(authToken);

      this.state = 'connected';
      this.reconnectAttempts = 0;
      this.startHeartbeat();
      this.flushPendingMessages();
    } catch (error) {
      this.handleConnectionError(error);
    }
  }

  private async connectWebSocket(authToken: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(`${this.config.wsUrl}?token=${authToken}`);

      this.ws.onopen = () => {
        console.log('[WS] Connected');
        resolve();
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(JSON.parse(event.data));
      };

      this.ws.onclose = (event) => {
        console.log('[WS] Closed:', event.code, event.reason);
        this.handleDisconnect();
      };

      this.ws.onerror = (error) => {
        console.error('[WS] Error:', error);
        reject(error);
      };
    });
  }

  private async connectSSE(authToken: string): Promise<void> {
    return new Promise((resolve) => {
      this.sse = new EventSource(`${this.config.sseUrl}?token=${authToken}`);

      this.sse.onopen = () => {
        console.log('[SSE] Connected');
        resolve();
      };

      this.sse.onmessage = (event) => {
        this.handleMessage(JSON.parse(event.data));
      };

      this.sse.onerror = () => {
        console.error('[SSE] Error, reconnecting...');
        // SSE auto-reconnects, but we track state
      };
    });
  }

  private handleDisconnect(): void {
    if (this.state === 'disconnected') return;

    this.state = 'reconnecting';
    this.stopHeartbeat();

    if (this.reconnectAttempts < this.config.reconnectAttempts) {
      const delay = this.getReconnectDelay();
      console.log(`[RT] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1})`);

      setTimeout(() => {
        this.reconnectAttempts++;
        this.connect(this.getStoredToken());
      }, delay);
    } else {
      this.state = 'disconnected';
      this.notifySubscribers('connection:failed', { reason: 'max_attempts' });
    }
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
      }
    }, this.config.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  // Public API
  subscribe(channel: string, callback: (data: unknown) => void): () => void {
    if (!this.subscriptions.has(channel)) {
      this.subscriptions.set(channel, new Set());
      this.sendSubscription(channel);
    }

    this.subscriptions.get(channel)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.subscriptions.get(channel)?.delete(callback);
      if (this.subscriptions.get(channel)?.size === 0) {
        this.subscriptions.delete(channel);
        this.sendUnsubscription(channel);
      }
    };
  }

  send(channel: string, data: unknown): void {
    const message = { channel, data, timestamp: Date.now() };

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      // Queue for later delivery
      this.pendingMessages.push(message);
    }
  }

  disconnect(): void {
    this.state = 'disconnected';
    this.stopHeartbeat();
    this.ws?.close();
    this.sse?.close();
    this.ws = null;
    this.sse = null;
  }
}

export const connectionManager = new ConnectionManager();
```

### 1.4 Room/Channel Structure

```typescript
// Channel naming conventions and structure

interface ChannelTypes {
  // Tournament channels
  'tournament:{id}': TournamentUpdate;
  'tournament:{id}:bracket': BracketUpdate;
  'tournament:{id}:match:{matchId}': MatchUpdate;
  'tournament:{id}:scores': ScoreUpdate;
  'tournament:{id}:announcements': AnnouncementUpdate;

  // Club channels
  'club:{id}': ClubUpdate;
  'club:{id}:announcements': AnnouncementUpdate;
  'club:{id}:schedule': ScheduleUpdate;
  'club:{id}:members': MemberUpdate;

  // League channels
  'league:{id}': LeagueUpdate;
  'league:{id}:standings': StandingsUpdate;
  'league:{id}:matches': MatchUpdate;

  // User channels (private)
  'user:{id}:notifications': NotificationPayload;
  'user:{id}:game-invites': GameInvitePayload;
  'user:{id}:messages': MessagePayload;
  'user:{id}:friend-activity': ActivityPayload;

  // Court channels
  'court:{id}:availability': AvailabilityUpdate;
  'court:{id}:activity': CourtActivityUpdate;

  // Game channels (for live scoring)
  'game:{id}': GameUpdate;
  'game:{id}:score': ScoreUpdate;

  // Global channels
  'global:activity-feed': ActivityFeedItem;
  'global:announcements': GlobalAnnouncement;
}
```

### 1.5 Event Types and Payloads

```typescript
// /src/types/realtime.ts

// Base event structure
interface RealtimeEvent<T = unknown> {
  type: string;
  channel: string;
  payload: T;
  timestamp: number;
  version: number;  // For conflict detection
  userId?: string;  // Who triggered the event
}

// Tournament Events
interface TournamentUpdate {
  type: 'bracket_updated' | 'match_started' | 'match_completed' | 'announcement';
  tournamentId: string;
  data: unknown;
}

interface MatchUpdate {
  type: 'score_change' | 'game_start' | 'game_end' | 'timeout' | 'side_switch';
  matchId: string;
  gameNumber: number;
  team1Score: number;
  team2Score: number;
  servingTeam: 1 | 2;
  serverNumber?: 1 | 2;
  timestamp: number;
}

interface ScoreUpdate {
  matchId: string;
  team1Score: number;
  team2Score: number;
  gameScores: Array<{ team1: number; team2: number }>;
  isComplete: boolean;
  winner?: 1 | 2;
}

interface BracketUpdate {
  type: 'match_result' | 'seeding_change' | 'bracket_reset';
  matchId: string;
  winnerId: string;
  loserId: string;
  score: string;
  nextMatchId?: string;
}

// Notification Events
interface NotificationPayload {
  id: string;
  type: 'game_invite' | 'match_ready' | 'score_verified' | 'friend_request' |
        'club_invite' | 'tournament_reminder' | 'rating_update' | 'achievement';
  title: string;
  body: string;
  data: Record<string, unknown>;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  createdAt: number;
}

// Game Invite Events
interface GameInvitePayload {
  id: string;
  type: 'casual' | 'league' | 'tournament';
  fromUserId: string;
  fromUserName: string;
  courtId?: string;
  courtName?: string;
  scheduledTime?: number;
  expiresAt: number;
  message?: string;
}

// Activity Feed Events
interface ActivityFeedItem {
  id: string;
  type: 'game_completed' | 'rating_change' | 'achievement_earned' |
        'tournament_win' | 'friend_joined' | 'streak_milestone';
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  metadata: Record<string, unknown>;
  createdAt: number;
  visibility: 'public' | 'friends' | 'club';
}

// Club Events
interface ClubUpdate {
  type: 'member_joined' | 'member_left' | 'event_created' | 'schedule_changed';
  clubId: string;
  data: unknown;
}

interface AnnouncementUpdate {
  id: string;
  title: string;
  content: string;
  priority: 'info' | 'important' | 'urgent';
  authorId: string;
  authorName: string;
  createdAt: number;
  expiresAt?: number;
}
```

### 1.6 Server-Side Implementation

```typescript
// /src/server/realtime/WebSocketServer.ts

import { Server as SocketIOServer } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { Redis } from 'ioredis';

class RealtimeServer {
  private io: SocketIOServer;
  private pubClient: Redis;
  private subClient: Redis;

  constructor(httpServer: HttpServer) {
    this.pubClient = new Redis(process.env.REDIS_URL);
    this.subClient = this.pubClient.duplicate();

    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.ALLOWED_ORIGINS?.split(','),
        credentials: true,
      },
      adapter: createAdapter(this.pubClient, this.subClient),
      pingInterval: 25000,
      pingTimeout: 10000,
    });

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  private setupMiddleware(): void {
    // Authentication middleware
    this.io.use(async (socket, next) => {
      const token = socket.handshake.auth.token || socket.handshake.query.token;

      try {
        const user = await verifyToken(token as string);
        socket.data.user = user;
        next();
      } catch (error) {
        next(new Error('Authentication failed'));
      }
    });

    // Rate limiting middleware
    this.io.use(rateLimiter({
      maxEventsPerSecond: 10,
      maxSubscriptions: 50,
    }));
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket) => {
      const userId = socket.data.user.id;
      console.log(`[WS] User connected: ${userId}`);

      // Auto-join user's personal channel
      socket.join(`user:${userId}`);

      // Handle channel subscriptions
      socket.on('subscribe', async (channels: string[]) => {
        for (const channel of channels) {
          if (await this.canSubscribe(socket.data.user, channel)) {
            socket.join(channel);
            console.log(`[WS] ${userId} subscribed to ${channel}`);
          }
        }
      });

      socket.on('unsubscribe', (channels: string[]) => {
        for (const channel of channels) {
          socket.leave(channel);
        }
      });

      // Handle live scoring
      socket.on('score:update', async (data: ScoreUpdateInput) => {
        await this.handleScoreUpdate(socket.data.user, data);
      });

      // Handle game invites
      socket.on('game:invite', async (data: GameInviteInput) => {
        await this.handleGameInvite(socket.data.user, data);
      });

      socket.on('disconnect', () => {
        console.log(`[WS] User disconnected: ${userId}`);
      });
    });
  }

  private async canSubscribe(user: User, channel: string): Promise<boolean> {
    // Check permissions based on channel type
    const [type, id] = channel.split(':');

    switch (type) {
      case 'tournament':
        return this.checkTournamentAccess(user, id);
      case 'club':
        return this.checkClubAccess(user, id);
      case 'user':
        return id === user.id; // Can only subscribe to own user channel
      case 'game':
        return this.checkGameAccess(user, id);
      case 'global':
        return true; // Public channels
      default:
        return false;
    }
  }

  // Broadcast methods for external use
  broadcastToChannel(channel: string, event: string, data: unknown): void {
    this.io.to(channel).emit(event, {
      ...data,
      timestamp: Date.now(),
    });
  }

  broadcastToUser(userId: string, event: string, data: unknown): void {
    this.io.to(`user:${userId}`).emit(event, {
      ...data,
      timestamp: Date.now(),
    });
  }

  broadcastToTournament(tournamentId: string, event: string, data: unknown): void {
    this.io.to(`tournament:${tournamentId}`).emit(event, {
      ...data,
      timestamp: Date.now(),
    });
  }
}

export const realtimeServer = new RealtimeServer(httpServer);
```

---

## Part 2: Real-Time Features Implementation

### 2.1 Live Tournament Scores

```typescript
// /src/features/tournament/hooks/useLiveScoring.ts

interface LiveScoringState {
  matchId: string;
  team1Score: number;
  team2Score: number;
  gameScores: GameScore[];
  servingTeam: 1 | 2;
  serverNumber: 1 | 2;
  isConnected: boolean;
  lastUpdate: number;
}

function useLiveScoring(matchId: string) {
  const [state, setState] = useState<LiveScoringState | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const syncEngine = useSyncEngine();

  useEffect(() => {
    // Subscribe to live score updates
    const unsubscribe = connectionManager.subscribe(
      `game:${matchId}:score`,
      (update: ScoreUpdate) => {
        setState(prev => ({
          ...prev,
          ...update,
          lastUpdate: Date.now(),
        }));
      }
    );

    // Load initial state from cache or server
    syncEngine.getOrFetch(`match:${matchId}:score`).then(setState);

    return unsubscribe;
  }, [matchId]);

  const updateScore = useCallback(async (
    team: 1 | 2,
    pointType: 'point' | 'side_out'
  ) => {
    if (isSubmitting) return;

    // Optimistic update
    const optimisticState = calculateNewScore(state, team, pointType);
    setState(optimisticState);

    setIsSubmitting(true);
    try {
      // Send to server
      await syncEngine.pushUpdate({
        channel: `game:${matchId}:score`,
        data: optimisticState,
        conflictResolution: 'server_wins', // Server is authority for scores
      });
    } catch (error) {
      // Revert on failure
      syncEngine.getOrFetch(`match:${matchId}:score`).then(setState);
    } finally {
      setIsSubmitting(false);
    }
  }, [state, matchId, isSubmitting]);

  return {
    ...state,
    updateScore,
    isSubmitting,
    isOnline: useOnlineStatus(),
  };
}

// Score calculation logic
function calculateNewScore(
  current: LiveScoringState,
  scoringTeam: 1 | 2,
  type: 'point' | 'side_out'
): LiveScoringState {
  const newState = { ...current };

  if (type === 'point') {
    if (scoringTeam === 1) {
      newState.team1Score += 1;
    } else {
      newState.team2Score += 1;
    }

    // Check for game win (11 points, win by 2)
    const team1Win = newState.team1Score >= 11 &&
                     newState.team1Score - newState.team2Score >= 2;
    const team2Win = newState.team2Score >= 11 &&
                     newState.team2Score - newState.team1Score >= 2;

    if (team1Win || team2Win) {
      newState.gameScores.push({
        team1: newState.team1Score,
        team2: newState.team2Score,
      });
      // Reset for next game
      newState.team1Score = 0;
      newState.team2Score = 0;
    }
  } else if (type === 'side_out') {
    // Handle server/side switch logic for doubles
    if (newState.serverNumber === 2) {
      newState.servingTeam = newState.servingTeam === 1 ? 2 : 1;
      newState.serverNumber = 1;
    } else {
      newState.serverNumber = 2;
    }
  }

  return newState;
}
```

### 2.2 Match Notifications

```typescript
// /src/features/notifications/hooks/useNotifications.ts

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: number;
  data: Record<string, unknown>;
}

function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Subscribe to real-time notifications
    const unsubscribe = connectionManager.subscribe(
      `user:${user.id}:notifications`,
      (notification: NotificationPayload) => {
        // Add to list
        setNotifications(prev => [
          { ...notification, read: false },
          ...prev,
        ]);

        // Show browser notification if permitted
        showBrowserNotification(notification);

        // Play sound for high-priority
        if (notification.priority === 'urgent' || notification.priority === 'high') {
          playNotificationSound();
        }
      }
    );

    // Load initial notifications from cache
    loadCachedNotifications();

    return unsubscribe;
  }, [user?.id]);

  const markAsRead = useCallback(async (notificationId: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );

    await syncEngine.pushUpdate({
      type: 'notification:read',
      data: { notificationId },
    });
  }, []);

  const markAllAsRead = useCallback(async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));

    await syncEngine.pushUpdate({
      type: 'notifications:read_all',
      data: { userId: user.id },
    });
  }, [user?.id]);

  return {
    notifications,
    unreadCount: notifications.filter(n => !n.read).length,
    markAsRead,
    markAllAsRead,
  };
}

// Browser notification helper
async function showBrowserNotification(notification: NotificationPayload) {
  if (!('Notification' in window)) return;

  if (Notification.permission === 'granted') {
    new Notification(notification.title, {
      body: notification.body,
      icon: '/icons/notification-icon.png',
      badge: '/icons/badge-icon.png',
      tag: notification.id,
      data: notification.data,
    });
  } else if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      showBrowserNotification(notification);
    }
  }
}
```

### 2.3 Activity Feed Updates

```typescript
// /src/features/social/hooks/useActivityFeed.ts

interface ActivityFeedOptions {
  filter: 'all' | 'friends' | 'club';
  limit?: number;
}

function useActivityFeed(options: ActivityFeedOptions = { filter: 'all' }) {
  const [items, setItems] = useState<ActivityFeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const channel = options.filter === 'all'
      ? 'global:activity-feed'
      : options.filter === 'friends'
        ? `user:${user.id}:friend-activity`
        : `club:${user.activeClubId}:activity`;

    // Subscribe to real-time updates
    const unsubscribe = connectionManager.subscribe(channel, (item: ActivityFeedItem) => {
      setItems(prev => {
        // Deduplicate and add to front
        const filtered = prev.filter(i => i.id !== item.id);
        return [item, ...filtered].slice(0, options.limit || 50);
      });
    });

    // Load initial feed
    loadActivityFeed(options.filter).then(data => {
      setItems(data);
      setIsLoading(false);
    });

    return unsubscribe;
  }, [options.filter, user?.id]);

  const loadMore = useCallback(async () => {
    const lastItem = items[items.length - 1];
    const moreItems = await fetchActivityFeed({
      ...options,
      before: lastItem?.createdAt,
    });
    setItems(prev => [...prev, ...moreItems]);
  }, [items, options]);

  return {
    items,
    isLoading,
    loadMore,
  };
}
```

### 2.4 Game Invites

```typescript
// /src/features/games/hooks/useGameInvites.ts

function useGameInvites() {
  const [pendingInvites, setPendingInvites] = useState<GameInvitePayload[]>([]);
  const { user } = useAuth();
  const syncEngine = useSyncEngine();

  useEffect(() => {
    if (!user) return;

    // Subscribe to incoming invites
    const unsubscribe = connectionManager.subscribe(
      `user:${user.id}:game-invites`,
      (invite: GameInvitePayload) => {
        if (!invite.expiresAt || invite.expiresAt > Date.now()) {
          setPendingInvites(prev => [...prev, invite]);
        }
      }
    );

    // Load pending invites from cache
    syncEngine.getCached('game-invites').then(cached => {
      if (cached) {
        setPendingInvites(cached.filter(i => i.expiresAt > Date.now()));
      }
    });

    return unsubscribe;
  }, [user?.id]);

  const sendInvite = useCallback(async (
    targetUserId: string,
    options: { courtId?: string; scheduledTime?: Date; message?: string }
  ) => {
    const invite: GameInvitePayload = {
      id: generateId(),
      type: 'casual',
      fromUserId: user.id,
      fromUserName: user.name,
      courtId: options.courtId,
      scheduledTime: options.scheduledTime?.getTime(),
      expiresAt: Date.now() + (options.scheduledTime
        ? options.scheduledTime.getTime() - Date.now()
        : 24 * 60 * 60 * 1000), // 24 hours default
      message: options.message,
    };

    // Optimistic add to sent invites
    await syncEngine.pushUpdate({
      channel: `user:${targetUserId}:game-invites`,
      data: invite,
    });

    return invite;
  }, [user]);

  const respondToInvite = useCallback(async (
    inviteId: string,
    response: 'accept' | 'decline'
  ) => {
    const invite = pendingInvites.find(i => i.id === inviteId);
    if (!invite) return;

    // Remove from pending
    setPendingInvites(prev => prev.filter(i => i.id !== inviteId));

    // Send response
    await syncEngine.pushUpdate({
      channel: `user:${invite.fromUserId}:notifications`,
      data: {
        type: 'game_invite_response',
        inviteId,
        response,
        responderId: user.id,
        responderName: user.name,
      },
    });

    if (response === 'accept') {
      // Create game session
      return createGameSession(invite);
    }
  }, [pendingInvites, user]);

  return {
    pendingInvites,
    sendInvite,
    respondToInvite,
  };
}
```

---

## Part 3: Offline-First Strategy

### 3.1 Service Worker Architecture

```typescript
// /public/sw.ts (Service Worker)

import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute, NavigationRoute, Route } from 'workbox-routing';
import {
  NetworkFirst,
  CacheFirst,
  StaleWhileRevalidate,
  NetworkOnly
} from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { BackgroundSyncPlugin } from 'workbox-background-sync';

declare const self: ServiceWorkerGlobalScope;

// Precache static assets (auto-generated by build)
precacheAndRoute(self.__WB_MANIFEST);

// Clean up old caches
cleanupOutdatedCaches();

// Cache names
const CACHE_NAMES = {
  static: 'static-v1',
  pages: 'pages-v1',
  api: 'api-v1',
  images: 'images-v1',
  userData: 'user-data-v1',
};

// ============================================
// Strategy 1: Cache-First (Static Assets)
// ============================================
registerRoute(
  ({ request }) =>
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'font',
  new CacheFirst({
    cacheName: CACHE_NAMES.static,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
      }),
    ],
  })
);

// ============================================
// Strategy 2: Stale-While-Revalidate (Images)
// ============================================
registerRoute(
  ({ request }) => request.destination === 'image',
  new StaleWhileRevalidate({
    cacheName: CACHE_NAMES.images,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 200,
        maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
      }),
    ],
  })
);

// ============================================
// Strategy 3: Network-First (API - Critical Data)
// ============================================
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/') &&
    (url.pathname.includes('/games/') ||
     url.pathname.includes('/tournaments/') ||
     url.pathname.includes('/scores/')),
  new NetworkFirst({
    cacheName: CACHE_NAMES.api,
    networkTimeoutSeconds: 5,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 500,
        maxAgeSeconds: 24 * 60 * 60, // 24 hours
      }),
    ],
  })
);

// ============================================
// Strategy 4: Stale-While-Revalidate (API - Non-Critical)
// ============================================
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/') &&
    (url.pathname.includes('/courts/') ||
     url.pathname.includes('/users/') ||
     url.pathname.includes('/clubs/')),
  new StaleWhileRevalidate({
    cacheName: CACHE_NAMES.userData,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 300,
        maxAgeSeconds: 12 * 60 * 60, // 12 hours
      }),
    ],
  })
);

// ============================================
// Strategy 5: Network-Only with Background Sync (Mutations)
// ============================================
const syncPlugin = new BackgroundSyncPlugin('syncQueue', {
  maxRetentionTime: 24 * 60, // Retry for 24 hours
  onSync: async ({ queue }) => {
    let entry;
    while ((entry = await queue.shiftRequest())) {
      try {
        await fetch(entry.request.clone());
        // Notify client of successful sync
        self.clients.matchAll().then(clients => {
          clients.forEach(client => {
            client.postMessage({
              type: 'SYNC_SUCCESS',
              url: entry.request.url,
            });
          });
        });
      } catch (error) {
        // Re-queue on failure
        await queue.unshiftRequest(entry);
        throw error;
      }
    }
  },
});

registerRoute(
  ({ url, request }) =>
    url.pathname.startsWith('/api/') &&
    (request.method === 'POST' ||
     request.method === 'PUT' ||
     request.method === 'PATCH' ||
     request.method === 'DELETE'),
  new NetworkOnly({
    plugins: [syncPlugin],
  }),
  'POST'
);

// ============================================
// Strategy 6: Navigation (App Shell)
// ============================================
const navigationRoute = new NavigationRoute(
  new NetworkFirst({
    cacheName: CACHE_NAMES.pages,
    networkTimeoutSeconds: 3,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  }),
  {
    // Exclude specific routes from offline caching
    denylist: [
      /\/api\//,
      /\/admin\//,
    ],
  }
);
registerRoute(navigationRoute);

// ============================================
// Offline Fallback Page
// ============================================
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/offline.html') ||
               new Response('You are offline', { status: 503 });
      })
    );
  }
});

// ============================================
// Push Notifications
// ============================================
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();

  const options: NotificationOptions = {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: data.data,
    actions: data.actions,
    tag: data.tag || 'default',
    renotify: true,
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // Focus existing window or open new one
        const existingClient = windowClients.find(
          (client) => client.url === urlToOpen
        );

        if (existingClient) {
          return existingClient.focus();
        }

        return self.clients.openWindow(urlToOpen);
      })
  );
});
```

### 3.2 IndexedDB Schema

```typescript
// /src/lib/offline/database.ts

import Dexie, { Table } from 'dexie';

// Define database schema
interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  duprRating?: number;
  selfRating?: number;
  location?: { lat: number; lng: number };
  preferences: UserPreferences;
  stats: UserStats;
  lastSynced: number;
}

interface Game {
  id: string;
  type: 'singles' | 'doubles';
  format: 'casual' | 'league' | 'tournament';
  players: string[];
  team1: string[];
  team2: string[];
  scores: GameScore[];
  winner: 1 | 2 | null;
  courtId?: string;
  startedAt: number;
  completedAt?: number;
  verified: boolean;
  synced: boolean;
  localOnly: boolean;
}

interface Court {
  id: string;
  name: string;
  address: string;
  location: { lat: number; lng: number };
  type: 'indoor' | 'outdoor' | 'both';
  surface: string;
  amenities: string[];
  rating: number;
  images: string[];
  lastUpdated: number;
}

interface Friend {
  id: string;
  name: string;
  avatar?: string;
  duprRating?: number;
  lastPlayed?: number;
  gamesPlayed: number;
}

interface Tournament {
  id: string;
  name: string;
  startDate: number;
  endDate: number;
  location: string;
  format: string;
  divisions: Division[];
  brackets: Bracket[];
  myMatches: Match[];
  lastSynced: number;
}

interface League {
  id: string;
  name: string;
  clubId?: string;
  standings: Standing[];
  schedule: LeagueMatch[];
  myMatches: LeagueMatch[];
  lastSynced: number;
}

interface SyncQueueItem {
  id: string;
  operation: 'create' | 'update' | 'delete';
  entityType: string;
  entityId: string;
  data: unknown;
  timestamp: number;
  retryCount: number;
  lastError?: string;
}

interface CacheMetadata {
  key: string;
  version: number;
  expiresAt: number;
  etag?: string;
}

// Dexie database class
class PickleballDB extends Dexie {
  users!: Table<User, string>;
  games!: Table<Game, string>;
  courts!: Table<Court, string>;
  friends!: Table<Friend, string>;
  tournaments!: Table<Tournament, string>;
  leagues!: Table<League, string>;
  syncQueue!: Table<SyncQueueItem, string>;
  cacheMetadata!: Table<CacheMetadata, string>;

  constructor() {
    super('PickleballDB');

    this.version(1).stores({
      users: 'id, email, name, lastSynced',
      games: 'id, type, format, *players, startedAt, completedAt, synced, localOnly',
      courts: 'id, name, [location.lat+location.lng], type, lastUpdated',
      friends: 'id, name, lastPlayed',
      tournaments: 'id, name, startDate, endDate, lastSynced',
      leagues: 'id, name, clubId, lastSynced',
      syncQueue: 'id, entityType, entityId, timestamp, retryCount',
      cacheMetadata: 'key, version, expiresAt',
    });
  }
}

export const db = new PickleballDB();

// Database operations
export const offlineDB = {
  // User operations
  async getCurrentUser(): Promise<User | undefined> {
    return db.users.toCollection().first();
  },

  async updateUser(user: Partial<User> & { id: string }): Promise<void> {
    await db.users.put({ ...user, lastSynced: Date.now() } as User);
  },

  // Game operations
  async addGame(game: Game): Promise<string> {
    game.synced = false;
    game.localOnly = true;
    await db.games.add(game);
    await this.queueSync('create', 'game', game.id, game);
    return game.id;
  },

  async getRecentGames(limit = 20): Promise<Game[]> {
    return db.games
      .orderBy('startedAt')
      .reverse()
      .limit(limit)
      .toArray();
  },

  async getUnsyncedGames(): Promise<Game[]> {
    return db.games.where('synced').equals(0).toArray();
  },

  async markGameSynced(gameId: string): Promise<void> {
    await db.games.update(gameId, { synced: true, localOnly: false });
  },

  // Court operations
  async getCourtsNearby(lat: number, lng: number, radiusKm: number): Promise<Court[]> {
    // Simple bounding box query, refined in memory
    const latRange = radiusKm / 111; // Rough km to degrees
    const lngRange = radiusKm / (111 * Math.cos(lat * Math.PI / 180));

    const courts = await db.courts
      .where('[location.lat+location.lng]')
      .between(
        [lat - latRange, lng - lngRange],
        [lat + latRange, lng + lngRange]
      )
      .toArray();

    // Filter by actual distance
    return courts.filter(court => {
      const dist = haversineDistance(lat, lng, court.location.lat, court.location.lng);
      return dist <= radiusKm;
    });
  },

  async updateCourts(courts: Court[]): Promise<void> {
    await db.courts.bulkPut(courts.map(c => ({
      ...c,
      lastUpdated: Date.now(),
    })));
  },

  // Friends operations
  async getFriends(): Promise<Friend[]> {
    return db.friends.orderBy('name').toArray();
  },

  async updateFriends(friends: Friend[]): Promise<void> {
    await db.friends.bulkPut(friends);
  },

  // Tournament operations
  async getActiveTournaments(): Promise<Tournament[]> {
    const now = Date.now();
    return db.tournaments
      .where('endDate')
      .above(now)
      .toArray();
  },

  async getTournament(id: string): Promise<Tournament | undefined> {
    return db.tournaments.get(id);
  },

  // Sync queue operations
  async queueSync(
    operation: 'create' | 'update' | 'delete',
    entityType: string,
    entityId: string,
    data: unknown
  ): Promise<void> {
    await db.syncQueue.add({
      id: `${entityType}-${entityId}-${Date.now()}`,
      operation,
      entityType,
      entityId,
      data,
      timestamp: Date.now(),
      retryCount: 0,
    });
  },

  async getPendingSyncs(): Promise<SyncQueueItem[]> {
    return db.syncQueue.orderBy('timestamp').toArray();
  },

  async removeSyncItem(id: string): Promise<void> {
    await db.syncQueue.delete(id);
  },

  async incrementSyncRetry(id: string, error: string): Promise<void> {
    const item = await db.syncQueue.get(id);
    if (item) {
      await db.syncQueue.update(id, {
        retryCount: item.retryCount + 1,
        lastError: error,
      });
    }
  },

  // Cache metadata
  async getCacheVersion(key: string): Promise<number | undefined> {
    const meta = await db.cacheMetadata.get(key);
    return meta?.version;
  },

  async setCacheMetadata(key: string, version: number, ttlSeconds: number): Promise<void> {
    await db.cacheMetadata.put({
      key,
      version,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  },

  // Clear all data (for logout)
  async clearAll(): Promise<void> {
    await Promise.all([
      db.users.clear(),
      db.games.clear(),
      db.courts.clear(),
      db.friends.clear(),
      db.tournaments.clear(),
      db.leagues.clear(),
      db.syncQueue.clear(),
      db.cacheMetadata.clear(),
    ]);
  },
};
```

### 3.3 What to Cache Offline

| Data Type | Cache Strategy | TTL | Priority |
|-----------|---------------|-----|----------|
| **User Profile** | Cache-first, sync on focus | 1 hour | Critical |
| **Recent Games** | IndexedDB + network-first | 24 hours | Critical |
| **Court Data** | Stale-while-revalidate | 12 hours | High |
| **Friends List** | Cache-first, background sync | 4 hours | High |
| **Active Tournaments** | Network-first, fallback cache | 1 hour | High |
| **League Standings** | Network-first, fallback cache | 2 hours | Medium |
| **Club Schedule** | Stale-while-revalidate | 6 hours | Medium |
| **User Preferences** | Cache-first | Indefinite | Critical |
| **Static Assets** | Cache-first | 30 days | Critical |
| **Images/Avatars** | Stale-while-revalidate | 7 days | Low |

---

## Part 4: Sync Engine Design

### 4.1 Core Sync Engine

```typescript
// /src/lib/sync/SyncEngine.ts

import { offlineDB } from '../offline/database';
import { connectionManager } from '../realtime/ConnectionManager';

interface SyncOptions {
  conflictResolution: 'client_wins' | 'server_wins' | 'merge' | 'manual';
  priority: 'immediate' | 'background' | 'low';
}

interface SyncResult {
  success: boolean;
  conflicts?: ConflictItem[];
  synced: number;
  failed: number;
}

interface ConflictItem {
  entityType: string;
  entityId: string;
  localVersion: unknown;
  serverVersion: unknown;
  localTimestamp: number;
  serverTimestamp: number;
}

class SyncEngine {
  private syncInProgress = false;
  private syncQueue: Map<string, SyncQueueItem> = new Map();
  private conflictHandlers: Map<string, ConflictHandler> = new Map();
  private retryBackoff = [1000, 5000, 15000, 30000, 60000]; // Retry delays

  constructor() {
    // Listen for online status changes
    window.addEventListener('online', () => this.onOnline());

    // Listen for service worker sync events
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', this.handleSWMessage);
    }

    // Register for periodic background sync
    this.registerBackgroundSync();
  }

  // Register conflict handlers for different entity types
  registerConflictHandler(entityType: string, handler: ConflictHandler): void {
    this.conflictHandlers.set(entityType, handler);
  }

  // Optimistic update with sync
  async pushUpdate(update: {
    channel?: string;
    type?: string;
    data: unknown;
    conflictResolution?: SyncOptions['conflictResolution'];
  }): Promise<void> {
    const { channel, type, data, conflictResolution = 'server_wins' } = update;

    // 1. Apply locally immediately (optimistic)
    await this.applyLocally(type || channel, data);

    // 2. Check connectivity
    if (navigator.onLine) {
      try {
        // 3. Send to server
        await this.sendToServer(type || channel, data);
      } catch (error) {
        // 4. Queue for later sync
        await this.queueForSync(type || channel, data);
      }
    } else {
      // Queue for sync when online
      await this.queueForSync(type || channel, data);
    }
  }

  // Get data with cache fallback
  async getOrFetch<T>(key: string, fetcher?: () => Promise<T>): Promise<T | null> {
    // 1. Try cache first
    const cached = await this.getFromCache<T>(key);

    if (cached && !this.isStale(key)) {
      // Return cached, but revalidate in background
      if (navigator.onLine && fetcher) {
        this.revalidateInBackground(key, fetcher);
      }
      return cached;
    }

    // 2. Fetch fresh if online
    if (navigator.onLine && fetcher) {
      try {
        const fresh = await fetcher();
        await this.saveToCache(key, fresh);
        return fresh;
      } catch (error) {
        // Fall back to stale cache
        if (cached) return cached;
        throw error;
      }
    }

    // 3. Return stale cache if offline
    return cached;
  }

  // Full sync operation
  async syncAll(): Promise<SyncResult> {
    if (this.syncInProgress) {
      console.log('[Sync] Already in progress, skipping');
      return { success: false, synced: 0, failed: 0 };
    }

    if (!navigator.onLine) {
      console.log('[Sync] Offline, skipping');
      return { success: false, synced: 0, failed: 0 };
    }

    this.syncInProgress = true;
    const result: SyncResult = { success: true, synced: 0, failed: 0, conflicts: [] };

    try {
      // 1. Get pending sync items
      const pendingItems = await offlineDB.getPendingSyncs();
      console.log(`[Sync] Processing ${pendingItems.length} pending items`);

      // 2. Process each item
      for (const item of pendingItems) {
        try {
          const syncResult = await this.syncItem(item);

          if (syncResult.conflict) {
            result.conflicts!.push(syncResult.conflict);
          } else if (syncResult.success) {
            result.synced++;
            await offlineDB.removeSyncItem(item.id);
          } else {
            result.failed++;
            await offlineDB.incrementSyncRetry(item.id, syncResult.error || 'Unknown error');
          }
        } catch (error) {
          result.failed++;
          await offlineDB.incrementSyncRetry(
            item.id,
            error instanceof Error ? error.message : 'Unknown error'
          );
        }
      }

      // 3. Pull fresh data from server
      await this.pullLatest();

      // 4. Handle any conflicts
      if (result.conflicts!.length > 0) {
        await this.handleConflicts(result.conflicts!);
      }

      result.success = result.failed === 0;
      return result;

    } finally {
      this.syncInProgress = false;
    }
  }

  private async syncItem(item: SyncQueueItem): Promise<{
    success: boolean;
    conflict?: ConflictItem;
    error?: string;
  }> {
    const endpoint = this.getEndpointForEntity(item.entityType);

    try {
      switch (item.operation) {
        case 'create':
          await api.post(endpoint, item.data);
          break;
        case 'update':
          const response = await api.put(`${endpoint}/${item.entityId}`, {
            ...item.data,
            _localTimestamp: item.timestamp,
          });

          // Check for conflict
          if (response.status === 409) {
            return {
              success: false,
              conflict: {
                entityType: item.entityType,
                entityId: item.entityId,
                localVersion: item.data,
                serverVersion: response.data.serverVersion,
                localTimestamp: item.timestamp,
                serverTimestamp: response.data.serverTimestamp,
              },
            };
          }
          break;
        case 'delete':
          await api.delete(`${endpoint}/${item.entityId}`);
          break;
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async handleConflicts(conflicts: ConflictItem[]): Promise<void> {
    for (const conflict of conflicts) {
      const handler = this.conflictHandlers.get(conflict.entityType);

      if (handler) {
        await handler.resolve(conflict);
      } else {
        // Default: server wins
        await this.applyServerVersion(conflict);
      }
    }
  }

  private onOnline(): void {
    console.log('[Sync] Back online, triggering sync');
    this.syncAll();
  }

  private async registerBackgroundSync(): Promise<void> {
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      const registration = await navigator.serviceWorker.ready;
      try {
        await registration.sync.register('sync-data');
        console.log('[Sync] Background sync registered');
      } catch (error) {
        console.warn('[Sync] Background sync not supported:', error);
      }
    }
  }

  // Exposed methods for components
  async getCached<T>(key: string): Promise<T | null> {
    return this.getFromCache<T>(key);
  }

  isOnline(): boolean {
    return navigator.onLine;
  }

  getPendingSyncCount(): Promise<number> {
    return offlineDB.getPendingSyncs().then(items => items.length);
  }
}

export const syncEngine = new SyncEngine();
```

### 4.2 Conflict Resolution Strategies

```typescript
// /src/lib/sync/ConflictResolver.ts

interface ConflictHandler {
  resolve(conflict: ConflictItem): Promise<void>;
}

// ============================================
// Strategy 1: Last-Write-Wins (Simple)
// ============================================
class LastWriteWinsResolver implements ConflictHandler {
  async resolve(conflict: ConflictItem): Promise<void> {
    if (conflict.localTimestamp > conflict.serverTimestamp) {
      // Local is newer, push to server
      await api.put(
        `/${conflict.entityType}s/${conflict.entityId}`,
        conflict.localVersion,
        { headers: { 'X-Force-Overwrite': 'true' } }
      );
    } else {
      // Server is newer, update local
      await offlineDB[conflict.entityType].put(conflict.serverVersion);
    }
  }
}

// ============================================
// Strategy 2: Merge (For complex objects)
// ============================================
class MergeResolver implements ConflictHandler {
  async resolve(conflict: ConflictItem): Promise<void> {
    const merged = this.deepMerge(
      conflict.serverVersion as Record<string, unknown>,
      conflict.localVersion as Record<string, unknown>,
      conflict.serverTimestamp,
      conflict.localTimestamp
    );

    // Update both local and server
    await offlineDB[conflict.entityType].put(merged);
    await api.put(`/${conflict.entityType}s/${conflict.entityId}`, merged);
  }

  private deepMerge(
    server: Record<string, unknown>,
    local: Record<string, unknown>,
    serverTimestamp: number,
    localTimestamp: number
  ): Record<string, unknown> {
    const result: Record<string, unknown> = { ...server };

    for (const key of Object.keys(local)) {
      if (!(key in server)) {
        // Local has new field
        result[key] = local[key];
      } else if (typeof local[key] === 'object' && typeof server[key] === 'object') {
        // Recurse for nested objects
        result[key] = this.deepMerge(
          server[key] as Record<string, unknown>,
          local[key] as Record<string, unknown>,
          serverTimestamp,
          localTimestamp
        );
      } else if (local[key] !== server[key]) {
        // Conflict: use newer value
        result[key] = localTimestamp > serverTimestamp ? local[key] : server[key];
      }
    }

    return result;
  }
}

// ============================================
// Strategy 3: Game Score Conflict Resolution
// ============================================
class GameScoreResolver implements ConflictHandler {
  async resolve(conflict: ConflictItem): Promise<void> {
    const localGame = conflict.localVersion as Game;
    const serverGame = conflict.serverVersion as Game;

    // For game scores, we need special handling
    // If both have scores, prefer the verified one
    if (localGame.verified && !serverGame.verified) {
      await api.put(`/games/${conflict.entityId}`, localGame, {
        headers: { 'X-Force-Overwrite': 'true' },
      });
    } else if (serverGame.verified && !localGame.verified) {
      await offlineDB.games.put(serverGame);
    } else if (this.scoresMatch(localGame, serverGame)) {
      // Scores match, merge metadata
      const merged = { ...serverGame, ...localGame, scores: serverGame.scores };
      await offlineDB.games.put(merged);
    } else {
      // Scores differ, need manual resolution
      await this.createScoreDispute(conflict);
    }
  }

  private scoresMatch(game1: Game, game2: Game): boolean {
    if (game1.scores.length !== game2.scores.length) return false;
    return game1.scores.every((score, i) =>
      score.team1 === game2.scores[i].team1 &&
      score.team2 === game2.scores[i].team2
    );
  }

  private async createScoreDispute(conflict: ConflictItem): Promise<void> {
    // Create a dispute record for manual resolution
    await api.post('/disputes', {
      type: 'score_conflict',
      gameId: conflict.entityId,
      localVersion: conflict.localVersion,
      serverVersion: conflict.serverVersion,
      status: 'pending',
    });

    // Notify players
    const game = conflict.serverVersion as Game;
    for (const playerId of game.players) {
      await connectionManager.send(`user:${playerId}:notifications`, {
        type: 'score_dispute',
        gameId: conflict.entityId,
        message: 'There was a conflict logging this game. Please verify the score.',
      });
    }
  }
}

// ============================================
// Strategy 4: User Resolution (UI-based)
// ============================================
class UserResolutionResolver implements ConflictHandler {
  private pendingConflicts: Map<string, ConflictItem> = new Map();
  private resolvers: Map<string, (choice: 'local' | 'server' | 'merge') => void> = new Map();

  async resolve(conflict: ConflictItem): Promise<void> {
    const key = `${conflict.entityType}:${conflict.entityId}`;
    this.pendingConflicts.set(key, conflict);

    // Emit event for UI to handle
    window.dispatchEvent(new CustomEvent('conflict:detected', {
      detail: conflict,
    }));

    // Wait for user resolution
    return new Promise((resolve) => {
      this.resolvers.set(key, async (choice) => {
        switch (choice) {
          case 'local':
            await api.put(
              `/${conflict.entityType}s/${conflict.entityId}`,
              conflict.localVersion,
              { headers: { 'X-Force-Overwrite': 'true' } }
            );
            break;
          case 'server':
            await offlineDB[conflict.entityType].put(conflict.serverVersion);
            break;
          case 'merge':
            // UI would provide merged version
            break;
        }

        this.pendingConflicts.delete(key);
        this.resolvers.delete(key);
        resolve();
      });
    });
  }

  // Called from UI when user makes choice
  userResolve(entityType: string, entityId: string, choice: 'local' | 'server' | 'merge'): void {
    const key = `${entityType}:${entityId}`;
    const resolver = this.resolvers.get(key);
    if (resolver) {
      resolver(choice);
    }
  }

  getPendingConflicts(): ConflictItem[] {
    return Array.from(this.pendingConflicts.values());
  }
}

// Register handlers
syncEngine.registerConflictHandler('game', new GameScoreResolver());
syncEngine.registerConflictHandler('user', new MergeResolver());
syncEngine.registerConflictHandler('default', new LastWriteWinsResolver());
```

### 4.3 Sync Queue Management

```typescript
// /src/lib/sync/SyncQueue.ts

class SyncQueue {
  private maxRetries = 5;
  private isProcessing = false;

  async add(item: Omit<SyncQueueItem, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
    const queueItem: SyncQueueItem = {
      id: generateId(),
      ...item,
      timestamp: Date.now(),
      retryCount: 0,
    };

    await offlineDB.syncQueue.add(queueItem);

    // Process immediately if online
    if (navigator.onLine) {
      this.processQueue();
    }
  }

  async processQueue(): Promise<void> {
    if (this.isProcessing || !navigator.onLine) return;

    this.isProcessing = true;

    try {
      const items = await offlineDB.getPendingSyncs();

      // Sort by timestamp (FIFO) but prioritize low retry counts
      items.sort((a, b) => {
        if (a.retryCount !== b.retryCount) {
          return a.retryCount - b.retryCount;
        }
        return a.timestamp - b.timestamp;
      });

      for (const item of items) {
        if (item.retryCount >= this.maxRetries) {
          // Max retries exceeded, move to dead letter queue
          await this.moveToDeadLetter(item);
          continue;
        }

        try {
          await this.processItem(item);
          await offlineDB.removeSyncItem(item.id);

          // Emit success event
          window.dispatchEvent(new CustomEvent('sync:item:success', {
            detail: { entityType: item.entityType, entityId: item.entityId },
          }));
        } catch (error) {
          // Increment retry count with exponential backoff
          const nextRetry = Date.now() + this.getBackoffDelay(item.retryCount);
          await db.syncQueue.update(item.id, {
            retryCount: item.retryCount + 1,
            lastError: error instanceof Error ? error.message : 'Unknown error',
            nextRetryAt: nextRetry,
          });
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private getBackoffDelay(retryCount: number): number {
    // Exponential backoff: 1s, 2s, 4s, 8s, 16s (capped)
    const baseDelay = 1000;
    const maxDelay = 60000;
    const delay = baseDelay * Math.pow(2, retryCount);
    return Math.min(delay + Math.random() * 1000, maxDelay);
  }

  private async moveToDeadLetter(item: SyncQueueItem): Promise<void> {
    // Store failed items for later investigation
    await db.deadLetterQueue.add({
      ...item,
      movedAt: Date.now(),
    });
    await offlineDB.removeSyncItem(item.id);

    // Notify user
    window.dispatchEvent(new CustomEvent('sync:item:failed', {
      detail: { entityType: item.entityType, entityId: item.entityId },
    }));
  }

  async getQueueStatus(): Promise<{
    pending: number;
    processing: boolean;
    deadLetter: number;
  }> {
    const pending = await offlineDB.getPendingSyncs();
    const deadLetter = await db.deadLetterQueue.count();

    return {
      pending: pending.length,
      processing: this.isProcessing,
      deadLetter,
    };
  }

  async retryDeadLetterItem(itemId: string): Promise<void> {
    const item = await db.deadLetterQueue.get(itemId);
    if (item) {
      await this.add({
        operation: item.operation,
        entityType: item.entityType,
        entityId: item.entityId,
        data: item.data,
      });
      await db.deadLetterQueue.delete(itemId);
    }
  }
}

export const syncQueue = new SyncQueue();
```

---

## Part 5: Conflict Scenarios and Resolution

### 5.1 Scenario: Two Players Log Different Scores for Same Game

**Problem**: Player A logs Team 1 winning 11-8, Player B logs Team 2 winning 11-9.

**Resolution Flow**:

```typescript
// /src/features/games/services/ScoreVerificationService.ts

class ScoreVerificationService {
  async submitScore(gameId: string, score: GameScore, submitterId: string): Promise<void> {
    // Check if score already submitted
    const existingSubmissions = await api.get(`/games/${gameId}/score-submissions`);

    if (existingSubmissions.length === 0) {
      // First submission
      await api.post(`/games/${gameId}/score-submissions`, {
        score,
        submitterId,
        timestamp: Date.now(),
      });
    } else {
      // Compare with existing
      const existing = existingSubmissions[0];

      if (this.scoresMatch(existing.score, score)) {
        // Scores match - verify and finalize
        await api.post(`/games/${gameId}/verify`, {
          score,
          verifiedBy: [existing.submitterId, submitterId],
        });
      } else {
        // Scores conflict - create dispute
        await this.createScoreDispute(gameId, existing, { score, submitterId });
      }
    }
  }

  private async createScoreDispute(
    gameId: string,
    submission1: ScoreSubmission,
    submission2: ScoreSubmission
  ): Promise<void> {
    const dispute = await api.post('/disputes', {
      type: 'score_mismatch',
      gameId,
      submissions: [submission1, submission2],
      status: 'pending',
      createdAt: Date.now(),
    });

    // Get all players in the game
    const game = await api.get(`/games/${gameId}`);

    // Notify all players to resolve
    for (const playerId of game.players) {
      await connectionManager.send(`user:${playerId}:notifications`, {
        type: 'score_dispute',
        disputeId: dispute.id,
        gameId,
        title: 'Score Verification Needed',
        body: 'Players submitted different scores. Please verify.',
        actions: [
          { action: 'view_dispute', title: 'Review Scores' },
        ],
      });
    }
  }

  async resolveDispute(disputeId: string, resolution: {
    finalScore: GameScore;
    approvedBy: string[];
  }): Promise<void> {
    // Require majority approval (3 of 4 players for doubles)
    const dispute = await api.get(`/disputes/${disputeId}`);
    const game = await api.get(`/games/${dispute.gameId}`);

    const requiredApprovals = Math.ceil(game.players.length / 2) + 1;

    if (resolution.approvedBy.length >= requiredApprovals) {
      // Apply the approved score
      await api.put(`/games/${dispute.gameId}`, {
        scores: [resolution.finalScore],
        verified: true,
        verifiedBy: resolution.approvedBy,
      });

      // Close dispute
      await api.put(`/disputes/${disputeId}`, {
        status: 'resolved',
        resolution,
        resolvedAt: Date.now(),
      });

      // Submit to DUPR if applicable
      if (game.submitToDupr) {
        await this.submitToDupr(dispute.gameId, resolution.finalScore);
      }
    }
  }
}
```

### 5.2 Scenario: User Edits Profile Offline

**Problem**: User updates name offline, but someone else views cached version.

**Resolution**: Last-write-wins with version tracking.

```typescript
// Profile sync with optimistic locking

interface UserProfile {
  id: string;
  name: string;
  bio: string;
  avatar: string;
  _version: number;  // Optimistic locking
  _lastModified: number;
}

async function updateProfile(updates: Partial<UserProfile>): Promise<void> {
  const current = await offlineDB.users.get(userId);

  const updated: UserProfile = {
    ...current,
    ...updates,
    _version: (current?._version || 0) + 1,
    _lastModified: Date.now(),
  };

  // Update local immediately
  await offlineDB.users.put(updated);

  // Queue sync with version for conflict detection
  await syncQueue.add({
    operation: 'update',
    entityType: 'user',
    entityId: userId,
    data: updated,
  });
}

// Server handles version check
app.put('/api/users/:id', async (req, res) => {
  const { _version, ...updates } = req.body;
  const current = await db.users.findById(req.params.id);

  if (current._version > _version) {
    // Conflict: someone else updated
    return res.status(409).json({
      error: 'VERSION_CONFLICT',
      serverVersion: current,
      yourVersion: req.body,
    });
  }

  // Safe to update
  await db.users.update(req.params.id, {
    ...updates,
    _version: _version + 1,
  });

  res.json({ success: true });
});
```

### 5.3 Scenario: Tournament Bracket Updated While Director Offline

**Problem**: Tournament director updates bracket offline, but matches have already started.

**Resolution**: Server authority with merge where possible.

```typescript
// Tournament bracket sync service

class BracketSyncService {
  async syncBracketChanges(
    tournamentId: string,
    localChanges: BracketChange[]
  ): Promise<SyncResult> {
    // Get current server state
    const serverBracket = await api.get(`/tournaments/${tournamentId}/bracket`);
    const serverMatches = await api.get(`/tournaments/${tournamentId}/matches`);

    const results: SyncResult = {
      applied: [],
      rejected: [],
      conflicts: [],
    };

    for (const change of localChanges) {
      const match = serverMatches.find(m => m.id === change.matchId);

      if (!match) {
        // Match was deleted server-side
        results.rejected.push({
          change,
          reason: 'Match no longer exists',
        });
        continue;
      }

      if (match.status === 'completed' || match.status === 'in_progress') {
        // Can't modify active/completed matches
        results.rejected.push({
          change,
          reason: `Match is ${match.status}`,
        });
        continue;
      }

      if (match._version > change.baseVersion) {
        // Someone else modified this match
        results.conflicts.push({
          change,
          serverVersion: match,
        });
        continue;
      }

      // Safe to apply
      results.applied.push(change);
    }

    // Apply safe changes
    if (results.applied.length > 0) {
      await api.post(`/tournaments/${tournamentId}/bracket/batch-update`, {
        changes: results.applied,
      });
    }

    return results;
  }
}
```

### 5.4 Scenario: Club Schedule Changed While Member Offline

**Problem**: Member RSVPs to event that was canceled or rescheduled.

**Resolution**: Server-authoritative with notification of changes.

```typescript
// Club schedule sync with change detection

async function syncClubSchedule(clubId: string): Promise<void> {
  const localSchedule = await offlineDB.clubs.get(clubId).schedule;
  const serverSchedule = await api.get(`/clubs/${clubId}/schedule`);

  // Find events that changed
  const changes: ScheduleChange[] = [];

  for (const localEvent of localSchedule) {
    const serverEvent = serverSchedule.find(e => e.id === localEvent.id);

    if (!serverEvent) {
      // Event was deleted
      changes.push({
        type: 'deleted',
        event: localEvent,
        userAction: localEvent.userRsvp,
      });
    } else if (serverEvent._version > localEvent._version) {
      // Event was modified
      const significantChanges = detectSignificantChanges(localEvent, serverEvent);
      if (significantChanges.length > 0) {
        changes.push({
          type: 'modified',
          event: serverEvent,
          changes: significantChanges,
          userAction: localEvent.userRsvp,
        });
      }
    }
  }

  // Update local cache
  await offlineDB.clubs.update(clubId, { schedule: serverSchedule });

  // Notify user of relevant changes
  if (changes.length > 0) {
    const affectingUser = changes.filter(c => c.userAction);

    if (affectingUser.length > 0) {
      window.dispatchEvent(new CustomEvent('schedule:changes', {
        detail: { changes: affectingUser },
      }));
    }
  }
}

function detectSignificantChanges(local: Event, server: Event): string[] {
  const changes: string[] = [];

  if (local.startTime !== server.startTime) {
    changes.push(`Time changed from ${formatTime(local.startTime)} to ${formatTime(server.startTime)}`);
  }
  if (local.status === 'active' && server.status === 'canceled') {
    changes.push('Event was canceled');
  }
  if (local.courtId !== server.courtId) {
    changes.push('Court assignment changed');
  }

  return changes;
}
```

---

## Part 6: Implementation Details

### 6.1 Recommended Libraries

| Library | Purpose | Why |
|---------|---------|-----|
| **Workbox** | Service Worker | Google-maintained, comprehensive caching strategies |
| **Dexie.js** | IndexedDB | Clean API, TypeScript support, reactive queries |
| **Socket.io** | WebSocket | Auto-reconnection, fallback transports, rooms |
| **ioredis** | Redis client | Pub/sub for multi-server sync |
| **@tanstack/query** | Data fetching | Built-in caching, offline support, mutations |
| **zustand** | State management | Lightweight, persist middleware |
| **idb-keyval** | Simple KV storage | When Dexie is overkill |
| **localforage** | Storage abstraction | Fallback for older browsers |

### 6.2 Network Status Detection

```typescript
// /src/hooks/useNetworkStatus.ts

interface NetworkStatus {
  isOnline: boolean;
  effectiveType: 'slow-2g' | '2g' | '3g' | '4g' | 'unknown';
  downlink: number;
  rtt: number;
  saveData: boolean;
}

function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>(() => getNetworkStatus());

  useEffect(() => {
    const handleOnline = () => setStatus(prev => ({ ...prev, isOnline: true }));
    const handleOffline = () => setStatus(prev => ({ ...prev, isOnline: false }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Network Information API (if available)
    const connection = (navigator as any).connection;
    if (connection) {
      const handleChange = () => setStatus(getNetworkStatus());
      connection.addEventListener('change', handleChange);
      return () => {
        connection.removeEventListener('change', handleChange);
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return status;
}

function getNetworkStatus(): NetworkStatus {
  const connection = (navigator as any).connection;

  return {
    isOnline: navigator.onLine,
    effectiveType: connection?.effectiveType || 'unknown',
    downlink: connection?.downlink || 0,
    rtt: connection?.rtt || 0,
    saveData: connection?.saveData || false,
  };
}

// Usage example with adaptive behavior
function useCachingStrategy() {
  const { effectiveType, saveData } = useNetworkStatus();

  return useMemo(() => {
    if (saveData || effectiveType === 'slow-2g' || effectiveType === '2g') {
      return 'cache-first'; // Prioritize cached data on slow connections
    }
    if (effectiveType === '3g') {
      return 'stale-while-revalidate';
    }
    return 'network-first';
  }, [effectiveType, saveData]);
}
```

### 6.3 Sync Status Indicators (UI)

```typescript
// /src/components/SyncStatus.tsx

interface SyncStatusProps {
  showDetails?: boolean;
}

function SyncStatus({ showDetails = false }: SyncStatusProps) {
  const { isOnline, effectiveType } = useNetworkStatus();
  const [syncStatus, setSyncStatus] = useState<{
    pending: number;
    lastSync: number | null;
    isSyncing: boolean;
    errors: number;
  }>({
    pending: 0,
    lastSync: null,
    isSyncing: false,
    errors: 0,
  });

  useEffect(() => {
    const updateStatus = async () => {
      const queueStatus = await syncQueue.getQueueStatus();
      setSyncStatus(prev => ({
        ...prev,
        pending: queueStatus.pending,
        errors: queueStatus.deadLetter,
      }));
    };

    updateStatus();

    // Listen for sync events
    const handleSyncStart = () => setSyncStatus(prev => ({ ...prev, isSyncing: true }));
    const handleSyncEnd = () => setSyncStatus(prev => ({
      ...prev,
      isSyncing: false,
      lastSync: Date.now(),
    }));
    const handleSyncSuccess = () => updateStatus();

    window.addEventListener('sync:start', handleSyncStart);
    window.addEventListener('sync:end', handleSyncEnd);
    window.addEventListener('sync:item:success', handleSyncSuccess);

    return () => {
      window.removeEventListener('sync:start', handleSyncStart);
      window.removeEventListener('sync:end', handleSyncEnd);
      window.removeEventListener('sync:item:success', handleSyncSuccess);
    };
  }, []);

  // Determine status icon and color
  const getStatusDisplay = () => {
    if (!isOnline) {
      return {
        icon: <WifiOffIcon />,
        color: 'text-amber-500',
        label: 'Offline',
        description: `${syncStatus.pending} changes pending`,
      };
    }

    if (syncStatus.isSyncing) {
      return {
        icon: <SyncIcon className="animate-spin" />,
        color: 'text-blue-500',
        label: 'Syncing...',
        description: `Syncing ${syncStatus.pending} changes`,
      };
    }

    if (syncStatus.errors > 0) {
      return {
        icon: <AlertCircleIcon />,
        color: 'text-red-500',
        label: 'Sync Issues',
        description: `${syncStatus.errors} failed to sync`,
      };
    }

    if (syncStatus.pending > 0) {
      return {
        icon: <CloudUploadIcon />,
        color: 'text-yellow-500',
        label: 'Pending',
        description: `${syncStatus.pending} changes waiting`,
      };
    }

    return {
      icon: <CheckCircleIcon />,
      color: 'text-green-500',
      label: 'Synced',
      description: syncStatus.lastSync
        ? `Last synced ${formatRelativeTime(syncStatus.lastSync)}`
        : 'All changes saved',
    };
  };

  const status = getStatusDisplay();

  if (!showDetails) {
    return (
      <Tooltip content={status.description}>
        <div className={`flex items-center gap-1 ${status.color}`}>
          {status.icon}
          <span className="text-xs">{status.label}</span>
        </div>
      </Tooltip>
    );
  }

  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
      <div className={status.color}>{status.icon}</div>
      <div className="flex flex-col">
        <span className="text-sm font-medium">{status.label}</span>
        <span className="text-xs text-gray-500">{status.description}</span>
      </div>
      {syncStatus.pending > 0 && isOnline && (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => syncEngine.syncAll()}
          className="ml-auto"
        >
          Sync Now
        </Button>
      )}
    </div>
  );
}

// Connection quality indicator
function ConnectionQuality() {
  const { effectiveType, rtt } = useNetworkStatus();

  const getQualityBars = () => {
    switch (effectiveType) {
      case '4g': return 4;
      case '3g': return 3;
      case '2g': return 2;
      case 'slow-2g': return 1;
      default: return rtt < 100 ? 4 : rtt < 300 ? 3 : rtt < 700 ? 2 : 1;
    }
  };

  const bars = getQualityBars();

  return (
    <div className="flex items-end gap-0.5 h-4">
      {[1, 2, 3, 4].map(i => (
        <div
          key={i}
          className={`w-1 rounded-sm ${
            i <= bars ? 'bg-green-500' : 'bg-gray-300'
          }`}
          style={{ height: `${i * 25}%` }}
        />
      ))}
    </div>
  );
}
```

### 6.4 State Synchronization Patterns

```typescript
// /src/lib/sync/StateSync.ts

// Use Zustand with persistence for offline state
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface GameState {
  recentGames: Game[];
  pendingGames: Game[];
  addGame: (game: Game) => void;
  markGameSynced: (gameId: string) => void;
}

const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      recentGames: [],
      pendingGames: [],

      addGame: (game) => {
        set((state) => ({
          recentGames: [game, ...state.recentGames].slice(0, 50),
          pendingGames: [...state.pendingGames, game],
        }));

        // Queue for sync
        syncQueue.add({
          operation: 'create',
          entityType: 'game',
          entityId: game.id,
          data: game,
        });
      },

      markGameSynced: (gameId) => {
        set((state) => ({
          pendingGames: state.pendingGames.filter((g) => g.id !== gameId),
          recentGames: state.recentGames.map((g) =>
            g.id === gameId ? { ...g, synced: true } : g
          ),
        }));
      },
    }),
    {
      name: 'game-storage',
      storage: createJSONStorage(() => localStorage),
      // Migrate between versions
      version: 1,
      migrate: (persisted, version) => {
        if (version === 0) {
          // Migration logic
        }
        return persisted as GameState;
      },
    }
  )
);

// TanStack Query with offline support
import { QueryClient } from '@tanstack/react-query';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: (failureCount, error) => {
        // Don't retry on offline
        if (!navigator.onLine) return false;
        return failureCount < 3;
      },
      networkMode: 'offlineFirst',
    },
    mutations: {
      networkMode: 'offlineFirst',
      retry: 3,
      onMutate: async (variables) => {
        // Optimistic update logic
      },
    },
  },
});

// Persist to localStorage
const persister = createSyncStoragePersister({
  storage: window.localStorage,
  key: 'query-cache',
  throttleTime: 1000,
});

persistQueryClient({
  queryClient,
  persister,
  maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
});
```

---

## Part 7: Testing Offline Scenarios

### 7.1 Testing Checklist

| Scenario | Test Method | Expected Behavior |
|----------|-------------|-------------------|
| Load app while offline | Disable network, refresh | App loads from cache, shows offline indicator |
| Log game while offline | Airplane mode, log game | Game saved locally, queued for sync |
| Come back online | Re-enable network | Queued items sync automatically |
| Conflict during sync | Modify same record on two devices | Appropriate conflict resolution triggered |
| Slow network | Throttle to 2G | Graceful degradation, cache-first behavior |
| Service worker update | Deploy new version | User prompted, seamless update |
| Large sync queue | Queue 50+ items offline | Batch processing, no UI freeze |
| WebSocket disconnect | Kill server connection | Auto-reconnect with backoff |

### 7.2 Browser DevTools Testing

```javascript
// Force offline mode
navigator.serviceWorker.ready.then(reg => {
  // Clear all caches
  caches.keys().then(names => {
    names.forEach(name => caches.delete(name));
  });
});

// Simulate slow network (in DevTools > Network tab)
// - Select "Slow 3G" preset
// - Or create custom: 100ms latency, 750kb/s download

// Test sync queue
window.dispatchEvent(new Event('offline'));
// ... perform actions ...
window.dispatchEvent(new Event('online'));
// Check sync queue processed

// View IndexedDB
// DevTools > Application > IndexedDB > PickleballDB
```

---

## Part 8: Performance Considerations

### 8.1 Optimization Strategies

| Area | Strategy | Impact |
|------|----------|--------|
| **Initial Load** | Precache critical assets | <3s first paint |
| **Data Fetching** | Parallel requests, pagination | Reduced TTFB |
| **Sync** | Batch operations | Fewer network requests |
| **Storage** | LRU cache eviction | Controlled storage usage |
| **WebSocket** | Connection pooling | Reduced connection overhead |
| **Updates** | Delta sync | Less bandwidth |

### 8.2 Storage Quotas

```typescript
// Check storage usage
async function checkStorageQuota(): Promise<{
  usage: number;
  quota: number;
  percentUsed: number;
}> {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const { usage, quota } = await navigator.storage.estimate();
    return {
      usage: usage || 0,
      quota: quota || 0,
      percentUsed: quota ? ((usage || 0) / quota) * 100 : 0,
    };
  }
  return { usage: 0, quota: 0, percentUsed: 0 };
}

// Request persistent storage
async function requestPersistentStorage(): Promise<boolean> {
  if ('storage' in navigator && 'persist' in navigator.storage) {
    const isPersisted = await navigator.storage.persist();
    console.log(`Storage persisted: ${isPersisted}`);
    return isPersisted;
  }
  return false;
}

// Cleanup old data when approaching quota
async function cleanupOldData(): Promise<void> {
  const { percentUsed } = await checkStorageQuota();

  if (percentUsed > 80) {
    // Delete old games (keep last 30 days)
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    await db.games
      .where('startedAt')
      .below(thirtyDaysAgo)
      .and(game => game.synced)
      .delete();

    // Clear old cache entries
    const cache = await caches.open('api-v1');
    const requests = await cache.keys();
    const oldRequests = requests.filter(req => {
      // Check if older than 7 days based on URL timestamp
      return false; // Implement age check
    });
    await Promise.all(oldRequests.map(req => cache.delete(req)));
  }
}
```

---

## Summary

This real-time and offline sync architecture provides:

1. **Reliable Connectivity**: WebSocket + SSE hybrid with automatic reconnection
2. **True Offline Support**: Full app functionality without network
3. **Intelligent Sync**: Background sync with conflict resolution
4. **Optimistic UI**: Instant feedback with eventual consistency
5. **Efficient Caching**: Tiered strategies for different data types
6. **User Transparency**: Clear indicators of sync status

**Key Implementation Priorities:**

1. **Phase 1 (MVP)**: Basic offline caching, game logging queue, simple last-write-wins
2. **Phase 2**: WebSocket live scoring, push notifications, conflict UI
3. **Phase 3**: Advanced conflict resolution, CRDT for collaborative editing, delta sync

This architecture ensures the app works reliably at tournament venues with poor connectivity while providing real-time updates when connected.
