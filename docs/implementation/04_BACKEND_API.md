# Backend API Documentation

## Pickleball Web Application - API Specification v1.0

---

## Table of Contents

1. [API Design Principles](#1-api-design-principles)
2. [Authentication & Authorization](#2-authentication--authorization)
3. [API Endpoints](#3-api-endpoints)
4. [Real-time Events](#4-real-time-events)
5. [Background Jobs](#5-background-jobs)
6. [External Integrations](#6-external-integrations)
7. [Error Handling](#7-error-handling)
8. [Rate Limiting](#8-rate-limiting)

---

## 1. API Design Principles

### 1.1 RESTful Conventions

All API endpoints follow REST architectural principles:

| Principle | Implementation |
|-----------|----------------|
| **Stateless** | Each request contains all information needed; no server-side session state |
| **Resource-Based** | URLs represent resources (nouns), not actions (verbs) |
| **HTTP Methods** | GET (read), POST (create), PUT (replace), PATCH (partial update), DELETE (remove) |
| **HATEOAS** | Responses include links to related resources where appropriate |

### 1.2 URL Structure

```
https://api.pickleballapp.com/v1/{resource}/{id}/{sub-resource}
```

**Examples:**
```
GET    /v1/users/123/games          # User's games
POST   /v1/courts/456/reviews       # Add court review
GET    /v1/tournaments/789/brackets # Tournament brackets
```

### 1.3 Versioning Strategy

**Header-Based with URL Fallback:**

```http
# Preferred: Accept header
Accept: application/vnd.pickleballapp.v1+json

# Fallback: URL path
GET /v1/users/123
```

**Version Lifecycle:**
- **Current (v1)**: Fully supported, actively developed
- **Deprecated**: 6-month warning period, limited support
- **Sunset**: Removed after deprecation period

### 1.4 Request/Response Format

**Content Type:** `application/json`

**Standard Request Headers:**
```http
Content-Type: application/json
Accept: application/json
Authorization: Bearer {access_token}
X-Request-ID: {uuid}           # For request tracing
X-Client-Version: 1.0.0        # Mobile app version
X-Platform: ios|android|web    # Client platform
```

**Standard Response Envelope:**
```json
{
  "success": true,
  "data": { },
  "meta": {
    "timestamp": "2026-01-20T10:30:00Z",
    "requestId": "req_abc123",
    "pagination": {
      "page": 1,
      "perPage": 20,
      "total": 150,
      "totalPages": 8
    }
  },
  "links": {
    "self": "/v1/users/123/games?page=1",
    "next": "/v1/users/123/games?page=2",
    "prev": null
  }
}
```

### 1.5 Pagination

**Cursor-Based (Preferred for feeds):**
```http
GET /v1/activity-feed?cursor=eyJpZCI6MTIzfQ&limit=20
```

**Offset-Based (For fixed lists):**
```http
GET /v1/courts?page=2&per_page=20&sort=-rating
```

### 1.6 Filtering & Sorting

```http
# Filtering
GET /v1/courts?city=Austin&surface=indoor&min_rating=4.0

# Sorting (prefix '-' for descending)
GET /v1/games?sort=-played_at,rating

# Field selection
GET /v1/users/123?fields=id,name,rating,avatar_url
```

---

## 2. Authentication & Authorization

### 2.1 Authentication Flow

**JWT-Based Authentication:**

```
┌─────────┐          ┌─────────┐          ┌─────────┐
│  Client │          │   API   │          │  Auth   │
└────┬────┘          └────┬────┘          └────┬────┘
     │                    │                    │
     │  POST /auth/login  │                    │
     │ ──────────────────>│                    │
     │                    │  Validate creds    │
     │                    │ ──────────────────>│
     │                    │  User + tokens     │
     │                    │ <──────────────────│
     │  access_token +    │                    │
     │  refresh_token     │                    │
     │ <──────────────────│                    │
     │                    │                    │
     │  GET /api/resource │                    │
     │  Authorization:    │                    │
     │  Bearer {token}    │                    │
     │ ──────────────────>│                    │
     │                    │  Verify JWT        │
     │  Response          │                    │
     │ <──────────────────│                    │
```

**Token Specifications:**

| Token Type | Lifetime | Storage | Purpose |
|------------|----------|---------|---------|
| Access Token | 15 minutes | Memory | API requests |
| Refresh Token | 7 days | Secure/HttpOnly cookie | Token renewal |
| Device Token | 30 days | Secure storage | Device binding |

### 2.2 Authorization Model

**Role-Based Access Control (RBAC):**

```json
{
  "roles": {
    "user": ["read:own", "write:own"],
    "club_admin": ["read:club", "write:club", "manage:members"],
    "league_admin": ["read:league", "write:league", "manage:schedule"],
    "tournament_director": ["read:tournament", "write:tournament", "manage:brackets"],
    "system_admin": ["*"]
  }
}
```

**Resource-Level Permissions:**
```json
{
  "user_id": "123",
  "permissions": [
    { "resource": "club:456", "role": "admin" },
    { "resource": "league:789", "role": "admin" },
    { "resource": "tournament:012", "role": "director" }
  ]
}
```

---

## 3. API Endpoints

### 3.1 Auth Module

#### POST /v1/auth/register
Create a new user account.

**Request:**
```json
{
  "email": "player@example.com",
  "password": "SecureP@ss123",
  "name": "John Smith",
  "phone": "+1-555-123-4567",
  "date_of_birth": "1985-06-15",
  "location": {
    "city": "Austin",
    "state": "TX",
    "country": "US"
  },
  "skill_level": "intermediate",
  "play_style": "doubles",
  "marketing_consent": true
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "usr_abc123",
      "email": "player@example.com",
      "name": "John Smith",
      "email_verified": false,
      "created_at": "2026-01-20T10:00:00Z"
    },
    "tokens": {
      "access_token": "eyJhbGciOiJSUzI1NiIs...",
      "refresh_token": "dGhpcyBpcyBhIHJlZnJl...",
      "expires_in": 900,
      "token_type": "Bearer"
    }
  }
}
```

**Validation Rules:**
- Email: Valid format, unique
- Password: Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special
- Phone: E.164 format (optional)
- Date of birth: Must be 13+ years old

---

#### POST /v1/auth/login
Authenticate existing user.

**Request:**
```json
{
  "email": "player@example.com",
  "password": "SecureP@ss123",
  "device_info": {
    "device_id": "dev_xyz789",
    "platform": "ios",
    "app_version": "1.0.0",
    "os_version": "17.2"
  }
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "usr_abc123",
      "email": "player@example.com",
      "name": "John Smith",
      "avatar_url": "https://cdn.pickleballapp.com/avatars/usr_abc123.jpg",
      "rating": {
        "singles": 3.75,
        "doubles": 4.0,
        "mixed": 3.85
      },
      "email_verified": true,
      "last_login_at": "2026-01-19T18:30:00Z"
    },
    "tokens": {
      "access_token": "eyJhbGciOiJSUzI1NiIs...",
      "refresh_token": "dGhpcyBpcyBhIHJlZnJl...",
      "expires_in": 900,
      "token_type": "Bearer"
    }
  }
}
```

**Error Response (401 Unauthorized):**
```json
{
  "success": false,
  "error": {
    "code": "AUTH_INVALID_CREDENTIALS",
    "message": "Invalid email or password",
    "details": null
  }
}
```

---

#### POST /v1/auth/oauth/{provider}
Authenticate via OAuth provider (Google, Apple).

**Providers:** `google`, `apple`

**Request:**
```json
{
  "id_token": "eyJhbGciOiJSUzI1NiIs...",
  "nonce": "abc123",
  "device_info": {
    "device_id": "dev_xyz789",
    "platform": "ios"
  }
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "user": { },
    "tokens": { },
    "is_new_user": false
  }
}
```

---

#### POST /v1/auth/refresh
Refresh access token.

**Request:**
```json
{
  "refresh_token": "dGhpcyBpcyBhIHJlZnJl..."
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJSUzI1NiIs...",
    "expires_in": 900,
    "token_type": "Bearer"
  }
}
```

---

#### POST /v1/auth/logout
Invalidate current session.

**Request:**
```json
{
  "refresh_token": "dGhpcyBpcyBhIHJlZnJl...",
  "all_devices": false
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "message": "Successfully logged out"
  }
}
```

---

#### POST /v1/auth/password/forgot
Initiate password reset.

**Request:**
```json
{
  "email": "player@example.com"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "message": "If an account exists, a reset link has been sent"
  }
}
```

---

#### POST /v1/auth/password/reset
Complete password reset.

**Request:**
```json
{
  "token": "rst_abc123xyz",
  "password": "NewSecureP@ss456"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "message": "Password successfully reset"
  }
}
```

---

#### POST /v1/auth/email/verify
Verify email address.

**Request:**
```json
{
  "token": "ver_abc123xyz"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "email_verified": true
  }
}
```

---

### 3.2 Users Module

#### GET /v1/users/{id}
Get user profile.

**Path Parameters:**
- `id`: User ID or `me` for current user

**Query Parameters:**
- `fields`: Comma-separated list of fields to return
- `include`: Related resources (`stats`, `achievements`, `recent_games`)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "usr_abc123",
    "email": "player@example.com",
    "name": "John Smith",
    "avatar_url": "https://cdn.pickleballapp.com/avatars/usr_abc123.jpg",
    "bio": "Weekend warrior who loves the kitchen game",
    "location": {
      "city": "Austin",
      "state": "TX",
      "country": "US",
      "coordinates": {
        "lat": 30.2672,
        "lng": -97.7431
      }
    },
    "rating": {
      "singles": 3.75,
      "doubles": 4.0,
      "mixed": 3.85,
      "dupr_id": "DPR123456",
      "dupr_synced_at": "2026-01-15T12:00:00Z"
    },
    "stats": {
      "games_played": 245,
      "wins": 156,
      "losses": 89,
      "win_rate": 0.637,
      "current_streak": 5,
      "longest_streak": 12
    },
    "preferences": {
      "preferred_times": ["morning", "evening"],
      "preferred_days": ["saturday", "sunday"],
      "travel_radius_miles": 25,
      "skill_range": [3.5, 4.5],
      "play_types": ["recreational", "competitive"]
    },
    "social": {
      "friends_count": 47,
      "mutual_friends": 3,
      "is_friend": false,
      "friend_request_sent": false
    },
    "privacy": {
      "profile_visibility": "public",
      "show_location": true,
      "show_availability": true
    },
    "created_at": "2024-03-15T10:00:00Z",
    "last_active_at": "2026-01-20T09:45:00Z"
  }
}
```

---

#### PATCH /v1/users/{id}
Update user profile.

**Request:**
```json
{
  "name": "John D. Smith",
  "bio": "4.0 player seeking competitive doubles partners",
  "avatar_url": "https://cdn.pickleballapp.com/avatars/new_avatar.jpg",
  "location": {
    "city": "Round Rock",
    "state": "TX"
  },
  "preferences": {
    "travel_radius_miles": 30,
    "skill_range": [3.75, 4.25]
  }
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "usr_abc123",
    "name": "John D. Smith",
    "updated_at": "2026-01-20T10:30:00Z"
  }
}
```

---

#### GET /v1/users/{id}/stats
Get detailed player statistics.

**Query Parameters:**
- `period`: `all_time`, `year`, `month`, `week`
- `game_type`: `singles`, `doubles`, `mixed`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "period": "all_time",
    "overview": {
      "games_played": 245,
      "wins": 156,
      "losses": 89,
      "win_rate": 0.637
    },
    "by_game_type": {
      "singles": {
        "games": 45,
        "wins": 28,
        "losses": 17,
        "win_rate": 0.622
      },
      "doubles": {
        "games": 150,
        "wins": 98,
        "losses": 52,
        "win_rate": 0.653
      },
      "mixed": {
        "games": 50,
        "wins": 30,
        "losses": 20,
        "win_rate": 0.600
      }
    },
    "rating_history": [
      { "date": "2026-01-01", "singles": 3.70, "doubles": 3.95, "mixed": 3.80 },
      { "date": "2026-01-15", "singles": 3.75, "doubles": 4.00, "mixed": 3.85 }
    ],
    "performance": {
      "avg_point_differential": 2.3,
      "games_to_11": 180,
      "games_to_15": 45,
      "games_to_21": 20,
      "tiebreakers_won": 12,
      "tiebreakers_lost": 8
    },
    "streaks": {
      "current": 5,
      "longest_win": 12,
      "longest_loss": 4
    },
    "frequent_partners": [
      {
        "user_id": "usr_def456",
        "name": "Jane Doe",
        "games_together": 45,
        "win_rate": 0.711
      }
    ],
    "frequent_opponents": [
      {
        "user_id": "usr_ghi789",
        "name": "Bob Wilson",
        "games_against": 12,
        "win_rate": 0.583
      }
    ]
  }
}
```

---

#### GET /v1/users/{id}/achievements
Get user achievements and badges.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "achievements": [
      {
        "id": "ach_first_game",
        "name": "First Rally",
        "description": "Play your first game",
        "icon_url": "https://cdn.pickleballapp.com/achievements/first_game.png",
        "earned_at": "2024-03-15T14:30:00Z",
        "rarity": "common"
      },
      {
        "id": "ach_100_games",
        "name": "Century Club",
        "description": "Play 100 games",
        "icon_url": "https://cdn.pickleballapp.com/achievements/100_games.png",
        "earned_at": "2025-06-20T11:00:00Z",
        "rarity": "rare"
      },
      {
        "id": "ach_tournament_win",
        "name": "Tournament Champion",
        "description": "Win a tournament",
        "icon_url": "https://cdn.pickleballapp.com/achievements/tournament_win.png",
        "earned_at": "2025-11-15T16:45:00Z",
        "rarity": "epic"
      }
    ],
    "progress": [
      {
        "id": "ach_500_games",
        "name": "Dedicated Player",
        "description": "Play 500 games",
        "current": 245,
        "target": 500,
        "progress_percent": 49
      }
    ],
    "stats": {
      "total_earned": 15,
      "total_available": 50,
      "points": 1250
    }
  }
}
```

---

#### GET /v1/users/{id}/availability
Get user's availability schedule.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "weekly_schedule": {
      "monday": [
        { "start": "06:00", "end": "08:00", "preference": "high" },
        { "start": "18:00", "end": "21:00", "preference": "medium" }
      ],
      "tuesday": [],
      "wednesday": [
        { "start": "18:00", "end": "20:00", "preference": "high" }
      ],
      "thursday": [],
      "friday": [
        { "start": "17:00", "end": "21:00", "preference": "high" }
      ],
      "saturday": [
        { "start": "08:00", "end": "12:00", "preference": "high" },
        { "start": "14:00", "end": "18:00", "preference": "medium" }
      ],
      "sunday": [
        { "start": "09:00", "end": "13:00", "preference": "high" }
      ]
    },
    "exceptions": [
      {
        "date": "2026-01-25",
        "available": false,
        "reason": "Traveling"
      },
      {
        "date": "2026-02-01",
        "available": true,
        "times": [
          { "start": "10:00", "end": "16:00" }
        ]
      }
    ],
    "timezone": "America/Chicago"
  }
}
```

---

#### PUT /v1/users/{id}/availability
Update user's availability.

**Request:**
```json
{
  "weekly_schedule": {
    "saturday": [
      { "start": "08:00", "end": "14:00", "preference": "high" }
    ]
  },
  "exceptions": [
    {
      "date": "2026-01-25",
      "available": false,
      "reason": "Traveling"
    }
  ]
}
```

---

#### GET /v1/users/{id}/games
Get user's game history.

**Query Parameters:**
- `game_type`: `singles`, `doubles`, `mixed`
- `result`: `win`, `loss`
- `start_date`, `end_date`: Date range filters
- `partner_id`: Filter by partner
- `opponent_id`: Filter by opponent
- `court_id`: Filter by court
- `page`, `per_page`: Pagination

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "games": [
      {
        "id": "gam_abc123",
        "game_type": "doubles",
        "played_at": "2026-01-19T14:30:00Z",
        "court": {
          "id": "crt_xyz789",
          "name": "Austin Pickle Ranch",
          "court_number": 3
        },
        "teams": {
          "team_1": {
            "players": [
              { "id": "usr_abc123", "name": "John Smith" },
              { "id": "usr_def456", "name": "Jane Doe" }
            ],
            "score": 11
          },
          "team_2": {
            "players": [
              { "id": "usr_ghi789", "name": "Bob Wilson" },
              { "id": "usr_jkl012", "name": "Alice Brown" }
            ],
            "score": 7
          }
        },
        "winner": "team_1",
        "user_result": "win",
        "rating_change": {
          "before": 3.95,
          "after": 4.00,
          "change": 0.05
        },
        "verified": true,
        "verified_by": ["usr_ghi789", "usr_jkl012"]
      }
    ]
  },
  "meta": {
    "pagination": {
      "page": 1,
      "per_page": 20,
      "total": 245,
      "total_pages": 13
    }
  }
}
```

---

### 3.3 Courts Module

#### GET /v1/courts
Search for courts.

**Query Parameters:**
- `lat`, `lng`: Center point for geo search (required for geo queries)
- `radius`: Search radius in miles (default: 25, max: 100)
- `surface`: `indoor`, `outdoor`, `both`
- `amenities`: Comma-separated list (`lights`, `restrooms`, `parking`, `pro_shop`)
- `min_rating`: Minimum average rating (1-5)
- `open_now`: Boolean - currently open
- `has_availability`: Boolean - has courts available soon
- `sort`: `distance`, `rating`, `popularity`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "courts": [
      {
        "id": "crt_xyz789",
        "name": "Austin Pickle Ranch",
        "description": "Premier dedicated pickleball facility with 12 courts",
        "address": {
          "street": "1234 Pickle Lane",
          "city": "Austin",
          "state": "TX",
          "zip": "78701",
          "country": "US"
        },
        "coordinates": {
          "lat": 30.2749,
          "lng": -97.7405
        },
        "distance_miles": 2.3,
        "contact": {
          "phone": "+1-512-555-1234",
          "email": "info@austinpickleranch.com",
          "website": "https://austinpickleranch.com"
        },
        "court_info": {
          "total_courts": 12,
          "indoor_courts": 4,
          "outdoor_courts": 8,
          "surface_type": "SportMaster",
          "net_type": "permanent"
        },
        "amenities": [
          "lights",
          "restrooms",
          "parking",
          "pro_shop",
          "water_fountains",
          "seating"
        ],
        "hours": {
          "monday": { "open": "06:00", "close": "22:00" },
          "tuesday": { "open": "06:00", "close": "22:00" },
          "wednesday": { "open": "06:00", "close": "22:00" },
          "thursday": { "open": "06:00", "close": "22:00" },
          "friday": { "open": "06:00", "close": "23:00" },
          "saturday": { "open": "07:00", "close": "23:00" },
          "sunday": { "open": "07:00", "close": "21:00" }
        },
        "pricing": {
          "type": "hourly",
          "drop_in": 8.00,
          "court_rental": 25.00,
          "membership_required": false
        },
        "rating": {
          "average": 4.6,
          "count": 128,
          "breakdown": {
            "5": 78,
            "4": 35,
            "3": 10,
            "2": 3,
            "1": 2
          }
        },
        "photos": [
          {
            "url": "https://cdn.pickleballapp.com/courts/crt_xyz789/photo1.jpg",
            "caption": "Main court area"
          }
        ],
        "verified": true,
        "last_verified_at": "2026-01-10T15:00:00Z"
      }
    ]
  },
  "meta": {
    "search_center": { "lat": 30.2672, "lng": -97.7431 },
    "search_radius_miles": 25,
    "total_results": 15
  }
}
```

---

#### GET /v1/courts/{id}
Get detailed court information.

**Query Parameters:**
- `include`: `reviews`, `availability`, `events`, `photos`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "crt_xyz789",
    "name": "Austin Pickle Ranch",
    "... (full court details as above)",
    "availability": {
      "today": [
        {
          "court_number": 1,
          "slots": [
            { "start": "14:00", "end": "15:00", "available": true },
            { "start": "15:00", "end": "16:00", "available": false, "booked_by": "Open Play" },
            { "start": "16:00", "end": "17:00", "available": true }
          ]
        }
      ]
    },
    "upcoming_events": [
      {
        "id": "evt_abc123",
        "type": "open_play",
        "name": "Evening Open Play",
        "start_time": "2026-01-20T18:00:00Z",
        "end_time": "2026-01-20T21:00:00Z",
        "skill_levels": ["3.0", "3.5", "4.0"],
        "spots_available": 8
      }
    ],
    "recent_reviews": [
      {
        "id": "rev_def456",
        "user": {
          "id": "usr_abc123",
          "name": "John Smith",
          "avatar_url": "https://cdn.pickleballapp.com/avatars/usr_abc123.jpg"
        },
        "rating": 5,
        "comment": "Best facility in Austin! Courts are well-maintained.",
        "created_at": "2026-01-15T10:30:00Z"
      }
    ]
  }
}
```

---

#### POST /v1/courts
Add a new court (requires verification).

**Request:**
```json
{
  "name": "Neighborhood Park Courts",
  "address": {
    "street": "500 Park Ave",
    "city": "Austin",
    "state": "TX",
    "zip": "78702"
  },
  "coordinates": {
    "lat": 30.2600,
    "lng": -97.7200
  },
  "court_info": {
    "total_courts": 4,
    "indoor_courts": 0,
    "outdoor_courts": 4,
    "surface_type": "concrete"
  },
  "amenities": ["lights", "parking"],
  "access_type": "public",
  "photos": ["base64_encoded_image_data"]
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "crt_new123",
    "status": "pending_verification",
    "message": "Court submitted for verification. We'll notify you once approved."
  }
}
```

---

#### GET /v1/courts/{id}/reviews
Get court reviews.

**Query Parameters:**
- `sort`: `recent`, `rating_high`, `rating_low`, `helpful`
- `rating`: Filter by star rating (1-5)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "reviews": [
      {
        "id": "rev_def456",
        "user": {
          "id": "usr_abc123",
          "name": "John Smith",
          "avatar_url": "https://cdn.pickleballapp.com/avatars/usr_abc123.jpg",
          "games_at_court": 15
        },
        "rating": 5,
        "comment": "Best facility in Austin! Courts are well-maintained and staff is friendly.",
        "aspects": {
          "court_condition": 5,
          "amenities": 4,
          "parking": 5,
          "value": 4
        },
        "photos": [],
        "helpful_count": 12,
        "user_found_helpful": false,
        "created_at": "2026-01-15T10:30:00Z",
        "updated_at": null
      }
    ]
  },
  "meta": {
    "summary": {
      "average_rating": 4.6,
      "total_reviews": 128,
      "rating_distribution": { "5": 78, "4": 35, "3": 10, "2": 3, "1": 2 }
    }
  }
}
```

