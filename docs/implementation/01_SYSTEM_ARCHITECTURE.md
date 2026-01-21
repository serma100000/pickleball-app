# System Architecture Document

## Pickleball Web Application (PWA)

**Version:** 1.0
**Date:** January 2026
**Status:** Implementation Specification

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Technology Stack](#2-technology-stack)
3. [Architecture Patterns](#3-architecture-patterns)
4. [Infrastructure Design](#4-infrastructure-design)
5. [Security Architecture](#5-security-architecture)
6. [Scalability Considerations](#6-scalability-considerations)
7. [Architecture Decision Records](#7-architecture-decision-records)

---

## 1. Executive Summary

### 1.1 Project Overview

This document defines the system architecture for a comprehensive pickleball Progressive Web Application (PWA) designed to serve all player types from casual to competitive. The platform unifies court discovery, player matching, game logging, leagues, tournaments, and club management into a single cohesive experience.

### 1.2 Key Architectural Drivers

| Driver | Requirement | Impact |
|--------|-------------|--------|
| **Retention** | 77% of fitness app users churn in 3 days | Offline-first, fast performance, gamification |
| **Accessibility** | Median user age 35+, all skill levels | Progressive disclosure, accessibility compliance |
| **Reliability** | Tournament scoring cannot lose data | Offline sync, conflict resolution, redundancy |
| **Scale** | Target 200K users in Year 1 | Horizontal scaling, caching, CDN |
| **Integration** | DUPR rating system (no public API) | Modular integration layer, fallback systems |

### 1.3 Architecture Principles

1. **Offline-First**: Full functionality without network connectivity
2. **Progressive Enhancement**: Core features work everywhere, enhanced where supported
3. **API-First Design**: All functionality exposed via well-documented APIs
4. **Event-Driven**: Loosely coupled components communicating through events
5. **Security by Default**: Zero-trust architecture, defense in depth
6. **Observable**: Comprehensive logging, metrics, and tracing

---

## 2. Technology Stack

### 2.1 Frontend Stack

#### 2.1.1 Framework: Next.js 14+

**Selection:** Next.js 14 with App Router

**Justification:**
- **Server-Side Rendering (SSR)**: Critical for SEO (court pages, tournament listings)
- **Static Generation (SSG)**: Pre-render public pages for performance
- **Server Actions**: Simplified form handling and mutations
- **Built-in PWA Support**: Easy service worker integration
- **React Server Components**: Reduced JavaScript bundle size
- **Image Optimization**: Automatic optimization for court photos, avatars
- **TypeScript Native**: First-class TypeScript support

**Alternatives Considered:**
| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| Remix | Strong data loading patterns | Smaller ecosystem | Rejected |
| SvelteKit | Excellent performance | Team would need to learn Svelte | Rejected |
| Nuxt/Vue | Good PWA support | React has larger talent pool | Rejected |

#### 2.1.2 State Management: Zustand + TanStack Query

**Selection:** Zustand for client state, TanStack Query for server state

**Justification:**
- **Zustand**: Lightweight (1KB), simple API, TypeScript-first, no boilerplate
- **TanStack Query**: Handles caching, background refetch, optimistic updates
- **Separation of Concerns**: Clear distinction between UI state and server data
- **Offline Support**: TanStack Query's cache serves as offline data store

**State Architecture:**
```
Client State (Zustand)
├── UI State (modals, sidebar, theme)
├── User Preferences (local settings)
├── Offline Queue (pending mutations)
└── Real-time State (WebSocket data)

Server State (TanStack Query)
├── User Data (profile, ratings, stats)
├── Courts (search results, details)
├── Games (history, pending)
├── Social (friends, feed, notifications)
└── Tournaments/Leagues (brackets, standings)
```

#### 2.1.3 UI Component Library: Tailwind CSS + shadcn/ui

**Selection:** Tailwind CSS with shadcn/ui components

**Justification:**
- **Tailwind CSS**: Utility-first, highly customizable, small production bundle
- **shadcn/ui**: Accessible, unstyled components that can be copied/modified
- **Ownership**: Components live in codebase, not a dependency
- **Accessibility**: ARIA-compliant out of the box
- **Dark Mode**: Built-in dark mode support (important for outdoor use)

**Component Architecture:**
```
src/components/
├── ui/                 # shadcn/ui primitives
│   ├── button.tsx
│   ├── card.tsx
│   ├── dialog.tsx
│   └── ...
├── features/           # Feature-specific components
│   ├── courts/
│   ├── games/
│   ├── tournaments/
│   └── ...
└── layouts/            # Page layouts
    ├── app-shell.tsx
    ├── auth-layout.tsx
    └── public-layout.tsx
```

#### 2.1.4 Additional Frontend Libraries

| Library | Purpose | Version |
|---------|---------|---------|
| **Mapbox GL JS** | Interactive court maps | 3.x |
| **Recharts** | Statistics visualization | 2.x |
| **date-fns** | Date manipulation | 3.x |
| **react-hook-form** | Form handling | 7.x |
| **zod** | Schema validation | 3.x |
| **framer-motion** | Animations | 11.x |
| **workbox** | Service worker/PWA | 7.x |

### 2.2 Backend Stack

#### 2.2.1 Runtime: Node.js 20 LTS

**Selection:** Node.js 20 LTS with TypeScript

**Justification:**
- **JavaScript Ecosystem**: Shared code between frontend and backend
- **TypeScript**: End-to-end type safety
- **Async I/O**: Excellent for I/O-bound workloads (API calls, database)
- **LTS Support**: Long-term security updates
- **Talent Pool**: Large developer community

#### 2.2.2 Framework: Hono

**Selection:** Hono (lightweight, fast, TypeScript-first)

**Justification:**
- **Performance**: Benchmarks show 10x faster than Express
- **TypeScript**: First-class types with middleware inference
- **Multi-Runtime**: Works on Node, Deno, Bun, Cloudflare Workers
- **Middleware Ecosystem**: JWT, CORS, compression, validation
- **OpenAPI**: Built-in OpenAPI/Swagger generation

**Alternatives Considered:**
| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| Express | Most popular | Slow, callback-based | Rejected |
| Fastify | Very fast | More complex plugin system | Considered |
| NestJS | Enterprise features | Heavy, opinionated | Rejected |

**API Structure:**
```
src/api/
├── routes/
│   ├── users/
│   ├── courts/
│   ├── games/
│   ├── tournaments/
│   ├── leagues/
│   ├── clubs/
│   └── social/
├── middleware/
│   ├── auth.ts
│   ├── rate-limit.ts
│   ├── validation.ts
│   └── error-handler.ts
├── services/
│   ├── dupr-integration.ts
│   ├── matchmaking.ts
│   ├── notification.ts
│   └── rating-calculator.ts
└── lib/
    ├── database.ts
    ├── cache.ts
    └── search.ts
```

### 2.3 Database Layer

#### 2.3.1 Primary Database: PostgreSQL 16

**Selection:** PostgreSQL 16 with PostGIS extension

**Justification:**
- **Reliability**: ACID compliance, proven at scale
- **PostGIS**: Geospatial queries for court finder, proximity matching
- **JSON Support**: Flexible schema for varying data structures
- **Full-Text Search**: Native search capabilities for basic needs
- **Partitioning**: Table partitioning for time-series game data
- **Replication**: Built-in streaming replication for read replicas

**Schema Design Principles:**
- UUID primary keys (distributed-safe)
- Soft deletes with `deleted_at` timestamp
- Audit columns (`created_at`, `updated_at`, `created_by`)
- Separate partitions for high-volume tables (games, events)

**Key Tables:**
```sql
-- Core entities
users, user_profiles, user_preferences, user_ratings
courts, court_availability, court_reviews
games, game_participants, game_scores
tournaments, tournament_registrations, tournament_brackets
leagues, league_standings, league_matches
clubs, club_members, club_events

-- Social
friendships, game_invites, notifications
activity_feed, achievements, badges

-- Supporting
locations, addresses
media, uploads
audit_log, system_events
```

#### 2.3.2 ORM: Drizzle ORM

**Selection:** Drizzle ORM

**Justification:**
- **TypeScript-First**: Full type inference from schema
- **SQL-Like**: Familiar syntax, no magic
- **Performance**: Minimal overhead, efficient queries
- **Migrations**: Built-in migration generation
- **Edge Ready**: Works in serverless environments

#### 2.3.3 Time-Series Extension: TimescaleDB

**Selection:** TimescaleDB extension for time-series data

**Justification:**
- Games logged over time require efficient time-range queries
- Rating history tracking benefits from hypertables
- Analytics and reporting on temporal data
- Automatic data compression for older records

**Usage:**
```sql
-- Hypertable for game statistics
SELECT create_hypertable('game_stats', 'recorded_at');

-- Continuous aggregates for dashboards
CREATE MATERIALIZED VIEW daily_game_counts
WITH (timescaledb.continuous) AS
SELECT time_bucket('1 day', created_at) AS day,
       count(*) AS games_played,
       user_id
FROM games
GROUP BY day, user_id;
```

### 2.4 Cache Layer

#### 2.4.1 Primary Cache: Redis 7

**Selection:** Redis 7 (Upstash for serverless, self-hosted for dedicated)

**Justification:**
- **Speed**: Sub-millisecond latency
- **Data Structures**: Lists, Sets, Sorted Sets for leaderboards
- **Pub/Sub**: Real-time notifications
- **Streams**: Event sourcing capabilities
- **TTL**: Automatic cache expiration

**Cache Strategy:**
```
Cache Tiers:
├── L1: Application Memory (hot data, <1ms)
├── L2: Redis (warm data, <5ms)
└── L3: PostgreSQL (cold data, <50ms)

Caching Patterns:
├── Cache-Aside: Read-heavy data (court details, profiles)
├── Write-Through: Critical data (ratings, scores)
├── Write-Behind: Analytics, non-critical updates
└── Cache Invalidation: Event-driven via pub/sub
```

**Key Namespaces:**
```
user:{id}:profile      # User profile data
user:{id}:ratings      # Current ratings
court:{id}:details     # Court information
court:{id}:availability # Availability windows
leaderboard:{type}     # Sorted set for rankings
session:{token}        # Session data
rate_limit:{ip}        # Rate limiting counters
```

### 2.5 Search Engine

#### 2.5.1 Selection: Meilisearch

**Selection:** Meilisearch (self-hosted or Cloud)

**Justification:**
- **Speed**: 50ms typical search latency
- **Typo Tolerance**: Handles misspellings (important for court/player names)
- **Faceted Search**: Filter by location, skill, availability
- **Geo Search**: Built-in proximity search
- **Easy Setup**: Single binary, minimal configuration
- **Cost**: Open source, cloud option available

**Alternatives Considered:**
| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| Elasticsearch | Feature-rich | Complex, resource-heavy | Rejected |
| Typesense | Fast, simple | Less mature geo search | Considered |
| Algolia | Excellent UX | Expensive at scale | Rejected |

**Search Indices:**
```
Indices:
├── courts
│   ├── Searchable: name, address, description
│   ├── Filterable: type, surface, amenities, city
│   └── Sortable: rating, distance
├── users
│   ├── Searchable: name, username, location
│   ├── Filterable: skill_level, availability
│   └── Sortable: rating, games_played
├── tournaments
│   ├── Searchable: name, description, organizer
│   ├── Filterable: format, skill_level, dates, location
│   └── Sortable: start_date, registration_deadline
└── clubs
    ├── Searchable: name, description, location
    ├── Filterable: membership_type, amenities
    └── Sortable: member_count, rating
```

### 2.6 Real-Time Communication

#### 2.6.1 Selection: Socket.IO with Redis Adapter

**Selection:** Socket.IO 4.x with Redis adapter for horizontal scaling

**Justification:**
- **Fallback Support**: WebSocket with HTTP long-polling fallback
- **Room Management**: Built-in rooms for tournaments, games, clubs
- **Acknowledgments**: Reliable message delivery
- **Binary Support**: Efficient data transfer
- **Scaling**: Redis adapter for multi-server deployment

**Real-Time Features:**
```
Namespaces:
├── /notifications     # User notifications
├── /games            # Live game scoring
├── /tournaments      # Bracket updates
├── /chat             # Direct messaging
└── /presence         # Online status

Events:
├── game:score_update
├── game:completed
├── tournament:bracket_update
├── tournament:match_called
├── notification:new
├── friend:online
└── chat:message
```

### 2.7 Authentication

#### 2.7.1 Selection: Clerk

**Selection:** Clerk (managed authentication)

**Justification:**
- **Complete Solution**: Auth UI, session management, user management
- **Social Logins**: Google, Apple, Facebook (important for quick onboarding)
- **Security**: Handles security best practices (CSRF, session rotation)
- **Webhooks**: Sync user events to database
- **React SDK**: First-class React/Next.js integration
- **Affordable**: Free tier covers initial growth

**Alternatives Considered:**
| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| Auth.js | Open source, flexible | Requires more implementation | Backup option |
| Auth0 | Enterprise features | Expensive | Rejected |
| Firebase Auth | Google integration | Vendor lock-in | Rejected |
| Custom | Full control | Security liability | Rejected |

**Authentication Flow:**
```
1. User initiates login (email, social, phone)
2. Clerk handles authentication
3. Clerk issues session token (JWT)
4. Webhook triggers user sync to database
5. Application receives authenticated request
6. Middleware validates token with Clerk
7. Request proceeds with user context
```

### 2.8 File Storage

#### 2.8.1 Selection: Cloudflare R2

**Selection:** Cloudflare R2 (S3-compatible object storage)

**Justification:**
- **No Egress Fees**: Critical for serving images/media
- **S3 Compatible**: Easy migration, familiar API
- **Global Distribution**: CDN integration
- **Cost Effective**: Lower storage costs than S3
- **Workers Integration**: Edge processing capabilities

**Storage Structure:**
```
Buckets:
├── pickleball-avatars/     # User profile photos
│   └── {user_id}/{size}/avatar.{ext}
├── pickleball-courts/      # Court photos
│   └── {court_id}/{photo_id}.{ext}
├── pickleball-media/       # General uploads
│   └── {entity_type}/{entity_id}/{file_id}.{ext}
└── pickleball-exports/     # Data exports
    └── {user_id}/{export_id}.{ext}
```

### 2.9 Hosting and Deployment

#### 2.9.1 Frontend: Vercel

**Selection:** Vercel

**Justification:**
- **Next.js Native**: Built by the Next.js team
- **Edge Functions**: Server components at the edge
- **Preview Deployments**: Every PR gets a preview URL
- **Analytics**: Built-in Web Vitals monitoring
- **Global CDN**: 100+ edge locations

#### 2.9.2 Backend: Railway

**Selection:** Railway (with option to migrate to AWS/GCP later)

**Justification:**
- **Developer Experience**: Git-based deployment
- **Managed Services**: PostgreSQL, Redis included
- **Scaling**: Horizontal and vertical scaling
- **Cost Effective**: Usage-based pricing for early stage
- **Migration Path**: Docker-based, easily portable

**Deployment Architecture:**
```
                    [Cloudflare CDN]
                          │
                    [Vercel Edge]
                    (Next.js App)
                          │
                    [API Gateway]
                          │
            ┌─────────────┼─────────────┐
            │             │             │
      [API Server]  [API Server]  [API Server]
            │             │             │
            └─────────────┼─────────────┘
                          │
            ┌─────────────┼─────────────┐
            │             │             │
      [PostgreSQL]    [Redis]    [Meilisearch]
      (Primary +      (Cluster)
       Replicas)
```

### 2.10 Technology Stack Summary

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT LAYER                             │
├─────────────────────────────────────────────────────────────┤
│  Next.js 14 │ React 18 │ TypeScript │ Tailwind │ shadcn/ui │
│  Zustand │ TanStack Query │ Workbox │ Mapbox │ Recharts   │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    EDGE/CDN LAYER                            │
├─────────────────────────────────────────────────────────────┤
│  Cloudflare CDN │ Vercel Edge │ R2 Storage                  │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER                         │
├─────────────────────────────────────────────────────────────┤
│  Hono API │ Node.js 20 │ Socket.IO │ Clerk Auth             │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                      DATA LAYER                              │
├─────────────────────────────────────────────────────────────┤
│  PostgreSQL 16 │ TimescaleDB │ Redis 7 │ Meilisearch       │
│  Drizzle ORM │ PostGIS                                      │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                  INFRASTRUCTURE LAYER                        │
├─────────────────────────────────────────────────────────────┤
│  Vercel │ Railway │ Cloudflare │ GitHub Actions             │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Architecture Patterns

### 3.1 Monolith vs Microservices Decision

**Decision:** Modular Monolith with Event-Driven Architecture

**Rationale:**

The application will start as a **modular monolith** with clear domain boundaries, designed for eventual extraction into services if needed.

**Why Not Microservices:**
- Early-stage product with evolving requirements
- Small initial team (microservices require operational expertise)
- Network latency overhead not justified yet
- Deployment complexity not warranted
- Cost of distributed systems too high for MVP

**Why Modular Monolith:**
- Clear domain boundaries for future extraction
- Shared database with schema separation
- Event-driven communication between modules
- Single deployment simplifies operations
- Refactoring is local, not distributed

**Module Boundaries:**
```
src/
├── modules/
│   ├── users/           # User management, profiles
│   ├── courts/          # Court discovery, reviews
│   ├── games/           # Game logging, scoring
│   ├── matchmaking/     # Player matching algorithms
│   ├── tournaments/     # Tournament management
│   ├── leagues/         # League management
│   ├── clubs/           # Club management
│   ├── social/          # Feed, friends, achievements
│   ├── notifications/   # All notification types
│   └── integrations/    # DUPR, external APIs
├── shared/
│   ├── database/        # Shared DB connection
│   ├── events/          # Event bus
│   ├── auth/            # Authentication
│   └── utils/           # Common utilities
└── api/
    └── routes/          # HTTP routes (thin layer)
```

**Inter-Module Communication:**
```typescript
// Event-based communication between modules
import { EventBus } from '@/shared/events';

// Publishing events
EventBus.publish('game.completed', {
  gameId: 'game_123',
  participants: ['user_1', 'user_2'],
  scores: [11, 7],
  timestamp: new Date()
});

// Subscribing to events
EventBus.subscribe('game.completed', async (event) => {
  // Notifications module handles this
  await sendGameCompletionNotification(event);
  // Ratings module handles this
  await updatePlayerRatings(event);
  // Social module handles this
  await addToActivityFeed(event);
});
```

### 3.2 API Design

**Decision:** REST API with GraphQL for Complex Queries

**Primary API: REST**

REST is used for the majority of operations due to:
- Simplicity and tooling support
- Caching at HTTP level
- Clear resource-based modeling
- Easier debugging and logging

**REST API Design Principles:**
```
Base URL: https://api.pickleballapp.com/v1

Resources:
/users
/users/{id}
/users/{id}/games
/users/{id}/ratings
/users/{id}/friends
/courts
/courts/{id}
/courts/{id}/availability
/courts/{id}/reviews
/games
/games/{id}
/tournaments
/tournaments/{id}/brackets
/tournaments/{id}/registrations
/leagues
/leagues/{id}/standings
/clubs
/clubs/{id}/members

Standard Methods:
GET    /resource        # List (with pagination)
GET    /resource/{id}   # Get single
POST   /resource        # Create
PATCH  /resource/{id}   # Partial update
DELETE /resource/{id}   # Soft delete

Query Parameters:
?page=1&limit=20                    # Pagination
?sort=created_at&order=desc         # Sorting
?filter[status]=active              # Filtering
?include=participants,scores        # Eager loading
?fields=id,name,rating              # Sparse fieldsets
```

**GraphQL for Complex Queries:**

GraphQL is available for:
- Mobile clients needing flexible data fetching
- Complex dashboard queries
- Reducing over-fetching in slow network conditions

```graphql
# Example: Tournament bracket with nested data
query TournamentBracket($id: ID!) {
  tournament(id: $id) {
    name
    startDate
    brackets {
      round
      matches {
        team1 { name rating }
        team2 { name rating }
        scores
        winner { name }
        court { name number }
        scheduledTime
      }
    }
  }
}
```

**API Versioning Strategy:**
```
URL Versioning: /api/v1/resource

Version Support Policy:
- Current version (v1): Full support
- Previous version (v0): 12 months deprecation notice
- Breaking changes: New major version
- Non-breaking additions: Same version
```

### 3.3 PWA Architecture

**Service Worker Strategy:**

```
Service Worker Lifecycle:
1. Install: Cache critical assets
2. Activate: Clean old caches, claim clients
3. Fetch: Serve from cache, fallback to network
4. Sync: Background sync for offline mutations
5. Push: Handle push notifications

Cache Strategies by Resource Type:
├── App Shell (Cache First)
│   ├── HTML shell
│   ├── CSS bundles
│   ├── JS bundles
│   └── Fonts
├── Static Assets (Cache First, Stale While Revalidate)
│   ├── Images
│   ├── Icons
│   └── Manifest
├── API Responses (Network First, Cache Fallback)
│   ├── User profile
│   ├── Game history
│   └── Court data
└── Real-time Data (Network Only)
    ├── Live scores
    ├── Notifications
    └── Presence
```

**Workbox Configuration:**
```javascript
// next.config.js with PWA
const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  swcMinify: true,
  disable: process.env.NODE_ENV === 'development',
  workboxOptions: {
    disableDevLogs: true,
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/api\.pickleballapp\.com\/v1\/.*/i,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'api-cache',
          expiration: {
            maxEntries: 200,
            maxAgeSeconds: 60 * 60 * 24 // 24 hours
          },
          networkTimeoutSeconds: 10
        }
      },
      {
        urlPattern: /^https:\/\/.*\.cloudflare\.com\/.*/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'static-assets',
          expiration: {
            maxEntries: 100,
            maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
          }
        }
      }
    ]
  }
});
```

**Web App Manifest:**
```json
{
  "name": "Pickleball App",
  "short_name": "Pickleball",
  "description": "Find games, track scores, join leagues",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#22c55e",
  "orientation": "portrait-primary",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/icon-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ],
  "screenshots": [
    { "src": "/screenshots/home.png", "sizes": "1080x1920", "type": "image/png" }
  ],
  "shortcuts": [
    { "name": "Find a Game", "url": "/games/find", "icons": [{ "src": "/icons/find-game.png", "sizes": "96x96" }] },
    { "name": "Log Game", "url": "/games/log", "icons": [{ "src": "/icons/log-game.png", "sizes": "96x96" }] }
  ]
}
```

### 3.4 Offline-First Strategy

**Offline Data Architecture:**

```
┌──────────────────────────────────────────────────────────────┐
│                    OFFLINE ARCHITECTURE                       │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐    │
│  │   IndexedDB  │────▶│  Sync Queue │────▶│   Server    │    │
│  │ (Local Data) │     │ (Mutations) │     │  (Source    │    │
│  └─────────────┘     └─────────────┘     │   of Truth) │    │
│         │                   │             └─────────────┘    │
│         │                   │                    │            │
│         ▼                   ▼                    │            │
│  ┌─────────────┐     ┌─────────────┐            │            │
│  │  TanStack   │◀────│  Background │◀───────────┘            │
│  │   Query     │     │    Sync     │                         │
│  │   Cache     │     │   Worker    │                         │
│  └─────────────┘     └─────────────┘                         │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

**IndexedDB Schema (via Dexie.js):**
```typescript
// db/offline.ts
import Dexie, { Table } from 'dexie';

interface OfflineGame {
  localId: string;
  serverId?: string;
  status: 'pending' | 'synced' | 'conflict';
  data: GameData;
  createdAt: Date;
  syncedAt?: Date;
}

interface OfflineMutation {
  id: string;
  type: 'create' | 'update' | 'delete';
  resource: string;
  data: unknown;
  timestamp: Date;
  retries: number;
}

class OfflineDB extends Dexie {
  games!: Table<OfflineGame>;
  courts!: Table<CachedCourt>;
  users!: Table<CachedUser>;
  mutations!: Table<OfflineMutation>;

  constructor() {
    super('PickleballOffline');
    this.version(1).stores({
      games: 'localId, serverId, status, createdAt',
      courts: 'id, latitude, longitude, updatedAt',
      users: 'id, updatedAt',
      mutations: 'id, type, resource, timestamp'
    });
  }
}

export const offlineDB = new OfflineDB();
```

**Sync Queue Implementation:**
```typescript
// sync/queue.ts
export class SyncQueue {
  private processing = false;

  async add(mutation: Mutation): Promise<void> {
    await offlineDB.mutations.add({
      id: generateId(),
      ...mutation,
      timestamp: new Date(),
      retries: 0
    });

    // Trigger sync if online
    if (navigator.onLine) {
      this.process();
    }
  }

  async process(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    try {
      const pending = await offlineDB.mutations
        .orderBy('timestamp')
        .toArray();

      for (const mutation of pending) {
        try {
          await this.executeMutation(mutation);
          await offlineDB.mutations.delete(mutation.id);
        } catch (error) {
          if (mutation.retries >= 3) {
            await this.handleConflict(mutation);
          } else {
            await offlineDB.mutations.update(mutation.id, {
              retries: mutation.retries + 1
            });
          }
        }
      }
    } finally {
      this.processing = false;
    }
  }

  private async handleConflict(mutation: Mutation): Promise<void> {
    // Store conflict for user resolution
    await offlineDB.mutations.update(mutation.id, {
      status: 'conflict'
    });

    // Notify user
    EventBus.publish('sync.conflict', { mutation });
  }
}
```

**Background Sync (Service Worker):**
```typescript
// service-worker.ts
self.addEventListener('sync', (event: SyncEvent) => {
  if (event.tag === 'sync-mutations') {
    event.waitUntil(syncMutations());
  }
});

async function syncMutations(): Promise<void> {
  const queue = new SyncQueue();
  await queue.process();
}

// Register sync when mutation occurs
async function registerSync(): Promise<void> {
  const registration = await navigator.serviceWorker.ready;
  await registration.sync.register('sync-mutations');
}
```

### 3.5 Real-Time Sync Approach

**Event Sourcing for Critical Operations:**

Tournament scoring and live game updates use event sourcing for reliability:

```typescript
// events/game-events.ts
type GameEvent =
  | { type: 'GAME_STARTED'; gameId: string; timestamp: Date }
  | { type: 'POINT_SCORED'; gameId: string; team: 1 | 2; scorer: string; timestamp: Date }
  | { type: 'SIDE_SWITCHED'; gameId: string; timestamp: Date }
  | { type: 'TIMEOUT_CALLED'; gameId: string; team: 1 | 2; timestamp: Date }
  | { type: 'GAME_COMPLETED'; gameId: string; winner: 1 | 2; finalScore: [number, number]; timestamp: Date };

class GameEventStore {
  async append(event: GameEvent): Promise<void> {
    // Store locally first (offline support)
    await offlineDB.gameEvents.add(event);

    // Broadcast to other clients
    socket.emit('game:event', event);

    // Sync to server
    await syncQueue.add({
      type: 'event',
      resource: 'game_events',
      data: event
    });
  }

  async reconstruct(gameId: string): Promise<GameState> {
    const events = await offlineDB.gameEvents
      .where('gameId').equals(gameId)
      .sortBy('timestamp');

    return events.reduce(gameReducer, initialGameState);
  }
}
```

**Conflict Resolution with CRDTs:**

For scenarios where multiple clients may update simultaneously:

```typescript
// sync/crdt.ts
import { Automerge } from '@automerge/automerge';

// Game score as a CRDT
interface GameScore {
  team1: Automerge.Counter;
  team2: Automerge.Counter;
  events: Automerge.List<GameEvent>;
}

// Initialize document
const scoreDoc = Automerge.init<GameScore>();

// Apply local change
const newDoc = Automerge.change(scoreDoc, 'Point scored', doc => {
  doc.team1.increment(1);
  doc.events.push({
    type: 'POINT_SCORED',
    team: 1,
    timestamp: new Date()
  });
});

// Merge remote changes (conflict-free)
const mergedDoc = Automerge.merge(localDoc, remoteDoc);
```

**WebSocket Room Management:**

```typescript
// real-time/rooms.ts
export const RoomTypes = {
  GAME: 'game',
  TOURNAMENT: 'tournament',
  CLUB: 'club',
  USER: 'user'
} as const;

class RealtimeManager {
  private socket: Socket;

  joinGame(gameId: string): void {
    this.socket.emit('join', { room: `game:${gameId}` });
    this.socket.on('game:score_update', this.handleScoreUpdate);
    this.socket.on('game:completed', this.handleGameComplete);
  }

  joinTournament(tournamentId: string): void {
    this.socket.emit('join', { room: `tournament:${tournamentId}` });
    this.socket.on('tournament:bracket_update', this.handleBracketUpdate);
    this.socket.on('tournament:match_called', this.handleMatchCalled);
  }

  leave(room: string): void {
    this.socket.emit('leave', { room });
    this.socket.off(`${room.split(':')[0]}:*`);
  }
}
```

---

## 4. Infrastructure Design

### 4.1 Environment Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    ENVIRONMENTS                              │
├─────────────┬─────────────┬─────────────┬─────────────────┬─┤
│ Development │   Preview   │   Staging   │   Production    │ │
├─────────────┼─────────────┼─────────────┼─────────────────┼─┤
│ Local       │ Per-PR      │ Pre-prod    │ Live            │ │
│ Docker      │ Vercel      │ Railway     │ Railway +       │ │
│ SQLite      │ Neon        │ PostgreSQL  │ PostgreSQL      │ │
│ Mock APIs   │ Seed data   │ Prod clone  │ Real data       │ │
└─────────────┴─────────────┴─────────────┴─────────────────┴─┘
```

### 4.2 Development Environment

**Local Setup:**
```
Local Development Stack:
├── Docker Compose
│   ├── PostgreSQL 16 + PostGIS
│   ├── Redis 7
│   ├── Meilisearch
│   └── MailHog (email testing)
├── Node.js 20 LTS
├── pnpm (package manager)
└── VS Code + Extensions
    ├── ESLint
    ├── Prettier
    ├── Tailwind IntelliSense
    └── Database Client
```

**docker-compose.yml:**
```yaml
version: '3.8'

services:
  postgres:
    image: postgis/postgis:16-3.4
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: pickleball_dev
      POSTGRES_USER: dev
      POSTGRES_PASSWORD: dev
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes

  meilisearch:
    image: getmeili/meilisearch:v1.6
    ports:
      - "7700:7700"
    environment:
      MEILI_MASTER_KEY: dev_key
    volumes:
      - meili_data:/meili_data

  mailhog:
    image: mailhog/mailhog
    ports:
      - "1025:1025"
      - "8025:8025"

volumes:
  postgres_data:
  meili_data:
```

### 4.3 Staging Environment

**Purpose:** Pre-production testing with production-like data and configuration

**Infrastructure:**
```
Staging Environment:
├── Vercel (Preview Branch)
│   └── staging.pickleballapp.com
├── Railway (Staging Project)
│   ├── API Server (1 instance)
│   ├── PostgreSQL (replica of prod schema)
│   ├── Redis (single node)
│   └── Meilisearch
└── Cloudflare R2 (staging bucket)
```

**Configuration:**
- Anonymized production data snapshot (weekly)
- Same environment variables as production (different values)
- Clerk test mode for authentication
- Rate limits at 10x production

### 4.4 Production Environment

**High-Availability Architecture:**

```
┌─────────────────────────────────────────────────────────────┐
│                  PRODUCTION ARCHITECTURE                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│                     ┌───────────────┐                        │
│                     │  Cloudflare   │                        │
│                     │  (DNS + CDN)  │                        │
│                     └───────┬───────┘                        │
│                             │                                │
│          ┌──────────────────┼──────────────────┐            │
│          │                  │                  │            │
│          ▼                  ▼                  ▼            │
│    ┌───────────┐     ┌───────────┐     ┌───────────┐       │
│    │  Vercel   │     │  Vercel   │     │  Vercel   │       │
│    │  Edge 1   │     │  Edge 2   │     │  Edge N   │       │
│    └─────┬─────┘     └─────┬─────┘     └─────┬─────┘       │
│          │                 │                  │             │
│          └─────────────────┼──────────────────┘             │
│                            │                                │
│                   ┌────────┴────────┐                       │
│                   │  Load Balancer  │                       │
│                   └────────┬────────┘                       │
│                            │                                │
│          ┌─────────────────┼─────────────────┐             │
│          │                 │                 │             │
│          ▼                 ▼                 ▼             │
│    ┌───────────┐    ┌───────────┐    ┌───────────┐        │
│    │    API    │    │    API    │    │    API    │        │
│    │ Server 1  │    │ Server 2  │    │ Server 3  │        │
│    └─────┬─────┘    └─────┬─────┘    └─────┬─────┘        │
│          │                │                │               │
│          └────────────────┼────────────────┘               │
│                           │                                │
│    ┌──────────────────────┼──────────────────────┐        │
│    │                      │                      │        │
│    ▼                      ▼                      ▼        │
│ ┌──────────┐      ┌───────────────┐      ┌───────────┐   │
│ │PostgreSQL│      │    Redis      │      │Meilisearch│   │
│ │ Primary  │      │   Cluster     │      │  Cluster  │   │
│ │    +     │      │ (3 nodes)     │      │ (2 nodes) │   │
│ │ Replica  │      └───────────────┘      └───────────┘   │
│ └──────────┘                                              │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

**Production Specifications:**

| Component | Specification | Scaling |
|-----------|---------------|---------|
| **API Servers** | 3x 2 vCPU, 4GB RAM | Horizontal (auto-scale 3-10) |
| **PostgreSQL** | 4 vCPU, 16GB RAM, 500GB SSD | Read replicas |
| **Redis** | 3-node cluster, 2GB each | Fixed cluster |
| **Meilisearch** | 2 vCPU, 4GB RAM | Horizontal |

### 4.5 CI/CD Pipeline

**GitHub Actions Workflow:**

```yaml
# .github/workflows/ci-cd.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm type-check

  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgis/postgis:16-3.4
        env:
          POSTGRES_PASSWORD: test
        ports:
          - 5432:5432
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm test:unit
      - run: pnpm test:integration
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/test
          REDIS_URL: redis://localhost:6379
      - uses: codecov/codecov-action@v3

  e2e:
    runs-on: ubuntu-latest
    needs: [lint, test]
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
      - run: pnpm install --frozen-lockfile
      - name: Install Playwright
        run: pnpm exec playwright install --with-deps
      - name: Run E2E tests
        run: pnpm test:e2e
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/

  deploy-preview:
    if: github.event_name == 'pull_request'
    needs: [lint, test]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Vercel Preview
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}

  deploy-staging:
    if: github.ref == 'refs/heads/develop'
    needs: [lint, test, e2e]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy API to Railway (Staging)
        uses: bervProject/railway-deploy@main
        with:
          railway_token: ${{ secrets.RAILWAY_TOKEN }}
          service: api-staging
      - name: Deploy Frontend to Vercel (Staging)
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-args: '--prod'
          alias-domains: staging.pickleballapp.com

  deploy-production:
    if: github.ref == 'refs/heads/main'
    needs: [lint, test, e2e]
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
      - name: Run Database Migrations
        run: pnpm db:migrate:prod
        env:
          DATABASE_URL: ${{ secrets.PROD_DATABASE_URL }}
      - name: Deploy API to Railway (Production)
        uses: bervProject/railway-deploy@main
        with:
          railway_token: ${{ secrets.RAILWAY_PROD_TOKEN }}
          service: api-production
      - name: Deploy Frontend to Vercel (Production)
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-args: '--prod'
      - name: Post-deployment Health Check
        run: |
          sleep 30
          curl -f https://api.pickleballapp.com/health || exit 1
```

### 4.6 Monitoring and Logging

**Observability Stack:**

```
Observability Architecture:
├── Metrics (Prometheus + Grafana)
│   ├── Application metrics (request rate, latency)
│   ├── Business metrics (games logged, users active)
│   ├── Infrastructure metrics (CPU, memory, disk)
│   └── Custom dashboards
├── Logging (Axiom or Logtail)
│   ├── Application logs (structured JSON)
│   ├── Access logs
│   ├── Error tracking
│   └── Audit logs
├── Tracing (optional: Jaeger)
│   ├── Distributed tracing
│   └── Performance profiling
├── Error Tracking (Sentry)
│   ├── Error aggregation
│   ├── Release tracking
│   └── Performance monitoring
└── Uptime Monitoring (Better Uptime)
    ├── Endpoint monitoring
    ├── Status page
    └── Incident management
```

**Structured Logging Format:**
```typescript
// logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label })
  },
  base: {
    service: 'pickleball-api',
    env: process.env.NODE_ENV
  }
});

// Usage
logger.info({
  event: 'game_completed',
  gameId: 'game_123',
  duration: 1234,
  participants: ['user_1', 'user_2']
}, 'Game completed successfully');

// Output (JSON)
{
  "level": "info",
  "time": 1704067200000,
  "service": "pickleball-api",
  "env": "production",
  "event": "game_completed",
  "gameId": "game_123",
  "duration": 1234,
  "participants": ["user_1", "user_2"],
  "msg": "Game completed successfully"
}
```

**Key Metrics Dashboard:**
```
Grafana Dashboard Panels:
├── Request Rate (req/min by endpoint)
├── Response Time (p50, p95, p99)
├── Error Rate (by type, endpoint)
├── Active Users (DAU, WAU, MAU)
├── Games Logged (per hour/day)
├── Database Connections (pool usage)
├── Cache Hit Rate (Redis)
├── Search Latency (Meilisearch)
├── WebSocket Connections (active)
└── Background Jobs (queue depth)
```

**Alerting Rules:**
```yaml
# alerts.yml
groups:
  - name: critical
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.01
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"

      - alert: DatabaseConnectionPoolExhausted
        expr: pg_stat_activity_count > 90
        for: 2m
        labels:
          severity: critical

      - alert: APILatencyHigh
        expr: histogram_quantile(0.95, http_request_duration_seconds) > 2
        for: 5m
        labels:
          severity: warning

  - name: business
    rules:
      - alert: NoGamesLogged
        expr: rate(games_logged_total[1h]) == 0
        for: 1h
        labels:
          severity: warning
        annotations:
          summary: "No games logged in the last hour"
```

---

## 5. Security Architecture

### 5.1 Authentication Flow

**Clerk Authentication Integration:**

```
Authentication Flow:
┌─────────┐      ┌─────────┐      ┌─────────┐      ┌─────────┐
│ Client  │─────▶│  Clerk  │─────▶│   API   │─────▶│   DB    │
└─────────┘      └─────────┘      └─────────┘      └─────────┘
     │                │                │                │
     │  1. Login      │                │                │
     │───────────────▶│                │                │
     │                │                │                │
     │  2. Session    │                │                │
     │◀───────────────│                │                │
     │                │                │                │
     │  3. API Call + Token            │                │
     │─────────────────────────────────▶                │
     │                │                │                │
     │                │ 4. Verify      │                │
     │                │◀───────────────│                │
     │                │                │                │
     │                │ 5. User Data   │                │
     │                │───────────────▶│                │
     │                │                │  6. Query      │
     │                │                │───────────────▶│
     │                │                │                │
     │  7. Response   │                │                │
     │◀────────────────────────────────│                │
```

**Session Management:**
```typescript
// middleware/auth.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isPublicRoute = createRouteMatcher([
  '/',
  '/courts(.*)',
  '/tournaments(.*)',
  '/api/public(.*)',
  '/api/webhooks(.*)'
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});
```

**API Authentication:**
```typescript
// api/middleware/auth.ts
import { verifyToken } from '@clerk/backend';