---

#### POST /v1/courts/{id}/reviews
Add a court review.

**Request:**
```json
{
  "rating": 5,
  "comment": "Great courts! Well-lit for evening play.",
  "aspects": {
    "court_condition": 5,
    "amenities": 4,
    "parking": 5,
    "value": 4
  },
  "photos": []
}
```

---

### 3.4 Games Module

#### POST /v1/games
Create/log a new game.

**Request (Singles):**
```json
{
  "game_type": "singles",
  "format": {
    "win_by": 2,
    "points_to_win": 11
  },
  "court_id": "crt_xyz789",
  "court_number": 3,
  "played_at": "2026-01-20T14:30:00Z",
  "players": {
    "player_1": {
      "user_id": "usr_abc123"
    },
    "player_2": {
      "user_id": "usr_def456"
    }
  },
  "scores": {
    "player_1": 11,
    "player_2": 8
  },
  "notes": "Great competitive game!"
}
```

**Request (Doubles):**
```json
{
  "game_type": "doubles",
  "format": {
    "win_by": 2,
    "points_to_win": 11
  },
  "court_id": "crt_xyz789",
  "court_number": 3,
  "played_at": "2026-01-20T14:30:00Z",
  "teams": {
    "team_1": {
      "players": [
        { "user_id": "usr_abc123" },
        { "user_id": "usr_ghi789" }
      ]
    },
    "team_2": {
      "players": [
        { "user_id": "usr_def456" },
        { "user_id": "usr_jkl012" }
      ]
    }
  },
  "scores": {
    "team_1": 11,
    "team_2": 7
  }
}
```