export async function authMiddleware(c: Context, next: Next) {
  const token = c.req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY!
    });

    c.set('userId', payload.sub);
    c.set('sessionId', payload.sid);

    await next();
  } catch (error) {
    return c.json({ error: 'Invalid token' }, 401);
  }
}
```

### 5.2 Authorization Model

**Role-Based Access Control (RBAC):**

```typescript
// auth/roles.ts
export const Roles = {
  USER: 'user',
  CLUB_ADMIN: 'club_admin',
  CLUB_MEMBER: 'club_member',
  TOURNAMENT_DIRECTOR: 'tournament_director',
  LEAGUE_ADMIN: 'league_admin',
  SYSTEM_ADMIN: 'system_admin'
} as const;

export const Permissions = {
  // Game permissions
  'game:create': [Roles.USER],
  'game:update': [Roles.USER], // Only own games
  'game:delete': [Roles.USER, Roles.SYSTEM_ADMIN],
  'game:verify': [Roles.USER], // Only as participant

  // Tournament permissions
  'tournament:create': [Roles.TOURNAMENT_DIRECTOR, Roles.CLUB_ADMIN],
  'tournament:manage': [Roles.TOURNAMENT_DIRECTOR],
  'tournament:register': [Roles.USER],

  // Club permissions
  'club:create': [Roles.USER],
  'club:manage': [Roles.CLUB_ADMIN],
  'club:moderate': [Roles.CLUB_ADMIN, Roles.CLUB_MEMBER],

  // Admin permissions
  'admin:users': [Roles.SYSTEM_ADMIN],
  'admin:content': [Roles.SYSTEM_ADMIN]
} as const;
```

**Attribute-Based Access Control (ABAC):**

```typescript
// auth/policies.ts
import { createPolicy } from './policy-engine';

// User can only update their own profile
export const profileUpdatePolicy = createPolicy({
  resource: 'profile',
  action: 'update',
  condition: (user, resource) => user.id === resource.userId
});

// User can only delete their own games (if not yet verified)
export const gameDeletePolicy = createPolicy({
  resource: 'game',
  action: 'delete',
  condition: (user, resource) =>
    user.id === resource.createdBy &&
    resource.status === 'pending_verification'
});

// Club admin can manage their own club
export const clubManagePolicy = createPolicy({
  resource: 'club',
  action: 'manage',
  condition: async (user, resource) => {
    const membership = await getMembership(user.id, resource.id);
    return membership?.role === 'admin';
  }
});
```

**Policy Enforcement:**
```typescript
// api/middleware/authorize.ts
export function authorize(permission: Permission, getResource?: ResourceGetter) {
  return async (c: Context, next: Next) => {
    const userId = c.get('userId');
    const user = await getUser(userId);

    // Check role-based permission
    const allowedRoles = Permissions[permission];
    const hasRole = user.roles.some(r => allowedRoles.includes(r));

    if (!hasRole) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    // Check attribute-based policy if resource specified
    if (getResource) {
      const resource = await getResource(c);
      const policy = policies[permission];

      if (policy && !await policy.evaluate(user, resource)) {
        return c.json({ error: 'Forbidden' }, 403);
      }
    }

    await next();
  };
}