**Request (Multi-game match):**
```json
{
  "game_type": "doubles",
  "match_format": "best_of_3",
  "court_id": "crt_xyz789",
  "played_at": "2026-01-20T14:30:00Z",
  "teams": {
    "team_1": {
      "players": [
        { "user_id": "usr_abc123" },
        { "user_id": "usr_ghi789" }
      ]
    },
    "team_2": {
      "players": [
        { "user_id": "usr_def456" },
        { "user_id": "usr_jkl012" }
      ]
    }
  },
  "games": [
    { "team_1_score": 11, "team_2_score": 9 },
    { "team_1_score": 8, "team_2_score": 11 },
    { "team_1_score": 11, "team_2_score": 6 }
  ]
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "gam_new123",
    "game_type": "doubles",
    "status": "pending_verification",
    "verification": {
      "required_confirmations": 2,
      "current_confirmations": 1,
      "confirmed_by": ["usr_abc123"],
      "pending": ["usr_def456", "usr_ghi789", "usr_jkl012"]
    },
    "created_at": "2026-01-20T15:00:00Z"
  }
}
```

---

#### POST /v1/games/{id}/verify
Verify game results.

**Request:**
```json
{
  "action": "confirm",
  "notes": "Scores are correct"
}
```

**Alternative - Dispute:**
```json
{
  "action": "dispute",
  "reason": "Score was 11-9, not 11-7",
  "proposed_scores": {
    "team_1": 11,
    "team_2": 9
  }
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "gam_new123",
    "status": "verified",
    "verification": {
      "required_confirmations": 2,
      "current_confirmations": 2,
      "confirmed_by": ["usr_abc123", "usr_def456"],
      "verified_at": "2026-01-20T15:30:00Z"
    },
    "rating_changes": [
      { "user_id": "usr_abc123", "change": 0.05, "new_rating": 4.00 },
      { "user_id": "usr_ghi789", "change": 0.03, "new_rating": 3.78 },
      { "user_id": "usr_def456", "change": -0.03, "new_rating": 3.72 },
      { "user_id": "usr_jkl012", "change": -0.04, "new_rating": 3.56 }
    ]
  }
}
```

---

#### GET /v1/games/{id}
Get game details.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "gam_abc123",
    "game_type": "doubles",
    "format": {
      "win_by": 2,
      "points_to_win": 11
    },
    "status": "verified",
    "played_at": "2026-01-19T14:30:00Z",
    "duration_minutes": 25,
    "court": {
      "id": "crt_xyz789",
      "name": "Austin Pickle Ranch",
      "court_number": 3
    },
    "teams": {
      "team_1": {
        "players": [
          {
            "id": "usr_abc123",
            "name": "John Smith",
            "rating_at_game": 3.95,
            "rating_change": 0.05
          },
          {
            "id": "usr_ghi789",
            "name": "Mike Johnson",
            "rating_at_game": 3.75,
            "rating_change": 0.03
          }
        ],
        "score": 11
      },
      "team_2": {
        "players": [
          {
            "id": "usr_def456",
            "name": "Jane Doe",
            "rating_at_game": 3.75,
            "rating_change": -0.03
          },
          {
            "id": "usr_jkl012",
            "name": "Alice Brown",
            "rating_at_game": 3.60,
            "rating_change": -0.04
          }
        ],
        "score": 7
      }
    },
    "winner": "team_1",
    "verification": {
      "status": "verified",
      "verified_at": "2026-01-19T15:00:00Z",
      "confirmed_by": ["usr_def456", "usr_jkl012"]
    },
    "context": {
      "league_id": null,
      "tournament_id": null,
      "club_id": "clb_abc123",
      "event_id": "evt_xyz789"
    },
    "created_at": "2026-01-19T14:55:00Z",
    "created_by": "usr_abc123"
  }
}
```

---

### 3.5 Matchmaking Module

#### POST /v1/matchmaking/requests
Create a game request.

**Request:**
```json
{
  "game_type": "doubles",
  "looking_for": "partner_and_opponents",
  "skill_range": {
    "min": 3.5,
    "max": 4.5
  },
  "location": {
    "lat": 30.2672,
    "lng": -97.7431,
    "radius_miles": 15
  },
  "preferred_courts": ["crt_xyz789", "crt_abc456"],
  "time_preferences": [
    {
      "date": "2026-01-21",
      "start_time": "18:00",
      "end_time": "21:00"
    },
    {
      "date": "2026-01-22",
      "start_time": "09:00",
      "end_time": "12:00"
    }
  ],
  "play_style": "competitive",
  "notes": "Looking for serious games to prepare for upcoming tournament"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "req_abc123",
    "status": "active",
    "matches_found": 3,
    "potential_matches": [
      {
        "user_id": "usr_match1",
        "name": "Sarah Wilson",
        "rating": 4.0,
        "distance_miles": 3.2,
        "compatibility_score": 0.92,
        "mutual_availability": ["2026-01-21T18:00:00Z"]
      }
    ],
    "expires_at": "2026-01-22T21:00:00Z"
  }
}
```

---

#### GET /v1/matchmaking/suggestions
Get match suggestions based on preferences.

**Query Parameters:**
- `game_type`: `singles`, `doubles`, `mixed`
- `date`: Specific date
- `time_of_day`: `morning`, `afternoon`, `evening`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "suggestions": [
      {
        "type": "player",
        "user": {
          "id": "usr_sug123",
          "name": "Chris Taylor",
          "avatar_url": "https://cdn.pickleballapp.com/avatars/usr_sug123.jpg",
          "rating": 3.9,
          "distance_miles": 4.5
        },
        "compatibility": {
          "score": 0.88,
          "factors": {
            "skill_match": 0.95,
            "location": 0.90,
            "availability_overlap": 0.75,
            "play_style": 0.85,
            "mutual_friends": 2
          }
        },
        "available_times": [
          { "date": "2026-01-21", "slots": ["18:00-20:00", "20:00-22:00"] }
        ]
      },
      {
        "type": "open_play",
        "event": {
          "id": "evt_abc123",
          "name": "Tuesday Night Open Play",
          "court": {
            "id": "crt_xyz789",
            "name": "Austin Pickle Ranch"
          },
          "date": "2026-01-21",
          "time": "18:00-21:00",
          "skill_levels": ["3.5", "4.0"],
          "spots_available": 4
        },
        "compatibility": {
          "score": 0.85,
          "factors": {
            "skill_match": 0.90,
            "location": 0.80,
            "time_preference": 0.85
          }
        }
      }
    ]
  }
}
```

---

#### POST /v1/matchmaking/requests/{id}/respond
Respond to a match request.

**Request:**
```json
{
  "action": "accept",
  "proposed_time": {
    "date": "2026-01-21",
    "start_time": "18:00",
    "court_id": "crt_xyz789"
  },
  "message": "Looking forward to playing!"
}
```

---

#### GET /v1/matchmaking/find-players
Quick search for available players.

**Query Parameters:**
- `lat`, `lng`: Location
- `radius`: Search radius in miles
- `skill_min`, `skill_max`: Rating range
- `available_now`: Boolean
- `game_type`: `singles`, `doubles`, `mixed`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "players": [
      {
        "id": "usr_abc123",
        "name": "John Smith",
        "avatar_url": "https://cdn.pickleballapp.com/avatars/usr_abc123.jpg",
        "rating": 4.0,
        "distance_miles": 2.1,
        "available_until": "21:00",
        "looking_for": "doubles",
        "preferred_courts": [
          { "id": "crt_xyz789", "name": "Austin Pickle Ranch" }
        ]
      }
    ],
    "total": 8
  }
}
```

---

### 3.6 Social Module

#### GET /v1/users/{id}/friends
Get user's friends list.

**Query Parameters:**
- `status`: `accepted`, `pending_sent`, `pending_received`
- `mutual_only`: Boolean
- `search`: Search by name

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "friends": [
      {
        "id": "usr_friend1",
        "name": "Jane Doe",
        "avatar_url": "https://cdn.pickleballapp.com/avatars/usr_friend1.jpg",
        "rating": {
          "doubles": 4.0
        },
        "status": "accepted",
        "friends_since": "2025-03-15T10:00:00Z",
        "games_together": 45,
        "last_played": "2026-01-15T14:00:00Z",
        "online_status": "online"
      }
    ],
    "pending_requests": {
      "sent": 2,
      "received": 3
    }
  }
}
```

---

#### POST /v1/users/{id}/friends
Send friend request.

**Request:**
```json
{
  "user_id": "usr_target123",
  "message": "Great playing with you at the tournament!"
}
```

---

#### PUT /v1/users/{id}/friends/{friend_id}
Accept/reject friend request.

**Request:**
```json
{
  "action": "accept"
}
```

---

#### DELETE /v1/users/{id}/friends/{friend_id}
Remove friend.

---

#### GET /v1/activity-feed
Get activity feed.

**Query Parameters:**
- `filter`: `all`, `friends`, `clubs`, `nearby`
- `cursor`: Pagination cursor
- `limit`: Items per page (default: 20)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "act_abc123",
        "type": "game_result",
        "actor": {
          "id": "usr_abc123",
          "name": "John Smith",
          "avatar_url": "https://cdn.pickleballapp.com/avatars/usr_abc123.jpg"
        },
        "content": {
          "game_id": "gam_xyz789",
          "result": "won",
          "score": "11-7",
          "opponent": "Jane Doe",
          "game_type": "singles",
          "rating_change": 0.05
        },
        "timestamp": "2026-01-20T15:30:00Z",
        "interactions": {
          "likes": 5,
          "comments": 2,
          "user_liked": false
        }
      },
      {
        "id": "act_def456",
        "type": "achievement",
        "actor": {
          "id": "usr_friend1",
          "name": "Mike Johnson",
          "avatar_url": "https://cdn.pickleballapp.com/avatars/usr_friend1.jpg"
        },
        "content": {
          "achievement_id": "ach_100_games",
          "name": "Century Club",
          "description": "Played 100 games",
          "icon_url": "https://cdn.pickleballapp.com/achievements/100_games.png"
        },
        "timestamp": "2026-01-20T12:00:00Z",
        "interactions": {
          "likes": 12,
          "comments": 5,
          "user_liked": true
        }
      },
      {
        "id": "act_ghi789",
        "type": "club_event",
        "actor": {
          "id": "clb_abc123",
          "name": "Austin Pickleball Club",
          "avatar_url": "https://cdn.pickleballapp.com/clubs/clb_abc123.jpg"
        },
        "content": {
          "event_id": "evt_xyz789",
          "event_type": "open_play",
          "name": "Saturday Morning Open Play",
          "date": "2026-01-25",
          "time": "09:00-12:00",
          "spots_available": 12
        },
        "timestamp": "2026-01-20T10:00:00Z"
      }
    ],
    "next_cursor": "eyJpZCI6ImFjdF9naGk3ODkiLCJ0cyI6MTcwNTc0NjAwMH0="
  }
}
```

---

#### POST /v1/activity-feed/{id}/like
Like an activity.

---

#### POST /v1/activity-feed/{id}/comments
Comment on an activity.

**Request:**
```json
{
  "content": "Great game! Congrats on the win!"
}
```

---

#### GET /v1/notifications
Get user notifications.

**Query Parameters:**
- `unread_only`: Boolean
- `type`: Filter by notification type
- `cursor`, `limit`: Pagination

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "ntf_abc123",
        "type": "game_invite",
        "title": "Game Invitation",
        "body": "Jane Doe invited you to play doubles tomorrow at 6 PM",
        "data": {
          "game_request_id": "req_xyz789",
          "from_user_id": "usr_def456"
        },
        "read": false,
        "created_at": "2026-01-20T10:00:00Z"
      },
      {
        "id": "ntf_def456",
        "type": "game_verification",
        "title": "Verify Game Results",
        "body": "Please verify the results of your game with Mike Johnson",
        "data": {
          "game_id": "gam_abc123"
        },
        "read": false,
        "created_at": "2026-01-20T09:30:00Z"
      }
    ],
    "unread_count": 5
  }
}
```

---

#### PATCH /v1/notifications/{id}
Mark notification as read.

**Request:**
```json
{
  "read": true
}
```

---

#### POST /v1/notifications/mark-all-read
Mark all notifications as read.

---

### 3.7 Clubs Module

#### GET /v1/clubs
Search for clubs.