// Usage in routes
app.patch('/games/:id',
  authMiddleware,
  authorize('game:update', (c) => getGame(c.req.param('id'))),
  updateGameHandler
);
```

### 5.3 Data Protection

**Encryption:**
```
Data Encryption Strategy:
├── In Transit
│   ├── TLS 1.3 for all connections
│   ├── HTTPS enforced via Cloudflare
│   └── WebSocket over WSS
├── At Rest
│   ├── PostgreSQL: Encrypted storage (Railway)
│   ├── Redis: In-memory (ephemeral data)
│   ├── R2: Server-side encryption
│   └── Backups: AES-256 encrypted
└── Application Level
    ├── Sensitive fields (API keys, tokens)
    ├── User PII (optional encryption)
    └── Key management via environment variables
```

**PII Handling:**
```typescript
// utils/pii.ts
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex');

export function encryptPII(plaintext: string): EncryptedData {
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, KEY, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  return {
    encrypted,
    iv: iv.toString('hex'),
    tag: cipher.getAuthTag().toString('hex')
  };
}

export function decryptPII(data: EncryptedData): string {
  const decipher = createDecipheriv(
    ALGORITHM,
    KEY,
    Buffer.from(data.iv, 'hex')
  );
  decipher.setAuthTag(Buffer.from(data.tag, 'hex'));

  let decrypted = decipher.update(data.encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
```

**Data Retention Policy:**
```
Retention Periods:
├── User accounts: Until deletion requested + 30 days grace
├── Game records: Indefinite (core feature)
├── Chat messages: 2 years
├── Notifications: 90 days
├── Session data: 30 days
├── Audit logs: 7 years
├── Analytics: Aggregated after 2 years
└── Backups: 90 days rolling
```

### 5.4 API Security

**Rate Limiting:**
```typescript
// middleware/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, '1 m'), // 100 requests per minute
  analytics: true
});

// Tiered rate limits
const rateLimits = {
  anonymous: Ratelimit.slidingWindow(20, '1 m'),
  authenticated: Ratelimit.slidingWindow(100, '1 m'),
  premium: Ratelimit.slidingWindow(500, '1 m'),
  api_partner: Ratelimit.slidingWindow(1000, '1 m')
};

export async function rateLimitMiddleware(c: Context, next: Next) {
  const userId = c.get('userId');
  const tier = await getUserTier(userId);
  const limiter = rateLimits[tier] || rateLimits.anonymous;

  const identifier = userId || c.req.header('x-forwarded-for') || 'anonymous';
  const { success, limit, remaining, reset } = await limiter.limit(identifier);

  c.header('X-RateLimit-Limit', limit.toString());
  c.header('X-RateLimit-Remaining', remaining.toString());
  c.header('X-RateLimit-Reset', reset.toString());

  if (!success) {
    return c.json({ error: 'Rate limit exceeded' }, 429);
  }

  await next();
}
```

**Input Validation:**
```typescript
// validation/schemas.ts
import { z } from 'zod';

export const createGameSchema = z.object({
  type: z.enum(['singles', 'doubles']),
  courtId: z.string().uuid().optional(),
  participants: z.array(z.object({
    userId: z.string().uuid(),
    team: z.enum(['team1', 'team2'])
  })).min(2).max(4),
  scores: z.array(z.object({
    team1: z.number().int().min(0).max(21),
    team2: z.number().int().min(0).max(21)
  })).min(1).max(5),
  playedAt: z.string().datetime()
});