**Query Parameters:**
- `lat`, `lng`, `radius`: Geo search
- `search`: Text search
- `membership_type`: `open`, `application`, `invite_only`
- `has_open_play`: Boolean
- `skill_levels`: Comma-separated

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "clubs": [
      {
        "id": "clb_abc123",
        "name": "Austin Pickleball Club",
        "description": "Austin's premier recreational pickleball community",
        "logo_url": "https://cdn.pickleballapp.com/clubs/clb_abc123.jpg",
        "cover_photo_url": "https://cdn.pickleballapp.com/clubs/clb_abc123_cover.jpg",
        "location": {
          "city": "Austin",
          "state": "TX"
        },
        "home_courts": [
          {
            "id": "crt_xyz789",
            "name": "Austin Pickle Ranch",
            "is_primary": true
          }
        ],
        "membership": {
          "type": "open",
          "count": 245,
          "fee": null
        },
        "skill_levels": ["2.5", "3.0", "3.5", "4.0", "4.5"],
        "activities": {
          "weekly_open_play": 3,
          "upcoming_events": 2
        },
        "rating": {
          "average": 4.7,
          "count": 89
        },
        "user_membership": null
      }
    ]
  }
}
```

---

#### POST /v1/clubs
Create a new club.

**Request:**
```json
{
  "name": "Cedar Park Picklers",
  "description": "A friendly community of pickleball players in Cedar Park",
  "location": {
    "city": "Cedar Park",
    "state": "TX"
  },
  "membership_type": "open",
  "skill_levels": ["3.0", "3.5", "4.0"],
  "contact_email": "cedarparkpicklers@example.com",
  "social_links": {
    "facebook": "https://facebook.com/groups/cedarparkpicklers"
  }
}
```

---

#### GET /v1/clubs/{id}
Get club details.

**Query Parameters:**
- `include`: `members`, `events`, `open_play_schedule`, `announcements`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "clb_abc123",
    "name": "Austin Pickleball Club",
    "description": "Austin's premier recreational pickleball community. We welcome players of all skill levels!",
    "logo_url": "https://cdn.pickleballapp.com/clubs/clb_abc123.jpg",
    "cover_photo_url": "https://cdn.pickleballapp.com/clubs/clb_abc123_cover.jpg",
    "location": {
      "city": "Austin",
      "state": "TX",
      "address": "Various locations around Austin"
    },
    "contact": {
      "email": "info@austinpickleballclub.com",
      "phone": "+1-512-555-9876",
      "website": "https://austinpickleballclub.com"
    },
    "social_links": {
      "facebook": "https://facebook.com/austinpickleballclub",
      "instagram": "@austinpickleballclub"
    },
    "home_courts": [
      {
        "id": "crt_xyz789",
        "name": "Austin Pickle Ranch",
        "is_primary": true
      },
      {
        "id": "crt_abc456",
        "name": "Bartholomew Park",
        "is_primary": false
      }
    ],
    "membership": {
      "type": "open",
      "fee": null,
      "member_count": 245,
      "admin_count": 5
    },
    "skill_levels": ["2.5", "3.0", "3.5", "4.0", "4.5"],
    "open_play_schedule": [
      {
        "id": "ops_abc123",
        "name": "Tuesday Evening Open Play",
        "day_of_week": "tuesday",
        "start_time": "18:00",
        "end_time": "21:00",
        "court": {
          "id": "crt_xyz789",
          "name": "Austin Pickle Ranch"
        },
        "skill_levels": ["3.0", "3.5", "4.0"],
        "recurring": true
      },
      {
        "id": "ops_def456",
        "name": "Saturday Morning Social",
        "day_of_week": "saturday",
        "start_time": "08:00",
        "end_time": "12:00",
        "court": {
          "id": "crt_abc456",
          "name": "Bartholomew Park"
        },
        "skill_levels": ["all"],
        "recurring": true
      }
    ],
    "upcoming_events": [
      {
        "id": "evt_club123",
        "type": "tournament",
        "name": "Monthly Club Tournament",
        "date": "2026-02-01",
        "registration_open": true
      }
    ],
    "announcements": [
      {
        "id": "ann_abc123",
        "title": "Court Closure Notice",
        "content": "Bartholomew Park courts will be closed for maintenance on Jan 25.",
        "author": {
          "id": "usr_admin1",
          "name": "Club Admin"
        },
        "pinned": true,
        "created_at": "2026-01-18T10:00:00Z"
      }
    ],
    "stats": {
      "total_games": 5420,
      "active_members_this_month": 178,
      "events_this_month": 12
    },
    "user_membership": {
      "status": "member",
      "role": "member",
      "joined_at": "2025-06-15T10:00:00Z"
    },
    "created_at": "2024-01-15T10:00:00Z"
  }
}
```

---

#### POST /v1/clubs/{id}/join
Join a club.

**Request:**
```json
{
  "message": "Looking forward to playing with everyone!"
}
```

**Response (200 OK or 202 Accepted):**
```json
{
  "success": true,
  "data": {
    "membership": {
      "status": "pending_approval",
      "requested_at": "2026-01-20T10:00:00Z"
    }
  }
}
```

---

#### DELETE /v1/clubs/{id}/membership
Leave a club.

---

#### GET /v1/clubs/{id}/members
Get club members.

**Query Parameters:**
- `role`: `admin`, `member`
- `search`: Search by name
- `skill_level`: Filter by skill level

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "members": [
      {
        "user": {
          "id": "usr_abc123",
          "name": "John Smith",
          "avatar_url": "https://cdn.pickleballapp.com/avatars/usr_abc123.jpg",
          "rating": 4.0
        },
        "role": "admin",
        "joined_at": "2024-01-15T10:00:00Z",
        "games_with_club": 156
      }
    ],
    "total": 245
  }
}
```

---

#### POST /v1/clubs/{id}/events
Create a club event.

**Request:**
```json
{
  "type": "open_play",
  "name": "Friday Night Lights",
  "description": "Competitive open play under the lights",
  "court_id": "crt_xyz789",
  "date": "2026-01-24",
  "start_time": "19:00",
  "end_time": "22:00",
  "skill_levels": ["3.5", "4.0", "4.5"],
  "max_participants": 24,
  "registration_required": true,
  "fee": 10.00
}
```

---

#### GET /v1/clubs/{id}/open-play
Get club's open play schedule.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "recurring_sessions": [
      {
        "id": "ops_abc123",
        "name": "Tuesday Evening Open Play",
        "day_of_week": "tuesday",
        "start_time": "18:00",
        "end_time": "21:00",
        "court": {
          "id": "crt_xyz789",
          "name": "Austin Pickle Ranch"
        },
        "skill_levels": ["3.0", "3.5", "4.0"],
        "format": "round_robin",
        "organizer": {
          "id": "usr_org123",
          "name": "Open Play Coordinator"
        },
        "avg_attendance": 18
      }
    ],
    "upcoming_instances": [
      {
        "session_id": "ops_abc123",
        "date": "2026-01-21",
        "registered_count": 14,
        "max_participants": 24,
        "user_registered": false
      }
    ]
  }
}
```

---

### 3.8 Leagues Module

#### GET /v1/leagues
Search for leagues.

**Query Parameters:**
- `lat`, `lng`, `radius`: Geo search
- `search`: Text search
- `format`: `singles`, `doubles`, `mixed`
- `status`: `registration_open`, `in_progress`, `completed`
- `skill_level`: Rating range

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "leagues": [
      {
        "id": "lea_abc123",
        "name": "Austin Winter Doubles League",
        "description": "8-week competitive doubles league",
        "organizer": {
          "type": "club",
          "id": "clb_abc123",
          "name": "Austin Pickleball Club"
        },
        "format": {
          "type": "doubles",
          "team_size": 2,
          "matches_per_week": 1
        },
        "skill_levels": ["3.5-4.0"],
        "schedule": {
          "registration_opens": "2026-01-01T00:00:00Z",
          "registration_closes": "2026-01-20T23:59:59Z",
          "season_start": "2026-01-27",
          "season_end": "2026-03-16",
          "weeks": 8
        },
        "registration": {
          "status": "open",
          "teams_registered": 12,
          "max_teams": 16,
          "fee": 50.00
        },
        "location": {
          "courts": [
            { "id": "crt_xyz789", "name": "Austin Pickle Ranch" }
          ],
          "city": "Austin",
          "state": "TX"
        }
      }
    ]
  }
}
```

---

#### POST /v1/leagues
Create a new league.

**Request:**
```json
{
  "name": "Spring Singles League",
  "description": "Competitive singles league for intermediate players",
  "format": {
    "type": "singles",
    "matches_per_week": 1,
    "games_per_match": 3,
    "points_per_game": 11
  },
  "skill_levels": ["3.0-3.5"],
  "schedule": {
    "registration_opens": "2026-02-01",
    "registration_closes": "2026-02-20",
    "season_start": "2026-02-24",
    "weeks": 6
  },
  "registration": {
    "max_players": 20,
    "fee": 30.00
  },
  "court_ids": ["crt_xyz789"],
  "match_days": ["monday", "wednesday"],
  "match_times": {
    "start": "18:00",
    "end": "21:00"
  }
}
```

---

#### GET /v1/leagues/{id}
Get league details.

**Query Parameters:**
- `include`: `standings`, `schedule`, `teams`, `results`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "lea_abc123",
    "name": "Austin Winter Doubles League",
    "description": "8-week competitive doubles league",
    "rules": "Standard USAPA rules. Best of 3 games to 11.",
    "organizer": {
      "type": "club",
      "id": "clb_abc123",
      "name": "Austin Pickleball Club"
    },
    "directors": [
      {
        "id": "usr_dir123",
        "name": "League Director",
        "role": "commissioner"
      }
    ],
    "format": {
      "type": "doubles",
      "team_size": 2,
      "matches_per_week": 1,
      "games_per_match": 3,
      "points_per_game": 11,
      "playoff_teams": 4
    },
    "skill_levels": ["3.5-4.0"],
    "schedule": {
      "registration_opens": "2026-01-01T00:00:00Z",
      "registration_closes": "2026-01-20T23:59:59Z",
      "season_start": "2026-01-27",
      "season_end": "2026-03-16",
      "playoff_start": "2026-03-23",
      "weeks": 8,
      "current_week": 2
    },
    "registration": {
      "status": "closed",
      "teams_registered": 16,
      "max_teams": 16,
      "fee": 50.00
    },
    "location": {
      "courts": [
        {
          "id": "crt_xyz789",
          "name": "Austin Pickle Ranch",
          "address": "1234 Pickle Lane, Austin, TX"
        }
      ],
      "match_days": ["monday", "wednesday"],
      "match_times": {
        "start": "18:00",
        "end": "21:00"
      }
    },
    "standings": [
      {
        "rank": 1,
        "team": {
          "id": "team_abc123",
          "name": "Dink Masters",
          "players": [
            { "id": "usr_abc123", "name": "John Smith" },
            { "id": "usr_def456", "name": "Jane Doe" }
          ]
        },
        "stats": {
          "matches_played": 2,
          "matches_won": 2,
          "matches_lost": 0,
          "games_won": 6,
          "games_lost": 1,
          "points_for": 95,
          "points_against": 67,
          "win_percentage": 1.0
        }
      }
    ],
    "user_participation": {
      "team_id": "team_abc123",
      "role": "player"
    }
  }
}
```

---

#### POST /v1/leagues/{id}/register
Register for a league.

**Request (Doubles - with partner):**
```json
{
  "team_name": "Kitchen Ninjas",
  "partner_user_id": "usr_partner123"
}
```

**Request (Singles):**
```json
{
  "display_name": "John S."
}
```

---