// Middleware for validation
export function validate<T>(schema: z.ZodSchema<T>) {
  return async (c: Context, next: Next) => {
    try {
      const body = await c.req.json();
      const validated = schema.parse(body);
      c.set('validatedBody', validated);
      await next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return c.json({
          error: 'Validation failed',
          details: error.errors
        }, 400);
      }
      throw error;
    }
  };
}
```

**Security Headers:**
```typescript
// middleware/security.ts
import { secureHeaders } from 'hono/secure-headers';

app.use('*', secureHeaders({
  contentSecurityPolicy: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'", "https://js.clerk.dev"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", "data:", "https:", "blob:"],
    connectSrc: ["'self'", "https://api.clerk.dev", "wss:"],
    fontSrc: ["'self'", "https://fonts.gstatic.com"],
    objectSrc: ["'none'"],
    frameAncestors: ["'none'"],
    upgradeInsecureRequests: []
  },
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  referrerPolicy: 'strict-origin-when-cross-origin',
  strictTransportSecurity: { maxAge: 31536000, includeSubDomains: true }
}));
```

**CSRF Protection:**
```typescript
// For state-changing operations via forms
app.use('/api/*', csrf({
  origin: ['https://pickleballapp.com', 'https://staging.pickleballapp.com']
}));
```

---

## 6. Scalability Considerations

### 6.1 Database Scaling Strategy

**Read Replicas:**
```
Database Topology:
┌─────────────────┐
│    Primary      │◀─────── Writes
│   PostgreSQL    │
└────────┬────────┘
         │ Streaming
         │ Replication
    ┌────┴────┐
    ▼         ▼