#### GET /v1/leagues/{id}/standings
Get league standings.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "standings": [
      {
        "rank": 1,
        "previous_rank": 2,
        "team": {
          "id": "team_abc123",
          "name": "Dink Masters",
          "players": [
            { "id": "usr_abc123", "name": "John Smith", "rating": 4.0 },
            { "id": "usr_def456", "name": "Jane Doe", "rating": 3.85 }
          ]
        },
        "stats": {
          "matches_played": 4,
          "matches_won": 4,
          "matches_lost": 0,
          "games_won": 12,
          "games_lost": 3,
          "points_for": 195,
          "points_against": 134,
          "point_differential": 61,
          "win_percentage": 1.0,
          "streak": "W4"
        }
      }
    ],
    "last_updated": "2026-02-10T22:00:00Z"
  }
}
```

---

#### GET /v1/leagues/{id}/schedule
Get league schedule.

**Query Parameters:**
- `week`: Specific week number
- `team_id`: Filter by team

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "weeks": [
      {
        "week_number": 3,
        "start_date": "2026-02-10",
        "end_date": "2026-02-16",
        "matches": [
          {
            "id": "match_abc123",
            "scheduled_time": "2026-02-12T18:30:00Z",
            "court": {
              "id": "crt_xyz789",
              "name": "Austin Pickle Ranch",
              "court_number": 1
            },
            "team_1": {
              "id": "team_abc123",
              "name": "Dink Masters"
            },
            "team_2": {
              "id": "team_def456",
              "name": "Net Ninjas"
            },
            "status": "scheduled",
            "result": null
          }
        ]
      }
    ]
  }
}
```

---

#### POST /v1/leagues/{id}/matches/{match_id}/result
Submit match result.

**Request:**
```json
{
  "games": [
    { "team_1_score": 11, "team_2_score": 7 },
    { "team_1_score": 9, "team_2_score": 11 },
    { "team_1_score": 11, "team_2_score": 5 }
  ],
  "notes": "Great competitive match!"
}
```

---

### 3.9 Tournaments Module

#### GET /v1/tournaments
Search for tournaments.

**Query Parameters:**
- `lat`, `lng`, `radius`: Geo search
- `search`: Text search
- `format`: `singles`, `doubles`, `mixed`
- `status`: `registration_open`, `upcoming`, `in_progress`, `completed`
- `skill_level`: Rating range
- `start_date`, `end_date`: Date range
- `sanctioned`: Boolean (PPA/APP sanctioned)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "tournaments": [
      {
        "id": "trn_abc123",
        "name": "Austin Open Championship",
        "description": "Annual Austin pickleball championship",
        "organizer": {
          "type": "organization",
          "id": "org_abc123",
          "name": "Texas Pickleball Association"
        },
        "format": {
          "type": "multi_event",
          "events": ["mens_singles", "womens_singles", "mens_doubles", "womens_doubles", "mixed_doubles"]
        },
        "dates": {
          "start": "2026-02-15",
          "end": "2026-02-17",
          "registration_opens": "2026-01-01T00:00:00Z",
          "registration_closes": "2026-02-10T23:59:59Z"
        },
        "location": {
          "venue": "Austin Convention Center",
          "address": "500 E Cesar Chavez St, Austin, TX 78701",
          "coordinates": {
            "lat": 30.2628,
            "lng": -97.7394
          }
        },
        "registration": {
          "status": "open",
          "total_registered": 245,
          "max_participants": 400,
          "entry_fee_range": {
            "min": 40,
            "max": 75
          }
        },
        "skill_levels": ["3.0", "3.5", "4.0", "4.5", "5.0", "Open"],
        "prize_pool": 10000,
        "sanctioned": true,
        "sanctioning_body": "USA Pickleball",
        "external_registration_url": "https://pickleballtournaments.com/event/austin-open"
      }
    ]
  }
}
```

---

#### POST /v1/tournaments
Create a new tournament.

**Request:**
```json
{
  "name": "Club Championship 2026",
  "description": "Annual club championship tournament",
  "type": "club",
  "events": [
    {
      "name": "Mixed Doubles 3.5",
      "format": "mixed_doubles",
      "skill_level": "3.5",
      "bracket_type": "double_elimination",
      "entry_fee": 30,
      "max_teams": 16
    },
    {
      "name": "Mixed Doubles 4.0",
      "format": "mixed_doubles",
      "skill_level": "4.0",
      "bracket_type": "double_elimination",
      "entry_fee": 30,
      "max_teams": 16
    }
  ],
  "dates": {
    "start": "2026-03-01",
    "end": "2026-03-01",
    "registration_opens": "2026-02-01",
    "registration_closes": "2026-02-25"
  },
  "location": {
    "court_ids": ["crt_xyz789"],
    "venue_name": "Austin Pickle Ranch"
  },
  "rules": "Standard USAPA rules. Rally scoring to 11, win by 2."
}
```

---

#### GET /v1/tournaments/{id}
Get tournament details.

**Query Parameters:**
- `include`: `events`, `brackets`, `schedule`, `results`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "trn_abc123",
    "name": "Austin Open Championship",
    "description": "Annual Austin pickleball championship featuring players from across Texas",
    "organizer": {
      "type": "organization",
      "id": "org_abc123",
      "name": "Texas Pickleball Association"
    },
    "directors": [
      {
        "id": "usr_dir123",
        "name": "Tournament Director",
        "role": "head_director"
      }
    ],
    "dates": {
      "start": "2026-02-15",
      "end": "2026-02-17",
      "registration_opens": "2026-01-01T00:00:00Z",
      "registration_closes": "2026-02-10T23:59:59Z"
    },
    "location": {
      "venue": "Austin Convention Center",
      "address": "500 E Cesar Chavez St, Austin, TX 78701",
      "coordinates": { "lat": 30.2628, "lng": -97.7394 },
      "courts_count": 24
    },
    "events": [
      {
        "id": "evt_ms35",
        "name": "Men's Singles 3.5",
        "format": "mens_singles",
        "skill_level": "3.5",
        "bracket_type": "double_elimination",
        "entry_fee": 40,
        "prize_money": 500,
        "registration": {
          "registered": 28,
          "max_participants": 32,
          "waitlist": 4
        },
        "status": "registration_open",
        "scheduled_date": "2026-02-15"
      },
      {
        "id": "evt_md40",
        "name": "Men's Doubles 4.0",
        "format": "mens_doubles",
        "skill_level": "4.0",
        "bracket_type": "double_elimination",
        "entry_fee": 50,
        "prize_money": 1000,
        "registration": {
          "registered": 24,
          "max_teams": 32,
          "waitlist": 0
        },
        "status": "registration_open",
        "scheduled_date": "2026-02-16"
      }
    ],
    "schedule": {
      "days": [
        {
          "date": "2026-02-15",
          "events": ["evt_ms35", "evt_ws35", "evt_ms40"],
          "start_time": "08:00",
          "estimated_end": "18:00"
        }
      ]
    },
    "rules": "Standard USA Pickleball rules apply. All matches rally scoring to 11, win by 2.",
    "amenities": ["Spectator seating", "Food vendors", "Pro shop", "Free parking"],
    "contact": {
      "email": "tournament@texaspickleball.com",
      "phone": "+1-512-555-0100"
    },
    "external_links": {
      "registration": "https://pickleballtournaments.com/event/austin-open",
      "website": "https://austinopenpickleball.com"
    },
    "prize_pool": 10000,
    "sanctioned": true,
    "sanctioning_body": "USA Pickleball",
    "user_registration": {
      "events": [
        {
          "event_id": "evt_md40",
          "status": "registered",
          "partner": {
            "id": "usr_partner123",
            "name": "Partner Name"
          },
          "seed": null
        }
      ]
    }
  }
}
```

---

#### POST /v1/tournaments/{id}/events/{event_id}/register
Register for tournament event.

**Request (Singles):**
```json
{
  "emergency_contact": {
    "name": "Jane Smith",
    "phone": "+1-512-555-1234",
    "relationship": "spouse"
  },
  "waiver_accepted": true
}
```

**Request (Doubles):**
```json
{
  "partner_user_id": "usr_partner123",
  "team_name": "Dynamic Duo",
  "emergency_contact": {
    "name": "Jane Smith",
    "phone": "+1-512-555-1234",
    "relationship": "spouse"
  },
  "waiver_accepted": true
}
```

---

#### GET /v1/tournaments/{id}/events/{event_id}/bracket
Get event bracket.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "event_id": "evt_md40",
    "bracket_type": "double_elimination",
    "status": "in_progress",
    "rounds": {
      "winners": [
        {
          "round": 1,
          "name": "Round of 16",
          "matches": [
            {
              "id": "match_w1_1",
              "position": 1,
              "court": { "number": 1, "name": "Center Court" },
              "scheduled_time": "2026-02-16T09:00:00Z",
              "team_1": {
                "seed": 1,
                "id": "team_abc123",
                "name": "Smith/Johnson",
                "players": [
                  { "id": "usr_abc123", "name": "John Smith" },
                  { "id": "usr_def456", "name": "Mike Johnson" }
                ]
              },
              "team_2": {
                "seed": 16,
                "id": "team_def456",
                "name": "Williams/Brown",
                "players": [
                  { "id": "usr_ghi789", "name": "Tom Williams" },
                  { "id": "usr_jkl012", "name": "Dave Brown" }
                ]
              },
              "status": "completed",
              "scores": [
                { "team_1": 11, "team_2": 5 },
                { "team_1": 11, "team_2": 7 }
              ],
              "winner": "team_1"
            }
          ]
        },
        {
          "round": 2,
          "name": "Quarterfinals",
          "matches": []
        }
      ],
      "losers": [
        {
          "round": 1,
          "name": "Losers Round 1",
          "matches": []
        }
      ],
      "finals": {
        "championship": null,
        "if_necessary": null
      }
    },
    "seeding": [
      { "seed": 1, "team_id": "team_abc123", "name": "Smith/Johnson", "rating": 4.25 },
      { "seed": 2, "team_id": "team_xyz789", "name": "Davis/Miller", "rating": 4.20 }
    ]
  }
}
```

---

#### POST /v1/tournaments/{id}/events/{event_id}/matches/{match_id}/score
Submit match score (Director only).

**Request:**
```json
{
  "games": [
    { "team_1_score": 11, "team_2_score": 8 },
    { "team_1_score": 9, "team_2_score": 11 },
    { "team_1_score": 11, "team_2_score": 6 }
  ],
  "winner": "team_1",
  "duration_minutes": 45,
  "notes": "Exciting match with great rallies"
}
```

---

#### WebSocket /v1/tournaments/{id}/live
Connect to live tournament updates.

**Events Emitted:**
```json
{
  "type": "match_start",
  "data": {
    "match_id": "match_w2_1",
    "event_id": "evt_md40",
    "court": 1,
    "teams": ["Smith/Johnson", "Davis/Miller"]
  }
}

{
  "type": "score_update",
  "data": {
    "match_id": "match_w2_1",
    "game": 1,
    "scores": { "team_1": 7, "team_2": 5 },
    "server": "team_1"
  }
}

{
  "type": "match_complete",
  "data": {
    "match_id": "match_w2_1",
    "winner": "team_1",
    "final_scores": [
      { "team_1": 11, "team_2": 8 },
      { "team_1": 11, "team_2": 6 }
    ]
  }
}
```

---

#### GET /v1/tournaments/{id}/director/dashboard
Tournament director dashboard (Director only).

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "overview": {
      "total_registered": 312,
      "checked_in": 289,
      "matches_completed": 145,
      "matches_remaining": 67,
      "courts_active": 18,
      "courts_available": 6
    },
    "current_matches": [
      {
        "match_id": "match_w2_1",
        "event": "Men's Doubles 4.0",
        "court": 1,
        "teams": ["Smith/Johnson", "Davis/Miller"],
        "status": "in_progress",
        "current_score": { "game": 2, "team_1": 8, "team_2": 6 },
        "started_at": "2026-02-16T10:30:00Z"
      }
    ],
    "upcoming_matches": [
      {
        "match_id": "match_w2_2",
        "event": "Men's Doubles 4.0",
        "scheduled_time": "2026-02-16T11:00:00Z",
        "teams": ["Williams/Brown", "Taylor/Wilson"],
        "assigned_court": null
      }
    ],
    "issues": [
      {
        "type": "no_show",
        "match_id": "match_l1_3",
        "description": "Team Johnson/Lee has not checked in for their match",
        "severity": "high"
      }
    ],
    "announcements": [
      {
        "id": "ann_123",
        "content": "Lunch break 12:00-12:30. All matches resume at 12:30.",
        "created_at": "2026-02-16T11:45:00Z"
      }
    ]
  }
}
```

---

## 4. Real-time Events

### 4.1 WebSocket Connection

**Connection URL:**
```
wss://api.pickleballapp.com/v1/ws
```

**Authentication:**
```json
{
  "type": "auth",
  "token": "Bearer eyJhbGciOiJSUzI1NiIs..."
}
```

**Heartbeat:**
```json
// Client sends every 30 seconds
{ "type": "ping" }

// Server responds
{ "type": "pong", "timestamp": "2026-01-20T10:00:00Z" }
```

### 4.2 Channel Subscriptions

**Subscribe to channels:**
```json
{
  "type": "subscribe",
  "channels": [
    "user:usr_abc123:notifications",
    "tournament:trn_abc123:live",
    "match:match_xyz789:score",
    "club:clb_abc123:activity"
  ]
}
```

**Unsubscribe:**
```json
{
  "type": "unsubscribe",
  "channels": ["tournament:trn_abc123:live"]
}
```

### 4.3 Event Types

#### Live Score Updates
```json
{
  "channel": "match:match_xyz789:score",
  "event": "score_update",
  "data": {
    "match_id": "match_xyz789",
    "game_number": 2,
    "team_1_score": 8,
    "team_2_score": 6,
    "server": "team_1",
    "server_position": "right",
    "timestamp": "2026-01-20T14:35:22Z"
  }
}
```

#### Match Status Changes
```json
{
  "channel": "tournament:trn_abc123:live",
  "event": "match_status",
  "data": {
    "match_id": "match_xyz789",
    "status": "completed",
    "winner": "team_1",
    "final_scores": [
      { "team_1": 11, "team_2": 8 },
      { "team_1": 11, "team_2": 9 }
    ],
    "next_match_id": "match_abc456"
  }
}
```

#### Notifications
```json
{
  "channel": "user:usr_abc123:notifications",
  "event": "notification",
  "data": {
    "id": "ntf_new123",
    "type": "game_invite",
    "title": "Game Invitation",
    "body": "Jane Doe invited you to play doubles",
    "action_url": "/games/requests/req_xyz789",
    "created_at": "2026-01-20T14:30:00Z"
  }
}
```

#### Activity Feed Updates
```json
{
  "channel": "club:clb_abc123:activity",
  "event": "new_activity",
  "data": {
    "id": "act_new123",
    "type": "game_result",
    "actor": {
      "id": "usr_abc123",
      "name": "John Smith"
    },
    "summary": "won a doubles match 11-7",
    "timestamp": "2026-01-20T14:45:00Z"
  }
}
```

### 4.4 Server-Sent Events (SSE) Alternative

For clients that prefer SSE over WebSocket:

**Endpoint:**
```
GET /v1/events/stream
```

**Headers:**
```http
Accept: text/event-stream
Authorization: Bearer {token}
```

**Query Parameters:**
- `channels`: Comma-separated channel list

**Response Stream:**
```
event: notification
data: {"id":"ntf_123","type":"game_invite","title":"Game Invitation"}

event: score_update
data: {"match_id":"match_xyz789","team_1_score":9,"team_2_score":7}

: heartbeat

event: match_status
data: {"match_id":"match_xyz789","status":"completed"}
```

---

## 5. Background Jobs

### 5.1 Job Types

| Job Type | Schedule | Description |
|----------|----------|-------------|
| `rating.calculate` | On game verification | Calculate and update player ratings |
| `rating.decay` | Daily 00:00 UTC | Apply rating decay for inactive players |
| `notification.dispatch` | Real-time | Send push/email notifications |
| `notification.digest` | Daily 08:00 local | Send daily digest emails |
| `stats.aggregate` | Hourly | Aggregate player/club/court statistics |
| `leaderboard.update` | Every 15 minutes | Update leaderboards |
| `match.reminder` | 2 hours before | Send match reminders |
| `session.cleanup` | Daily 03:00 UTC | Clean expired sessions |
| `verification.expire` | Every 15 minutes | Expire unverified games after 7 days |
| `dupr.sync` | Daily 06:00 UTC | Sync ratings with DUPR (when available) |

### 5.2 Rating Calculation

**Algorithm: Modified Glicko-2**

```
Input:
- Player ratings (singles/doubles/mixed)
- Rating deviations (uncertainty)
- Rating volatility
- Game result (win/loss)
- Opponent ratings

Process:
1. Calculate expected outcome based on ratings
2. Determine actual outcome
3. Update rating based on performance vs expectation
4. Adjust rating deviation based on time since last game
5. Apply rating volatility constraints

Output:
- New player ratings
- Updated rating deviations
- Rating change history
```

**Rating Change Factors:**
- Rating difference between players/teams
- Game score margin
- Number of games in match
- Recency of player activity
- Match importance (recreational vs tournament)

### 5.3 Notification Dispatch

**Channels:**
- Push notifications (FCM/APNs)
- Email (SendGrid/Postmark)
- In-app notifications
- SMS (for critical alerts)

**Priority Levels:**
| Priority | Delivery | Examples |
|----------|----------|----------|
| Critical | Immediate, all channels | Tournament match starting, emergency |
| High | Immediate push + in-app | Game invites, match reminders |
| Normal | Within 5 minutes | Friend requests, game verifications |
| Low | Batched in digest | Weekly summaries, achievements |

### 5.4 Data Aggregation

**Hourly Aggregations:**
- Player game counts and win rates
- Court usage statistics
- Active user counts

**Daily Aggregations:**
- Leaderboard snapshots
- Club activity metrics
- Tournament statistics

**Weekly Aggregations:**
- Rating trend analysis
- Popular courts/clubs
- Community growth metrics

---

## 6. External Integrations

### 6.1 DUPR Integration

**Status:** Partnership API (when available) or manual entry fallback

**Sync Capabilities:**
- Pull player ratings from DUPR
- Push verified game results to DUPR
- Sync tournament results

**API Endpoints (Internal):**

```typescript
// Sync player rating from DUPR
POST /v1/internal/dupr/sync-player
{
  "user_id": "usr_abc123",
  "dupr_id": "DPR123456"
}

// Push game result to DUPR
POST /v1/internal/dupr/push-game
{
  "game_id": "gam_xyz789"
}
```

**Fallback (Manual Entry):**
- Users can manually enter their DUPR ID
- Ratings displayed but not auto-synced
- Link to DUPR profile for verification

### 6.2 PickleballTournaments.com Integration

**API Base URL:** `https://api.pickleball.com/v1`

**Capabilities:**
- Search tournaments
- View tournament details
- Deep link to registration

**Sync Process:**
```
1. Periodic fetch of tournaments within service area
2. Store tournament metadata in local database
3. Display alongside app-native tournaments
4. Redirect to PickleballTournaments.com for registration
5. (Future) Receive registration webhooks
```

### 6.3 Google Places API