┌────────┐ ┌────────┐
│Replica1│ │Replica2│◀─── Reads
└────────┘ └────────┘
```

**Connection Pooling:**
```typescript
// db/pool.ts
import { Pool } from 'pg';

// Primary pool for writes
export const primaryPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});

// Replica pool for reads
export const replicaPool = new Pool({
  connectionString: process.env.DATABASE_REPLICA_URL,
  max: 50,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});

// Query routing
export async function query(sql: string, params: any[], readOnly = true) {
  const pool = readOnly ? replicaPool : primaryPool;
  return pool.query(sql, params);
}
```

**Table Partitioning:**
```sql
-- Partition games table by month
CREATE TABLE games (
    id UUID PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL,
    -- other columns
) PARTITION BY RANGE (created_at);

-- Create partitions
CREATE TABLE games_2024_01 PARTITION OF games
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

-- Auto-create partitions via pg_partman
SELECT partman.create_parent(
    p_parent_table := 'public.games',
    p_control := 'created_at',
    p_type := 'native',
    p_interval := 'monthly'
);
```

### 6.2 Caching Strategy

**Multi-Tier Caching:**
```typescript
// cache/tiered.ts
import { LRUCache } from 'lru-cache';
import Redis from 'ioredis';

// L1: In-memory LRU cache (per-process)
const l1Cache = new LRUCache<string, any>({
  max: 1000,
  ttl: 1000 * 60 // 1 minute
});

// L2: Redis distributed cache
const redis = new Redis(process.env.REDIS_URL);

export async function get<T>(key: string): Promise<T | null> {
  // Check L1
  const l1Value = l1Cache.get(key);
  if (l1Value !== undefined) {
    return l1Value as T;
  }

  // Check L2
  const l2Value = await redis.get(key);
  if (l2Value) {
    const parsed = JSON.parse(l2Value);
    l1Cache.set(key, parsed); // Promote to L1
    return parsed as T;
  }

  return null;
}

export async function set<T>(
  key: string,
  value: T,
  ttlSeconds = 3600
): Promise<void> {
  const serialized = JSON.stringify(value);

  // Set in both tiers
  l1Cache.set(key, value);
  await redis.set(key, serialized, 'EX', ttlSeconds);
}

export async function invalidate(key: string): Promise<void> {
  l1Cache.delete(key);
  await redis.del(key);

  // Publish invalidation for other processes
  await redis.publish('cache:invalidate', key);
}
```

**Cache Invalidation Patterns:**
```typescript
// cache/invalidation.ts

// Subscribe to invalidation events
redis.subscribe('cache:invalidate', (channel, key) => {
  l1Cache.delete(key);
});

// Pattern-based invalidation
export async function invalidatePattern(pattern: string): Promise<void> {
  const keys = await redis.keys(pattern);
  if (keys.length > 0) {
    await redis.del(...keys);
  }

  // Notify all instances
  await redis.publish('cache:invalidate:pattern', pattern);
}

// Event-driven invalidation
EventBus.subscribe('user.updated', async (event) => {
  await invalidate(`user:${event.userId}:profile`);
  await invalidatePattern(`user:${event.userId}:*`);
});