**Use Cases:**
- Court location verification
- Address autocomplete
- Place photos for courts
- Operating hours

**Endpoints Used:**
- Place Search
- Place Details
- Place Photos
- Geocoding

### 6.4 Email Service (SendGrid/Postmark)

**Templates:**
| Template | Trigger |
|----------|---------|
| `welcome` | User registration |
| `email_verification` | Account creation |
| `password_reset` | Password reset request |
| `game_invite` | Invited to play |
| `game_verification` | Game needs verification |
| `match_reminder` | Upcoming scheduled match |
| `daily_digest` | Daily activity summary |
| `weekly_summary` | Weekly stats summary |

### 6.5 Push Notification Service (FCM/APNs)

**Setup:**
```json
// Register device token
POST /v1/users/me/devices
{
  "token": "fcm_token_abc123",
  "platform": "ios",
  "app_version": "1.0.0"
}
```

**Notification Categories:**
- Game invites and requests
- Match reminders
- Score updates (subscribed matches)
- Social (friend requests, likes, comments)
- Club announcements
- Tournament updates

---

## 7. Error Handling

### 7.1 Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "One or more fields failed validation",
    "details": [
      {
        "field": "email",
        "code": "INVALID_FORMAT",
        "message": "Email must be a valid email address"
      },
      {
        "field": "password",
        "code": "TOO_SHORT",
        "message": "Password must be at least 8 characters"
      }
    ],
    "request_id": "req_abc123xyz"
  }
}
```

### 7.2 Error Codes

| HTTP Status | Error Code | Description |
|-------------|------------|-------------|
| 400 | `VALIDATION_ERROR` | Request validation failed |
| 400 | `INVALID_REQUEST` | Malformed request body |
| 401 | `AUTH_INVALID_CREDENTIALS` | Wrong email or password |
| 401 | `AUTH_TOKEN_EXPIRED` | Access token has expired |
| 401 | `AUTH_TOKEN_INVALID` | Token is malformed or invalid |
| 403 | `FORBIDDEN` | User lacks permission |
| 403 | `ACCOUNT_SUSPENDED` | Account has been suspended |
| 404 | `NOT_FOUND` | Resource does not exist |
| 409 | `CONFLICT` | Resource already exists or state conflict |
| 409 | `ALREADY_REGISTERED` | User already registered for event |
| 422 | `UNPROCESSABLE_ENTITY` | Valid request but cannot process |
| 429 | `RATE_LIMIT_EXCEEDED` | Too many requests |
| 500 | `INTERNAL_ERROR` | Server error (logged for investigation) |
| 502 | `BAD_GATEWAY` | Upstream service error |
| 503 | `SERVICE_UNAVAILABLE` | Service temporarily unavailable |

### 7.3 Validation Error Details

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "scores.team_1",
        "code": "INVALID_SCORE",
        "message": "Score must be between 0 and 21",
        "received": 25
      },
      {
        "field": "played_at",
        "code": "FUTURE_DATE",
        "message": "Game date cannot be in the future"
      }
    ]
  }
}
```

---

## 8. Rate Limiting

### 8.1 Rate Limit Tiers

| Tier | Limit | Window | Applies To |
|------|-------|--------|------------|
| Anonymous | 60 requests | 1 minute | Unauthenticated requests |
| Authenticated | 300 requests | 1 minute | Regular users |
| Premium | 600 requests | 1 minute | Premium/verified accounts |
| API Partner | 3000 requests | 1 minute | Integration partners |

### 8.2 Endpoint-Specific Limits

| Endpoint Pattern | Limit | Window |
|------------------|-------|--------|
| `POST /auth/login` | 5 | 15 minutes |
| `POST /auth/register` | 3 | 1 hour |
| `POST /auth/password/*` | 3 | 1 hour |
| `GET /courts` | 60 | 1 minute |
| `POST /games` | 30 | 1 minute |
| `GET /matchmaking/*` | 30 | 1 minute |

### 8.3 Rate Limit Headers

```http
X-RateLimit-Limit: 300
X-RateLimit-Remaining: 245
X-RateLimit-Reset: 1705747260
X-RateLimit-Retry-After: 45
```

### 8.4 Rate Limit Exceeded Response

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later.",
    "details": {
      "limit": 300,
      "window_seconds": 60,
      "retry_after_seconds": 45
    }
  }
}
```

---

## 9. Offline Sync & Conflict Resolution

### 9.1 Sync Protocol

**Offline-First Approach:**
1. Client stores all data locally
2. Changes queued when offline
3. Sync when connection restored
4. Server resolves conflicts

### 9.2 Sync Endpoints

#### POST /v1/sync/push
Push local changes to server.

**Request:**
```json
{
  "client_id": "dev_xyz789",
  "last_sync_timestamp": "2026-01-20T09:00:00Z",
  "changes": [
    {
      "id": "local_gam_123",
      "type": "game",
      "action": "create",
      "data": {
        "game_type": "doubles",
        "played_at": "2026-01-20T14:30:00Z"
      },
      "local_timestamp": "2026-01-20T14:35:00Z"
    },
    {
      "id": "usr_abc123",
      "type": "user_preferences",
      "action": "update",
      "data": {
        "travel_radius_miles": 30
      },
      "local_timestamp": "2026-01-20T10:00:00Z"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "processed": [
      {
        "local_id": "local_gam_123",
        "server_id": "gam_new456",
        "status": "created"
      }
    ],
    "conflicts": [
      {
        "local_id": "usr_abc123",
        "type": "user_preferences",
        "local_data": { "travel_radius_miles": 30 },
        "server_data": { "travel_radius_miles": 25 },
        "server_timestamp": "2026-01-20T09:30:00Z",
        "resolution": "server_wins",
        "reason": "Server change was more recent"
      }
    ],
    "sync_timestamp": "2026-01-20T15:00:00Z"
  }
}
```

#### GET /v1/sync/pull
Pull server changes.

**Query Parameters:**
- `since`: Last sync timestamp
- `types`: Comma-separated resource types to sync

**Response:**
```json
{
  "success": true,
  "data": {
    "changes": [
      {
        "type": "game",
        "id": "gam_xyz789",
        "action": "update",
        "data": {
          "status": "verified",
          "verified_at": "2026-01-20T14:45:00Z"
        },
        "timestamp": "2026-01-20T14:45:00Z"
      }
    ],
    "deleted": [
      {
        "type": "notification",
        "id": "ntf_old123"
      }
    ],
    "sync_timestamp": "2026-01-20T15:00:00Z"
  }
}
```

### 9.3 Conflict Resolution Strategies

| Resource Type | Strategy | Description |
|---------------|----------|-------------|
| User profile | Last-write-wins | Most recent change prevails |
| Game scores | Manual resolution | User chooses correct value |
| Preferences | Merge | Combine non-conflicting fields |
| Availability | Server-wins | Server is source of truth |

---

## Appendix A: Data Models

### User
```typescript
interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  bio?: string;
  phone?: string;
  date_of_birth: string;
  location: Location;
  rating: Rating;
  preferences: UserPreferences;
  privacy: PrivacySettings;
  email_verified: boolean;
  created_at: string;
  updated_at: string;
  last_active_at: string;
}
```

### Game
```typescript
interface Game {
  id: string;
  game_type: 'singles' | 'doubles' | 'mixed';
  format: GameFormat;
  status: 'pending_verification' | 'verified' | 'disputed';
  played_at: string;
  court_id: string;
  court_number?: number;
  players?: SinglesPlayers;  // For singles
  teams?: DoublesTeams;      // For doubles/mixed
  scores: Score[];
  winner: string;
  verification: VerificationStatus;
  context?: GameContext;
  created_at: string;
  created_by: string;
}
```

### Court
```typescript
interface Court {
  id: string;
  name: string;
  description?: string;
  address: Address;
  coordinates: Coordinates;
  contact: ContactInfo;
  court_info: CourtInfo;
  amenities: string[];
  hours: OperatingHours;
  pricing: Pricing;
  rating: RatingSummary;
  photos: Photo[];
  verified: boolean;
  last_verified_at?: string;
  created_at: string;
  updated_at: string;
}
```

---

## Appendix B: Webhook Events

For integration partners, the following webhook events are available:

| Event | Payload | Description |
|-------|---------|-------------|
| `game.created` | Game object | New game logged |
| `game.verified` | Game object | Game verified by players |
| `tournament.registration` | Registration object | User registered for tournament |
| `user.rating_changed` | Rating change object | User's rating updated |

---

## Appendix C: SDK Examples

### JavaScript/TypeScript
```typescript
import { PickleballAPI } from '@pickleballapp/sdk';

const api = new PickleballAPI({
  apiKey: 'your_api_key',
  environment: 'production'
});

// Search for courts
const courts = await api.courts.search({
  lat: 30.2672,
  lng: -97.7431,
  radius: 25,
  surface: 'outdoor'
});

// Log a game
const game = await api.games.create({
  game_type: 'doubles',
  court_id: 'crt_xyz789',
  played_at: new Date().toISOString(),
  teams: {
    team_1: { players: [{ user_id: 'usr_abc123' }, { user_id: 'usr_def456' }] },
    team_2: { players: [{ user_id: 'usr_ghi789' }, { user_id: 'usr_jkl012' }] }
  },
  scores: { team_1: 11, team_2: 7 }
});
```

### Swift
```swift
import PickleballSDK

let api = PickleballAPI(apiKey: "your_api_key")

// Search for courts
api.courts.search(
    lat: 30.2672,
    lng: -97.7431,
    radius: 25
) { result in
    switch result {
    case .success(let courts):
        print("Found \(courts.count) courts")
    case .failure(let error):
        print("Error: \(error)")
    }
}
```

---

*Document Version: 1.0*
*Last Updated: January 20, 2026*
*API Version: v1*