EventBus.subscribe('game.completed', async (event) => {
  // Invalidate affected users' stats
  for (const participant of event.participants) {
    await invalidate(`user:${participant}:stats`);
    await invalidate(`user:${participant}:ratings`);
  }

  // Invalidate leaderboards
  await invalidatePattern('leaderboard:*');
});
```

### 6.3 CDN Usage

**Cloudflare Configuration:**
```
CDN Strategy:
├── Static Assets (Cache Everything)
│   ├── /static/* - 1 year cache
│   ├── /_next/static/* - 1 year cache (hashed)
│   └── /images/* - 7 days cache
├── API Responses (Cache Selective)
│   ├── /api/courts/* - 5 minutes (stale-while-revalidate)
│   ├── /api/tournaments/* - 1 minute (public listings)
│   └── /api/leaderboards/* - 1 minute
├── Dynamic Content (No Cache)
│   ├── /api/users/* - no-store
│   ├── /api/games/* - no-store (except public)
│   └── /api/auth/* - no-store
└── Pages
    ├── Static pages - ISR (60 seconds)
    ├── User pages - no-cache
    └── Public profiles - 5 minutes
```

**Cache Headers:**
```typescript
// Static asset headers (Next.js)
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ]
      },
      {
        source: '/api/courts/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=300, stale-while-revalidate=600'
          }
        ]
      }
    ];
  }
};
```

### 6.4 Load Balancing

**Application Load Balancing:**
```
Load Balancer Configuration:
├── Algorithm: Least Connections (default)
├── Health Checks
│   ├── Path: /health
│   ├── Interval: 10 seconds
│   ├── Timeout: 5 seconds
│   └── Unhealthy threshold: 3 failures
├── Session Affinity: None (stateless API)
├── Connection Draining: 30 seconds
└── Auto-scaling
    ├── Min instances: 3
    ├── Max instances: 10
    ├── Scale up: CPU > 70% for 5 minutes
    └── Scale down: CPU < 30% for 10 minutes
```

**WebSocket Load Balancing:**
```typescript
// For sticky sessions with Socket.IO
// Use Redis adapter for horizontal scaling

import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

const pubClient = createClient({ url: process.env.REDIS_URL });
const subClient = pubClient.duplicate();

io.adapter(createAdapter(pubClient, subClient));

// Health check endpoint
app.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    connections: io.engine.clientsCount
  });
});
```

### 6.5 Scaling Projections

**Traffic Estimates:**
```
Phase 1 (MVP - 3 months):
├── Users: 10,000
├── DAU: 1,000
├── Requests/day: 100,000
├── DB size: 5GB
└── Infrastructure: 1 API server, 1 DB

Phase 2 (Growth - 6 months):
├── Users: 50,000
├── DAU: 10,000
├── Requests/day: 1,000,000
├── DB size: 25GB
└── Infrastructure: 2 API servers, 1 DB + replica

Phase 3 (Scale - 12 months):
├── Users: 200,000
├── DAU: 50,000
├── Requests/day: 5,000,000
├── DB size: 100GB
└── Infrastructure: 3-5 API servers, 1 DB + 2 replicas
```

---

## 7. Architecture Decision Records

### ADR-001: PWA over Native Mobile Apps

**Status:** Accepted

**Context:**
Need to support mobile users while managing development resources.

**Decision:**
Build a Progressive Web App (PWA) instead of native iOS/Android apps.

**Rationale:**
- Single codebase for web and mobile
- Faster time to market
- Lower development and maintenance costs
- Offline capabilities via service workers
- App-like experience with install prompts
- No app store approval delays

**Consequences:**
- (+) 60% faster development compared to native + web
- (+) Unified user experience across platforms
- (+) Easier updates without app store approval
- (-) No access to some native features (NFC, advanced Bluetooth)
- (-) iOS Safari has PWA limitations (no push on older versions)

**Mitigation:**
- iOS 16.4+ supports push notifications for PWAs
- Core features do not require native-only APIs
- Native apps can be added in Phase 4 if needed

---

### ADR-002: Modular Monolith Architecture

**Status:** Accepted

**Context:**
Need to balance development velocity with future scalability.

**Decision:**
Start with a modular monolith with clear domain boundaries.

**Rationale:**
- Faster initial development
- Simpler deployment and operations
- Lower infrastructure costs
- Clear module boundaries enable future extraction
- Reduced distributed system complexity

**Consequences:**
- (+) Ship MVP faster
- (+) Single deployment simplifies DevOps
- (+) Refactoring is local, not distributed
- (-) Must enforce module boundaries through discipline
- (-) Eventually may need to extract services for scale

**Mitigation:**
- Event-driven communication between modules
- Clear API contracts at module boundaries
- Regular architecture reviews
- Document extraction candidates

---

### ADR-003: PostgreSQL with PostGIS for Geospatial

**Status:** Accepted

**Context:**
Court finder requires efficient geospatial queries.

**Decision:**
Use PostgreSQL with PostGIS extension.

**Rationale:**
- Mature, battle-tested database
- PostGIS is industry-standard for geospatial
- Supports all query types needed (proximity, bounding box, polygon)
- Strong ecosystem and tooling
- Cost-effective compared to specialized geo databases

**Alternatives Considered:**
- MongoDB: Geospatial support less mature, less ACID
- Elasticsearch: Overhead for primary database
- Dedicated geo service: Unnecessary complexity

**Consequences:**
- (+) Single database for all data types
- (+) Strong query capabilities
- (+) Well-supported by ORMs
- (-) Requires PostGIS knowledge
- (-) Some indexing complexity for geo queries

---

### ADR-004: Clerk for Authentication

**Status:** Accepted

**Context:**
Need secure, feature-complete authentication with minimal development.

**Decision:**
Use Clerk as managed authentication provider.

**Rationale:**
- Complete auth solution (UI, session, user management)
- Social logins out of the box
- Security handled by experts
- Good React/Next.js integration
- Reasonable pricing for scale

**Alternatives Considered:**
- Auth.js: More flexibility but more work
- Auth0: Enterprise-focused, expensive
- Custom: Security risk, maintenance burden

**Consequences:**
- (+) Faster development
- (+) Security best practices built-in
- (+) Handles compliance (SOC 2)
- (-) Vendor dependency
- (-) Monthly cost at scale

**Mitigation:**
- Abstract auth behind interface for future migration
- Export user data regularly as backup

---

### ADR-005: Event-Driven Architecture for Module Communication

**Status:** Accepted

**Context:**
Modules need to communicate without tight coupling.

**Decision:**
Use event-driven architecture for inter-module communication.

**Rationale:**
- Loose coupling between modules
- Enables async processing
- Natural fit for notifications, updates
- Supports future service extraction
- Audit trail via event log

**Implementation:**
```typescript
// Event bus abstraction
interface EventBus {
  publish<T>(event: string, payload: T): Promise<void>;
  subscribe<T>(event: string, handler: (payload: T) => Promise<void>): void;
}

// Redis-backed implementation for horizontal scaling
class RedisEventBus implements EventBus {
  async publish<T>(event: string, payload: T): Promise<void> {
    await redis.publish(event, JSON.stringify(payload));
    await redis.xadd('events', '*', 'event', event, 'payload', JSON.stringify(payload));
  }

  subscribe<T>(event: string, handler: (payload: T) => Promise<void>): void {
    redis.subscribe(event, async (channel, message) => {
      const payload = JSON.parse(message);
      await handler(payload);
    });
  }
}
```

**Consequences:**
- (+) Modules can evolve independently
- (+) Easy to add new consumers
- (+) Supports eventual consistency
- (-) Debugging distributed events is harder
- (-) Eventual consistency requires careful handling

---

### ADR-006: Offline-First with CRDT Conflict Resolution

**Status:** Accepted

**Context:**
Tournament scoring and game logging must work without internet.

**Decision:**
Implement offline-first architecture with CRDT-based conflict resolution.

**Rationale:**
- Critical feature for tournament venues (poor connectivity)
- Users expect mobile-app-like reliability
- CRDTs provide mathematically guaranteed conflict resolution
- Better UX than last-write-wins

**Implementation:**
- IndexedDB for local storage
- Background sync API for deferred uploads
- Automerge for CRDT implementation
- Event sourcing for game scores

**Consequences:**
- (+) Full functionality offline
- (+) Automatic conflict resolution
- (+) Reliable tournament scoring
- (-) Increased complexity
- (-) Larger client bundle
- (-) Testing complexity

---

### ADR-007: Meilisearch over Elasticsearch

**Status:** Accepted

**Context:**
Need full-text and geospatial search for courts, players, tournaments.

**Decision:**
Use Meilisearch instead of Elasticsearch.

**Rationale:**
- Simpler setup and operation
- Built-in typo tolerance (important for names)
- Native geo search
- Lower resource requirements
- Open source with cloud option
- Fast indexing

**Alternatives Considered:**
- Elasticsearch: Overkill for our needs, complex ops
- Typesense: Good but less mature geo support
- Algolia: Expensive at scale
- PostgreSQL FTS: Not as feature-rich

**Consequences:**
- (+) Easy to set up and maintain
- (+) Great search UX out of box
- (+) Lower infrastructure costs
- (-) Less battle-tested than Elasticsearch
- (-) Fewer advanced features

---

### ADR-008: Hono over Express/Fastify

**Status:** Accepted

**Context:**
Need a fast, TypeScript-first API framework.

**Decision:**
Use Hono for the API layer.

**Rationale:**
- Extremely fast (benchmarks show 10x faster than Express)
- First-class TypeScript support
- Works on multiple runtimes (Node, Deno, Bun, Cloudflare Workers)
- Small bundle size
- Built-in middleware for common needs

**Alternatives Considered:**
- Express: Industry standard but slow, callback-based
- Fastify: Fast but more complex plugin system
- NestJS: Too heavy for our needs

**Consequences:**
- (+) Better performance
- (+) Cleaner TypeScript types
- (+) Future flexibility in runtime choice
- (-) Smaller ecosystem than Express
- (-) Team may need to learn new patterns

---

## Appendix A: Technology Evaluation Matrix

| Category | Selected | Runner-up | Criteria |
|----------|----------|-----------|----------|
| Frontend Framework | Next.js 14 | Remix | SSR, PWA, TypeScript, ecosystem |
| State Management | Zustand + TanStack Query | Redux Toolkit | Simplicity, TypeScript, caching |
| UI Components | shadcn/ui + Tailwind | Chakra UI | Customization, accessibility, bundle size |
| Backend Framework | Hono | Fastify | Performance, TypeScript, portability |
| Database | PostgreSQL 16 | PlanetScale | ACID, PostGIS, maturity, cost |
| Cache | Redis 7 | Memcached | Data structures, pub/sub, persistence |
| Search | Meilisearch | Typesense | Typo tolerance, geo, simplicity |
| Auth | Clerk | Auth.js | Time to market, features, security |
| File Storage | Cloudflare R2 | AWS S3 | Egress costs, CDN integration |
| Hosting (Frontend) | Vercel | Cloudflare Pages | Next.js optimization, DX |
| Hosting (Backend) | Railway | Render | PostgreSQL support, DX, pricing |

---

## Appendix B: Security Checklist

- [ ] TLS 1.3 enforced on all connections
- [ ] HTTPS-only with HSTS headers
- [ ] Secure session management via Clerk
- [ ] CSRF protection on state-changing operations
- [ ] Input validation with Zod schemas
- [ ] SQL injection prevention via parameterized queries
- [ ] XSS prevention via CSP headers
- [ ] Rate limiting on all endpoints
- [ ] API key rotation capability
- [ ] Audit logging for sensitive operations
- [ ] Data encryption at rest
- [ ] PII encryption for sensitive fields
- [ ] Regular dependency vulnerability scanning
- [ ] Penetration testing before launch

---

## Appendix C: Performance Budgets

| Metric | Target | Measurement |
|--------|--------|-------------|
| First Contentful Paint | < 1.5s | Lighthouse |
| Time to Interactive | < 3.0s | Lighthouse |
| Largest Contentful Paint | < 2.5s | Lighthouse |
| Cumulative Layout Shift | < 0.1 | Lighthouse |
| First Input Delay | < 100ms | Lighthouse |
| API Response Time (p95) | < 200ms | Server metrics |
| API Response Time (p99) | < 500ms | Server metrics |
| Database Query Time (p95) | < 50ms | Query metrics |
| Search Latency (p95) | < 100ms | Meilisearch metrics |
| Bundle Size (initial) | < 150KB (gzipped) | Build output |
| Bundle Size (total) | < 500KB (gzipped) | Build output |

---

## Document Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | January 2026 | System Architect | Initial architecture document |

---

*This document serves as the authoritative reference for all technical decisions and system design for the Pickleball Web Application.*
