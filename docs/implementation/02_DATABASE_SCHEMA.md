# Pickleball App Database Schema

## Overview

This document defines the complete database schema for the Pickleball web application. The schema is designed for PostgreSQL with support for geospatial queries via PostGIS.

---

## 1. Entity Relationship Diagram (Textual)

```
USERS ─────────────────┬──────────────────────────────────────────────────────┐
  │                    │                                                      │
  │ 1:N                │ M:N (via user_friendships)                          │
  ▼                    ▼                                                      │
USER_RATINGS      USER_FRIENDSHIPS                                            │
                                                                              │
USERS ─────────────────┬──────────────────────────────────────────────────────┤
  │                    │                                                      │
  │ M:N               M:N                                                     │
  ▼                    ▼                                                      │
CLUB_MEMBERSHIPS   GAME_PARTICIPANTS ◄──── GAMES                              │
  │                    │                     │                                │
  │                    │                     │ N:1                            │
  ▼                    │                     ▼                                │
CLUBS                  │                   COURTS ◄──── VENUES                │
  │                    │                     │                                │
  │ 1:N               │                     │ 1:N                            │
  ▼                    │                     ▼                                │
CLUB_EVENTS            │               COURT_REVIEWS                          │
                       │                                                      │
USERS ─────────────────┼──────────────────────────────────────────────────────┤
  │                    │                                                      │
  │ M:N               │                                                      │
  ▼                    │                                                      │
TOURNAMENT_REGISTRATIONS ◄──── TOURNAMENTS                                    │
  │                              │                                            │
  │                              │ 1:N                                        │
  │                              ▼                                            │
  │                         TOURNAMENT_BRACKETS                               │
  │                              │                                            │
  │                              │ 1:N                                        │
  │                              ▼                                            │
  └────────────────────► TOURNAMENT_MATCHES                                   │
                                                                              │
USERS ─────────────────────────────────────────────────────────────────────────┤
  │                                                                           │
  │ M:N                                                                       │
  ▼                                                                           │
LEAGUE_PARTICIPANTS ◄──── LEAGUES                                             │
  │                         │                                                 │
  │                         │ 1:N                                             │
  │                         ▼                                                 │
  │                    LEAGUE_SEASONS                                         │
  │                         │                                                 │
  │                         │ 1:N                                             │
  │                         ▼                                                 │
  └──────────────────► LEAGUE_MATCHES                                         │
                                                                              │
USERS ──────────────────────────────────────────────────────────────────────────
  │
  │ 1:N
  ├──► USER_ACHIEVEMENTS ◄──── ACHIEVEMENTS
  │
  ├──► NOTIFICATIONS
  │
  ├──► ACTIVITY_FEED_EVENTS
  │
  └──► USER_AVAILABILITY
```

---

## 2. Core Entities

### 2.1 Users

```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,

    -- Profile information
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    display_name VARCHAR(100),
    avatar_url VARCHAR(500),
    bio TEXT,
    date_of_birth DATE,
    gender VARCHAR(20) CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),

    -- Location
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100) DEFAULT 'USA',
    zip_code VARCHAR(20),
    location GEOGRAPHY(POINT, 4326),

    -- Player information
    skill_level VARCHAR(20) CHECK (skill_level IN ('beginner', 'intermediate', 'advanced', 'pro')),
    play_style VARCHAR(50),
    dominant_hand VARCHAR(10) CHECK (dominant_hand IN ('left', 'right', 'ambidextrous')),
    paddle_brand VARCHAR(100),
    years_playing INTEGER CHECK (years_playing >= 0),

    -- Preferences
    preferred_play_times JSONB DEFAULT '[]',
    preferred_game_types JSONB DEFAULT '["doubles"]',
    willing_to_travel_miles INTEGER DEFAULT 25,
    notification_preferences JSONB DEFAULT '{"email": true, "push": true, "sms": false}',
    privacy_settings JSONB DEFAULT '{"profile_public": true, "show_rating": true, "show_stats": true}',

    -- Account status
    email_verified BOOLEAN DEFAULT FALSE,
    phone VARCHAR(20),
    phone_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    is_banned BOOLEAN DEFAULT FALSE,
    ban_reason TEXT,
    last_login_at TIMESTAMPTZ,

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_location ON users USING GIST(location);
CREATE INDEX idx_users_skill_level ON users(skill_level);
CREATE INDEX idx_users_city_state ON users(city, state);
CREATE INDEX idx_users_created_at ON users(created_at);
```

### 2.2 User Ratings

```sql
-- Rating types enum
CREATE TYPE rating_type AS ENUM ('dupr', 'internal', 'self_reported');
CREATE TYPE game_format AS ENUM ('singles', 'doubles', 'mixed_doubles');

-- User ratings table (current ratings)
CREATE TABLE user_ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating_type rating_type NOT NULL,
    game_format game_format NOT NULL,

    -- Rating values
    rating DECIMAL(4,2) NOT NULL CHECK (rating >= 1.0 AND rating <= 8.0),
    reliability_score DECIMAL(3,2) CHECK (reliability_score >= 0 AND reliability_score <= 1.0),
    games_played INTEGER DEFAULT 0,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,

    -- DUPR-specific fields
    dupr_id VARCHAR(50),
    dupr_last_sync TIMESTAMPTZ,

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(user_id, rating_type, game_format)
);

-- Rating history table
CREATE TABLE rating_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating_type rating_type NOT NULL,
    game_format game_format NOT NULL,

    old_rating DECIMAL(4,2),
    new_rating DECIMAL(4,2) NOT NULL,
    rating_change DECIMAL(4,2) GENERATED ALWAYS AS (new_rating - COALESCE(old_rating, new_rating)) STORED,

    -- What caused the change
    source_type VARCHAR(50) NOT NULL, -- 'game', 'tournament', 'league', 'manual', 'dupr_sync'
    source_id UUID,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for ratings
CREATE INDEX idx_user_ratings_user_id ON user_ratings(user_id);
CREATE INDEX idx_user_ratings_rating ON user_ratings(rating);
CREATE INDEX idx_user_ratings_type_format ON user_ratings(rating_type, game_format);
CREATE INDEX idx_rating_history_user_id ON rating_history(user_id);
CREATE INDEX idx_rating_history_created_at ON rating_history(created_at);
```

### 2.3 Venues and Courts

```sql
-- Venue types
CREATE TYPE venue_type AS ENUM ('public', 'private', 'club', 'recreation_center', 'school', 'gym');
CREATE TYPE court_surface AS ENUM ('concrete', 'asphalt', 'sport_court', 'wood', 'indoor', 'turf');

-- Venues table
CREATE TABLE venues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(200) NOT NULL UNIQUE,
    description TEXT,
    venue_type venue_type NOT NULL,

    -- Contact information
    website VARCHAR(500),
    phone VARCHAR(20),
    email VARCHAR(255),

    -- Address
    street_address VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    country VARCHAR(100) DEFAULT 'USA',
    zip_code VARCHAR(20) NOT NULL,
    location GEOGRAPHY(POINT, 4326) NOT NULL,

    -- Amenities (JSONB for flexibility)
    amenities JSONB DEFAULT '[]',
    -- Example: ["restrooms", "water_fountain", "parking", "pro_shop", "lights", "covered"]

    -- Operating hours (JSONB for flexibility)
    operating_hours JSONB DEFAULT '{}',
    -- Example: {"monday": {"open": "06:00", "close": "22:00"}, ...}

    -- Images
    cover_image_url VARCHAR(500),
    image_urls JSONB DEFAULT '[]',

    -- Ratings
    average_rating DECIMAL(2,1) DEFAULT 0,
    total_reviews INTEGER DEFAULT 0,

    -- Management
    owner_id UUID REFERENCES users(id),
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Courts table
CREATE TABLE courts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    court_number INTEGER,

    -- Court details
    surface court_surface NOT NULL,
    is_indoor BOOLEAN DEFAULT FALSE,
    has_lights BOOLEAN DEFAULT FALSE,
    is_covered BOOLEAN DEFAULT FALSE,

    -- Dimensions (standard is 20x44 feet)
    width_feet DECIMAL(5,2) DEFAULT 20,
    length_feet DECIMAL(5,2) DEFAULT 44,

    -- Availability
    is_reservable BOOLEAN DEFAULT TRUE,
    requires_membership BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,

    -- Pricing (nullable for free courts)
    hourly_rate DECIMAL(8,2),
    peak_hourly_rate DECIMAL(8,2),

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(venue_id, court_number)
);

-- Court reviews
CREATE TABLE court_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    court_id UUID REFERENCES courts(id) ON DELETE SET NULL,
    venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(200),
    content TEXT,

    -- Detailed ratings
    surface_quality INTEGER CHECK (surface_quality >= 1 AND surface_quality <= 5),
    net_quality INTEGER CHECK (net_quality >= 1 AND net_quality <= 5),
    lighting_quality INTEGER CHECK (lighting_quality >= 1 AND lighting_quality <= 5),
    cleanliness INTEGER CHECK (cleanliness >= 1 AND cleanliness <= 5),

    -- Moderation
    is_approved BOOLEAN DEFAULT TRUE,
    is_flagged BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(venue_id, user_id)
);

-- Indexes for venues and courts
CREATE INDEX idx_venues_location ON venues USING GIST(location);
CREATE INDEX idx_venues_city_state ON venues(city, state);
CREATE INDEX idx_venues_type ON venues(venue_type);
CREATE INDEX idx_venues_slug ON venues(slug);
CREATE INDEX idx_courts_venue_id ON courts(venue_id);
CREATE INDEX idx_court_reviews_venue_id ON court_reviews(venue_id);
CREATE INDEX idx_court_reviews_user_id ON court_reviews(user_id);
```

---

## 3. Games and Matches

```sql
-- Game status enum
CREATE TYPE game_status AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled', 'forfeited');
CREATE TYPE game_type AS ENUM ('casual', 'competitive', 'tournament', 'league', 'ladder');

-- Games table (for all match types)
CREATE TABLE games (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Game classification
    game_type game_type NOT NULL DEFAULT 'casual',
    game_format game_format NOT NULL,
    status game_status NOT NULL DEFAULT 'scheduled',

    -- Location
    venue_id UUID REFERENCES venues(id),
    court_id UUID REFERENCES courts(id),
    location_notes TEXT,

    -- Scheduling
    scheduled_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    duration_minutes INTEGER,

    -- Scoring
    winning_team INTEGER CHECK (winning_team IN (1, 2)),
    is_draw BOOLEAN DEFAULT FALSE,

    -- Score storage (JSONB for flexibility with different formats)
    scores JSONB DEFAULT '[]',
    -- Example: [{"team1": 11, "team2": 9}, {"team1": 11, "team2": 7}]

    -- Game settings
    points_to_win INTEGER DEFAULT 11,
    win_by INTEGER DEFAULT 2,
    best_of INTEGER DEFAULT 1,

    -- Rating impact
    is_rated BOOLEAN DEFAULT TRUE,
    rating_processed BOOLEAN DEFAULT FALSE,
    rating_processed_at TIMESTAMPTZ,

    -- References (nullable, for linking to tournaments/leagues)
    tournament_match_id UUID,
    league_match_id UUID,

    -- Metadata
    notes TEXT,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Game participants
CREATE TABLE game_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Team assignment
    team INTEGER NOT NULL CHECK (team IN (1, 2)),
    position VARCHAR(20), -- 'left', 'right' for doubles

    -- Individual stats (optional)
    points_scored INTEGER,
    aces INTEGER,
    faults INTEGER,

    -- Rating at time of game (snapshot)
    rating_at_game DECIMAL(4,2),
    rating_change DECIMAL(4,2),

    -- Confirmation
    is_confirmed BOOLEAN DEFAULT FALSE,
    confirmed_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(game_id, user_id)
);

-- Indexes for games
CREATE INDEX idx_games_status ON games(status);
CREATE INDEX idx_games_type ON games(game_type);
CREATE INDEX idx_games_scheduled_at ON games(scheduled_at);
CREATE INDEX idx_games_venue_id ON games(venue_id);
CREATE INDEX idx_games_created_by ON games(created_by);
CREATE INDEX idx_game_participants_game_id ON game_participants(game_id);
CREATE INDEX idx_game_participants_user_id ON game_participants(user_id);
CREATE INDEX idx_game_participants_team ON game_participants(game_id, team);
```

---

## 4. Clubs

```sql
-- Club membership roles
CREATE TYPE club_role AS ENUM ('owner', 'admin', 'moderator', 'member');
CREATE TYPE membership_status AS ENUM ('pending', 'active', 'suspended', 'expired', 'cancelled');

-- Clubs table
CREATE TABLE clubs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(200) NOT NULL UNIQUE,
    description TEXT,

    -- Club details
    logo_url VARCHAR(500),
    cover_image_url VARCHAR(500),
    website VARCHAR(500),

    -- Location
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100) DEFAULT 'USA',
    location GEOGRAPHY(POINT, 4326),

    -- Home venue
    home_venue_id UUID REFERENCES venues(id),

    -- Membership settings
    is_public BOOLEAN DEFAULT TRUE,
    requires_approval BOOLEAN DEFAULT FALSE,
    max_members INTEGER,

    -- Stats (denormalized for performance)
    member_count INTEGER DEFAULT 0,
    active_member_count INTEGER DEFAULT 0,

    -- Skill range
    min_skill_level VARCHAR(20),
    max_skill_level VARCHAR(20),
    average_rating DECIMAL(4,2),

    -- Social
    social_links JSONB DEFAULT '{}',

    -- Settings
    settings JSONB DEFAULT '{}',

    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Club memberships
CREATE TABLE club_memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    role club_role NOT NULL DEFAULT 'member',
    status membership_status NOT NULL DEFAULT 'pending',

    -- Dates
    joined_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,

    -- Stats within club
    games_played INTEGER DEFAULT 0,
    events_attended INTEGER DEFAULT 0,

    -- Moderation
    invited_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),

    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(club_id, user_id)
);

-- Club events
CREATE TABLE club_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,

    title VARCHAR(200) NOT NULL,
    description TEXT,
    event_type VARCHAR(50) NOT NULL, -- 'open_play', 'clinic', 'social', 'tournament', 'practice'

    -- Location
    venue_id UUID REFERENCES venues(id),
    location_notes TEXT,

    -- Timing
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    timezone VARCHAR(50) DEFAULT 'America/New_York',

    -- Capacity
    max_participants INTEGER,
    current_participants INTEGER DEFAULT 0,
    waitlist_enabled BOOLEAN DEFAULT TRUE,

    -- Registration
    registration_opens_at TIMESTAMPTZ,
    registration_closes_at TIMESTAMPTZ,

    -- Requirements
    min_rating DECIMAL(4,2),
    max_rating DECIMAL(4,2),
    members_only BOOLEAN DEFAULT TRUE,

    -- Settings
    is_recurring BOOLEAN DEFAULT FALSE,
    recurrence_rule JSONB,

    is_cancelled BOOLEAN DEFAULT FALSE,
    cancelled_reason TEXT,

    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Club event registrations
CREATE TABLE club_event_registrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES club_events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    status VARCHAR(20) NOT NULL DEFAULT 'registered', -- 'registered', 'waitlisted', 'cancelled', 'attended'
    waitlist_position INTEGER,

    registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    cancelled_at TIMESTAMPTZ,
    attended_at TIMESTAMPTZ,

    UNIQUE(event_id, user_id)
);

-- Indexes for clubs
CREATE INDEX idx_clubs_slug ON clubs(slug);
CREATE INDEX idx_clubs_location ON clubs USING GIST(location);
CREATE INDEX idx_clubs_city_state ON clubs(city, state);
CREATE INDEX idx_club_memberships_club_id ON club_memberships(club_id);
CREATE INDEX idx_club_memberships_user_id ON club_memberships(user_id);
CREATE INDEX idx_club_memberships_status ON club_memberships(status);
CREATE INDEX idx_club_events_club_id ON club_events(club_id);
CREATE INDEX idx_club_events_starts_at ON club_events(starts_at);
CREATE INDEX idx_club_event_registrations_event_id ON club_event_registrations(event_id);
CREATE INDEX idx_club_event_registrations_user_id ON club_event_registrations(user_id);
```

---

## 5. Tournaments

```sql
-- Tournament enums
CREATE TYPE tournament_status AS ENUM ('draft', 'registration_open', 'registration_closed', 'in_progress', 'completed', 'cancelled');
CREATE TYPE tournament_format AS ENUM ('single_elimination', 'double_elimination', 'round_robin', 'pool_play', 'swiss');
CREATE TYPE bracket_status AS ENUM ('pending', 'in_progress', 'completed');

-- Tournaments table
CREATE TABLE tournaments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(200) NOT NULL UNIQUE,
    description TEXT,

    -- Organizer
    organizer_id UUID NOT NULL REFERENCES users(id),
    club_id UUID REFERENCES clubs(id),

    -- Location
    venue_id UUID REFERENCES venues(id),
    location_notes TEXT,

    -- Dates
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    timezone VARCHAR(50) DEFAULT 'America/New_York',

    -- Registration
    registration_opens_at TIMESTAMPTZ,
    registration_closes_at TIMESTAMPTZ,
    max_participants INTEGER,
    current_participants INTEGER DEFAULT 0,
    waitlist_enabled BOOLEAN DEFAULT TRUE,

    -- Format
    tournament_format tournament_format NOT NULL,
    game_format game_format NOT NULL,

    -- Settings
    points_to_win INTEGER DEFAULT 11,
    win_by INTEGER DEFAULT 2,
    best_of INTEGER DEFAULT 1,

    -- Rating requirements
    is_rated BOOLEAN DEFAULT TRUE,
    min_rating DECIMAL(4,2),
    max_rating DECIMAL(4,2),

    -- Images
    logo_url VARCHAR(500),
    banner_url VARCHAR(500),

    -- Rules
    rules TEXT,

    status tournament_status NOT NULL DEFAULT 'draft',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tournament divisions (for multi-division tournaments)
CREATE TABLE tournament_divisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,

    name VARCHAR(100) NOT NULL,
    description TEXT,
    game_format game_format NOT NULL,

    min_rating DECIMAL(4,2),
    max_rating DECIMAL(4,2),

    max_teams INTEGER,
    current_teams INTEGER DEFAULT 0,

    sort_order INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tournament registrations (teams/individuals)
CREATE TABLE tournament_registrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    division_id UUID REFERENCES tournament_divisions(id) ON DELETE CASCADE,

    -- For doubles, this is the team registration
    team_name VARCHAR(100),
    seed INTEGER,

    status VARCHAR(20) NOT NULL DEFAULT 'registered', -- 'registered', 'waitlisted', 'confirmed', 'withdrawn', 'disqualified'
    waitlist_position INTEGER,

    -- Payment tracking (reference only, no financial data)
    payment_reference VARCHAR(100),
    payment_status VARCHAR(20) DEFAULT 'pending',

    registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    confirmed_at TIMESTAMPTZ,
    withdrawn_at TIMESTAMPTZ,

    notes TEXT
);

-- Tournament registration players (link players to registrations)
CREATE TABLE tournament_registration_players (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    registration_id UUID NOT NULL REFERENCES tournament_registrations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    is_captain BOOLEAN DEFAULT FALSE,
    rating_at_registration DECIMAL(4,2),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(registration_id, user_id)
);

-- Tournament brackets
CREATE TABLE tournament_brackets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    division_id UUID REFERENCES tournament_divisions(id) ON DELETE CASCADE,

    name VARCHAR(100) NOT NULL, -- 'Main', 'Consolation', 'Pool A', etc.
    bracket_type VARCHAR(50) NOT NULL, -- 'winners', 'losers', 'consolation', 'pool'

    status bracket_status NOT NULL DEFAULT 'pending',

    -- For pool play
    pool_size INTEGER,
    advancement_count INTEGER,

    bracket_data JSONB, -- Stores bracket structure

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tournament matches
CREATE TABLE tournament_matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    bracket_id UUID NOT NULL REFERENCES tournament_brackets(id) ON DELETE CASCADE,

    -- Bracket position
    round_number INTEGER NOT NULL,
    match_number INTEGER NOT NULL,

    -- Teams (registration IDs)
    team1_registration_id UUID REFERENCES tournament_registrations(id),
    team2_registration_id UUID REFERENCES tournament_registrations(id),

    -- From previous matches (for bracket progression)
    team1_from_match_id UUID REFERENCES tournament_matches(id),
    team2_from_match_id UUID REFERENCES tournament_matches(id),
    team1_from_position VARCHAR(10), -- 'winner' or 'loser'
    team2_from_position VARCHAR(10),

    -- Scheduling
    court_id UUID REFERENCES courts(id),
    scheduled_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,

    -- Results
    status game_status NOT NULL DEFAULT 'scheduled',
    winner_registration_id UUID REFERENCES tournament_registrations(id),

    scores JSONB DEFAULT '[]',

    -- Link to detailed game record
    game_id UUID REFERENCES games(id),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(bracket_id, round_number, match_number)
);

-- Indexes for tournaments
CREATE INDEX idx_tournaments_slug ON tournaments(slug);
CREATE INDEX idx_tournaments_status ON tournaments(status);
CREATE INDEX idx_tournaments_starts_at ON tournaments(starts_at);
CREATE INDEX idx_tournaments_organizer_id ON tournaments(organizer_id);
CREATE INDEX idx_tournament_divisions_tournament_id ON tournament_divisions(tournament_id);
CREATE INDEX idx_tournament_registrations_tournament_id ON tournament_registrations(tournament_id);
CREATE INDEX idx_tournament_registrations_status ON tournament_registrations(status);
CREATE INDEX idx_tournament_registration_players_user_id ON tournament_registration_players(user_id);
CREATE INDEX idx_tournament_brackets_tournament_id ON tournament_brackets(tournament_id);
CREATE INDEX idx_tournament_matches_bracket_id ON tournament_matches(bracket_id);
CREATE INDEX idx_tournament_matches_scheduled_at ON tournament_matches(scheduled_at);
```

---

## 6. Leagues

```sql
-- League enums
CREATE TYPE league_status AS ENUM ('draft', 'registration_open', 'registration_closed', 'in_progress', 'completed', 'cancelled');

-- Leagues table
CREATE TABLE leagues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(200) NOT NULL UNIQUE,
    description TEXT,

    -- Organizer
    organizer_id UUID NOT NULL REFERENCES users(id),
    club_id UUID REFERENCES clubs(id),

    -- Location
    venue_id UUID REFERENCES venues(id),

    -- Format
    game_format game_format NOT NULL,

    -- Rating requirements
    is_rated BOOLEAN DEFAULT TRUE,
    min_rating DECIMAL(4,2),
    max_rating DECIMAL(4,2),

    -- Settings
    settings JSONB DEFAULT '{}',
    rules TEXT,

    -- Images
    logo_url VARCHAR(500),

    status league_status NOT NULL DEFAULT 'draft',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- League seasons
CREATE TABLE league_seasons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,

    name VARCHAR(100) NOT NULL, -- 'Spring 2024', 'Season 1', etc.
    season_number INTEGER NOT NULL,

    -- Dates
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,

    -- Registration
    registration_opens_at TIMESTAMPTZ,
    registration_closes_at TIMESTAMPTZ,
    max_participants INTEGER,

    -- Schedule
    matches_per_week INTEGER DEFAULT 1,
    match_day VARCHAR(20), -- 'monday', 'tuesday', etc.
    default_match_time TIME,

    -- Scoring
    points_for_win INTEGER DEFAULT 3,
    points_for_draw INTEGER DEFAULT 1,
    points_for_loss INTEGER DEFAULT 0,

    status league_status NOT NULL DEFAULT 'draft',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(league_id, season_number)
);

-- League participants (teams or individuals)
CREATE TABLE league_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    season_id UUID NOT NULL REFERENCES league_seasons(id) ON DELETE CASCADE,

    team_name VARCHAR(100),

    -- Standings
    matches_played INTEGER DEFAULT 0,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    draws INTEGER DEFAULT 0,
    points INTEGER DEFAULT 0,

    -- Game stats
    games_won INTEGER DEFAULT 0,
    games_lost INTEGER DEFAULT 0,
    points_scored INTEGER DEFAULT 0,
    points_conceded INTEGER DEFAULT 0,

    -- Ranking
    rank INTEGER,
    previous_rank INTEGER,

    status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active', 'withdrawn', 'disqualified'

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- League participant players
CREATE TABLE league_participant_players (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    participant_id UUID NOT NULL REFERENCES league_participants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    is_captain BOOLEAN DEFAULT FALSE,
    rating_at_registration DECIMAL(4,2),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(participant_id, user_id)
);

-- League matches
CREATE TABLE league_matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    season_id UUID NOT NULL REFERENCES league_seasons(id) ON DELETE CASCADE,

    -- Match week
    week_number INTEGER NOT NULL,

    -- Participants
    participant1_id UUID NOT NULL REFERENCES league_participants(id),
    participant2_id UUID NOT NULL REFERENCES league_participants(id),

    -- Scheduling
    court_id UUID REFERENCES courts(id),
    scheduled_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,

    -- Results
    status game_status NOT NULL DEFAULT 'scheduled',
    winner_participant_id UUID REFERENCES league_participants(id),

    scores JSONB DEFAULT '[]',

    -- Points awarded
    participant1_points INTEGER,
    participant2_points INTEGER,

    -- Link to detailed game record
    game_id UUID REFERENCES games(id),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- League standings history (for tracking over time)
CREATE TABLE league_standings_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    participant_id UUID NOT NULL REFERENCES league_participants(id) ON DELETE CASCADE,

    week_number INTEGER NOT NULL,
    rank INTEGER NOT NULL,
    points INTEGER NOT NULL,

    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(participant_id, week_number)
);

-- Indexes for leagues
CREATE INDEX idx_leagues_slug ON leagues(slug);
CREATE INDEX idx_leagues_status ON leagues(status);
CREATE INDEX idx_league_seasons_league_id ON league_seasons(league_id);
CREATE INDEX idx_league_seasons_status ON league_seasons(status);
CREATE INDEX idx_league_participants_season_id ON league_participants(season_id);
CREATE INDEX idx_league_participants_rank ON league_participants(rank);
CREATE INDEX idx_league_participant_players_user_id ON league_participant_players(user_id);
CREATE INDEX idx_league_matches_season_id ON league_matches(season_id);
CREATE INDEX idx_league_matches_week ON league_matches(season_id, week_number);
CREATE INDEX idx_league_matches_scheduled_at ON league_matches(scheduled_at);
```

---

## 7. Social Features

```sql
-- Friendship status
CREATE TYPE friendship_status AS ENUM ('pending', 'accepted', 'blocked');

-- User friendships
CREATE TABLE user_friendships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    addressee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    status friendship_status NOT NULL DEFAULT 'pending',

    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    responded_at TIMESTAMPTZ,

    -- Prevent duplicate friendships
    CONSTRAINT unique_friendship UNIQUE (
        LEAST(requester_id, addressee_id),
        GREATEST(requester_id, addressee_id)
    ),

    -- Can't friend yourself
    CONSTRAINT no_self_friendship CHECK (requester_id != addressee_id)
);

-- Achievements/Badges
CREATE TABLE achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,

    -- Categorization
    category VARCHAR(50) NOT NULL, -- 'games', 'social', 'tournament', 'league', 'skill', 'special'
    tier VARCHAR(20) DEFAULT 'bronze', -- 'bronze', 'silver', 'gold', 'platinum'

    -- Display
    icon_url VARCHAR(500),
    badge_color VARCHAR(20),

    -- Requirements (JSONB for flexibility)
    requirements JSONB NOT NULL,
    -- Examples:
    -- {"type": "games_played", "count": 100}
    -- {"type": "win_streak", "count": 5}
    -- {"type": "rating_reached", "rating": 4.0}

    -- Points
    points INTEGER DEFAULT 0,

    -- Rarity (calculated based on holders)
    rarity_percentage DECIMAL(5,2),

    is_active BOOLEAN DEFAULT TRUE,
    is_secret BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User achievements
CREATE TABLE user_achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,

    earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Progress tracking (for progressive achievements)
    progress JSONB,

    -- Reference to what triggered it
    source_type VARCHAR(50),
    source_id UUID,

    UNIQUE(user_id, achievement_id)
);

-- Activity feed events
CREATE TABLE activity_feed_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    event_type VARCHAR(50) NOT NULL,
    -- Types: 'game_completed', 'achievement_earned', 'rating_changed',
    -- 'tournament_joined', 'club_joined', 'friend_added', 'league_joined'

    -- Event data
    event_data JSONB NOT NULL,

    -- Reference
    reference_type VARCHAR(50),
    reference_id UUID,

    -- Visibility
    is_public BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    type VARCHAR(50) NOT NULL,
    -- Types: 'game_invite', 'game_reminder', 'friend_request', 'club_invite',
    -- 'tournament_registration', 'match_scheduled', 'rating_update', etc.

    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,

    -- Action
    action_url VARCHAR(500),
    action_data JSONB,

    -- Reference
    reference_type VARCHAR(50),
    reference_id UUID,

    -- Status
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,

    -- Delivery
    email_sent BOOLEAN DEFAULT FALSE,
    push_sent BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User availability
CREATE TABLE user_availability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Recurring availability
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,

    -- Optional date range
    effective_from DATE,
    effective_until DATE,

    -- Preferences for this slot
    preferred_venue_id UUID REFERENCES venues(id),
    preferred_game_format game_format,

    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for social features
CREATE INDEX idx_user_friendships_requester ON user_friendships(requester_id);
CREATE INDEX idx_user_friendships_addressee ON user_friendships(addressee_id);
CREATE INDEX idx_user_friendships_status ON user_friendships(status);
CREATE INDEX idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX idx_user_achievements_achievement_id ON user_achievements(achievement_id);
CREATE INDEX idx_activity_feed_user_id ON activity_feed_events(user_id);
CREATE INDEX idx_activity_feed_created_at ON activity_feed_events(created_at DESC);
CREATE INDEX idx_activity_feed_type ON activity_feed_events(event_type);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_user_availability_user_id ON user_availability(user_id);
CREATE INDEX idx_user_availability_day ON user_availability(day_of_week);
```

---

## 8. Audit and System Tables

```sql
-- Audit log for important changes
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Who made the change
    user_id UUID REFERENCES users(id),
    ip_address INET,
    user_agent TEXT,

    -- What changed
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'

    -- Change details
    old_values JSONB,
    new_values JSONB,
    changed_fields TEXT[],

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- System settings
CREATE TABLE system_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID REFERENCES users(id)
);

-- Indexes for audit
CREATE INDEX idx_audit_log_table_name ON audit_log(table_name);
CREATE INDEX idx_audit_log_record_id ON audit_log(record_id);
CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at DESC);
```

---

## 9. Database Triggers

```sql
-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to all tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_ratings_updated_at BEFORE UPDATE ON user_ratings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_venues_updated_at BEFORE UPDATE ON venues
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_courts_updated_at BEFORE UPDATE ON courts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_games_updated_at BEFORE UPDATE ON games
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clubs_updated_at BEFORE UPDATE ON clubs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_club_memberships_updated_at BEFORE UPDATE ON club_memberships
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tournaments_updated_at BEFORE UPDATE ON tournaments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leagues_updated_at BEFORE UPDATE ON leagues
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_league_seasons_updated_at BEFORE UPDATE ON league_seasons
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update club member count
CREATE OR REPLACE FUNCTION update_club_member_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE clubs SET
            member_count = (SELECT COUNT(*) FROM club_memberships WHERE club_id = NEW.club_id),
            active_member_count = (SELECT COUNT(*) FROM club_memberships WHERE club_id = NEW.club_id AND status = 'active')
        WHERE id = NEW.club_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE clubs SET
            member_count = (SELECT COUNT(*) FROM club_memberships WHERE club_id = OLD.club_id),
            active_member_count = (SELECT COUNT(*) FROM club_memberships WHERE club_id = OLD.club_id AND status = 'active')
        WHERE id = OLD.club_id;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_club_counts AFTER INSERT OR UPDATE OR DELETE ON club_memberships
    FOR EACH ROW EXECUTE FUNCTION update_club_member_count();

-- Update venue average rating
CREATE OR REPLACE FUNCTION update_venue_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE venues SET
        average_rating = (SELECT AVG(rating)::DECIMAL(2,1) FROM court_reviews WHERE venue_id = COALESCE(NEW.venue_id, OLD.venue_id)),
        total_reviews = (SELECT COUNT(*) FROM court_reviews WHERE venue_id = COALESCE(NEW.venue_id, OLD.venue_id))
    WHERE id = COALESCE(NEW.venue_id, OLD.venue_id);
    RETURN NULL;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_venue_rating_trigger AFTER INSERT OR UPDATE OR DELETE ON court_reviews
    FOR EACH ROW EXECUTE FUNCTION update_venue_rating();
```

---

## 10. TypeScript Types

```typescript
// types/database.ts

// Enums
export type RatingType = 'dupr' | 'internal' | 'self_reported';
export type GameFormat = 'singles' | 'doubles' | 'mixed_doubles';
export type GameStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'forfeited';
export type GameType = 'casual' | 'competitive' | 'tournament' | 'league' | 'ladder';
export type VenueType = 'public' | 'private' | 'club' | 'recreation_center' | 'school' | 'gym';
export type CourtSurface = 'concrete' | 'asphalt' | 'sport_court' | 'wood' | 'indoor' | 'turf';
export type ClubRole = 'owner' | 'admin' | 'moderator' | 'member';
export type MembershipStatus = 'pending' | 'active' | 'suspended' | 'expired' | 'cancelled';
export type TournamentStatus = 'draft' | 'registration_open' | 'registration_closed' | 'in_progress' | 'completed' | 'cancelled';
export type TournamentFormat = 'single_elimination' | 'double_elimination' | 'round_robin' | 'pool_play' | 'swiss';
export type BracketStatus = 'pending' | 'in_progress' | 'completed';
export type LeagueStatus = 'draft' | 'registration_open' | 'registration_closed' | 'in_progress' | 'completed' | 'cancelled';
export type FriendshipStatus = 'pending' | 'accepted' | 'blocked';
export type Gender = 'male' | 'female' | 'other' | 'prefer_not_to_say';
export type DominantHand = 'left' | 'right' | 'ambidextrous';
export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'pro';

// Base types
export interface Timestamps {
  created_at: Date;
  updated_at: Date;
}

// User types
export interface User extends Timestamps {
  id: string;
  email: string;
  username: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  date_of_birth: Date | null;
  gender: Gender | null;
  city: string | null;
  state: string | null;
  country: string;
  zip_code: string | null;
  location: { lat: number; lng: number } | null;
  skill_level: SkillLevel | null;
  play_style: string | null;
  dominant_hand: DominantHand | null;
  paddle_brand: string | null;
  years_playing: number | null;
  preferred_play_times: string[];
  preferred_game_types: GameFormat[];
  willing_to_travel_miles: number;
  notification_preferences: NotificationPreferences;
  privacy_settings: PrivacySettings;
  email_verified: boolean;
  phone: string | null;
  phone_verified: boolean;
  is_active: boolean;
  is_banned: boolean;
  ban_reason: string | null;
  last_login_at: Date | null;
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  sms: boolean;
}

export interface PrivacySettings {
  profile_public: boolean;
  show_rating: boolean;
  show_stats: boolean;
}

export interface UserRating extends Timestamps {
  id: string;
  user_id: string;
  rating_type: RatingType;
  game_format: GameFormat;
  rating: number;
  reliability_score: number | null;
  games_played: number;
  wins: number;
  losses: number;
  dupr_id: string | null;
  dupr_last_sync: Date | null;
}

export interface RatingHistory {
  id: string;
  user_id: string;
  rating_type: RatingType;
  game_format: GameFormat;
  old_rating: number | null;
  new_rating: number;
  rating_change: number;
  source_type: string;
  source_id: string | null;
  created_at: Date;
}

// Venue and Court types
export interface Venue extends Timestamps {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  venue_type: VenueType;
  website: string | null;
  phone: string | null;
  email: string | null;
  street_address: string;
  city: string;
  state: string;
  country: string;
  zip_code: string;
  location: { lat: number; lng: number };
  amenities: string[];
  operating_hours: OperatingHours;
  cover_image_url: string | null;
  image_urls: string[];
  average_rating: number;
  total_reviews: number;
  owner_id: string | null;
  is_verified: boolean;
  is_active: boolean;
}

export interface OperatingHours {
  [day: string]: { open: string; close: string } | null;
}

export interface Court extends Timestamps {
  id: string;
  venue_id: string;
  name: string;
  court_number: number | null;
  surface: CourtSurface;
  is_indoor: boolean;
  has_lights: boolean;
  is_covered: boolean;
  width_feet: number;
  length_feet: number;
  is_reservable: boolean;
  requires_membership: boolean;
  is_active: boolean;
  hourly_rate: number | null;
  peak_hourly_rate: number | null;
}

export interface CourtReview extends Timestamps {
  id: string;
  court_id: string | null;
  venue_id: string;
  user_id: string;
  rating: number;
  title: string | null;
  content: string | null;
  surface_quality: number | null;
  net_quality: number | null;
  lighting_quality: number | null;
  cleanliness: number | null;
  is_approved: boolean;
  is_flagged: boolean;
}

// Game types
export interface Game extends Timestamps {
  id: string;
  game_type: GameType;
  game_format: GameFormat;
  status: GameStatus;
  venue_id: string | null;
  court_id: string | null;
  location_notes: string | null;
  scheduled_at: Date | null;
  started_at: Date | null;
  completed_at: Date | null;
  duration_minutes: number | null;
  winning_team: 1 | 2 | null;
  is_draw: boolean;
  scores: GameScore[];
  points_to_win: number;
  win_by: number;
  best_of: number;
  is_rated: boolean;
  rating_processed: boolean;
  rating_processed_at: Date | null;
  tournament_match_id: string | null;
  league_match_id: string | null;
  notes: string | null;
  created_by: string;
}

export interface GameScore {
  team1: number;
  team2: number;
}

export interface GameParticipant {
  id: string;
  game_id: string;
  user_id: string;
  team: 1 | 2;
  position: string | null;
  points_scored: number | null;
  aces: number | null;
  faults: number | null;
  rating_at_game: number | null;
  rating_change: number | null;
  is_confirmed: boolean;
  confirmed_at: Date | null;
  created_at: Date;
}

// Club types
export interface Club extends Timestamps {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  website: string | null;
  city: string | null;
  state: string | null;
  country: string;
  location: { lat: number; lng: number } | null;
  home_venue_id: string | null;
  is_public: boolean;
  requires_approval: boolean;
  max_members: number | null;
  member_count: number;
  active_member_count: number;
  min_skill_level: SkillLevel | null;
  max_skill_level: SkillLevel | null;
  average_rating: number | null;
  social_links: Record<string, string>;
  settings: Record<string, unknown>;
  is_active: boolean;
  created_by: string;
}

export interface ClubMembership extends Timestamps {
  id: string;
  club_id: string;
  user_id: string;
  role: ClubRole;
  status: MembershipStatus;
  joined_at: Date | null;
  expires_at: Date | null;
  games_played: number;
  events_attended: number;
  invited_by: string | null;
  approved_by: string | null;
  notes: string | null;
}

export interface ClubEvent extends Timestamps {
  id: string;
  club_id: string;
  title: string;
  description: string | null;
  event_type: string;
  venue_id: string | null;
  location_notes: string | null;
  starts_at: Date;
  ends_at: Date;
  timezone: string;
  max_participants: number | null;
  current_participants: number;
  waitlist_enabled: boolean;
  registration_opens_at: Date | null;
  registration_closes_at: Date | null;
  min_rating: number | null;
  max_rating: number | null;
  members_only: boolean;
  is_recurring: boolean;
  recurrence_rule: Record<string, unknown> | null;
  is_cancelled: boolean;
  cancelled_reason: string | null;
  created_by: string;
}

// Tournament types
export interface Tournament extends Timestamps {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  organizer_id: string;
  club_id: string | null;
  venue_id: string | null;
  location_notes: string | null;
  starts_at: Date;
  ends_at: Date;
  timezone: string;
  registration_opens_at: Date | null;
  registration_closes_at: Date | null;
  max_participants: number | null;
  current_participants: number;
  waitlist_enabled: boolean;
  tournament_format: TournamentFormat;
  game_format: GameFormat;
  points_to_win: number;
  win_by: number;
  best_of: number;
  is_rated: boolean;
  min_rating: number | null;
  max_rating: number | null;
  logo_url: string | null;
  banner_url: string | null;
  rules: string | null;
  status: TournamentStatus;
}

export interface TournamentDivision {
  id: string;
  tournament_id: string;
  name: string;
  description: string | null;
  game_format: GameFormat;
  min_rating: number | null;
  max_rating: number | null;
  max_teams: number | null;
  current_teams: number;
  sort_order: number;
  created_at: Date;
}

export interface TournamentRegistration {
  id: string;
  tournament_id: string;
  division_id: string | null;
  team_name: string | null;
  seed: number | null;
  status: string;
  waitlist_position: number | null;
  payment_reference: string | null;
  payment_status: string;
  registered_at: Date;
  confirmed_at: Date | null;
  withdrawn_at: Date | null;
  notes: string | null;
}

export interface TournamentBracket extends Timestamps {
  id: string;
  tournament_id: string;
  division_id: string | null;
  name: string;
  bracket_type: string;
  status: BracketStatus;
  pool_size: number | null;
  advancement_count: number | null;
  bracket_data: Record<string, unknown> | null;
}

export interface TournamentMatch extends Timestamps {
  id: string;
  tournament_id: string;
  bracket_id: string;
  round_number: number;
  match_number: number;
  team1_registration_id: string | null;
  team2_registration_id: string | null;
  team1_from_match_id: string | null;
  team2_from_match_id: string | null;
  team1_from_position: string | null;
  team2_from_position: string | null;
  court_id: string | null;
  scheduled_at: Date | null;
  started_at: Date | null;
  completed_at: Date | null;
  status: GameStatus;
  winner_registration_id: string | null;
  scores: GameScore[];
  game_id: string | null;
}

// League types
export interface League extends Timestamps {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  organizer_id: string;
  club_id: string | null;
  venue_id: string | null;
  game_format: GameFormat;
  is_rated: boolean;
  min_rating: number | null;
  max_rating: number | null;
  settings: Record<string, unknown>;
  rules: string | null;
  logo_url: string | null;
  status: LeagueStatus;
}

export interface LeagueSeason extends Timestamps {
  id: string;
  league_id: string;
  name: string;
  season_number: number;
  starts_at: Date;
  ends_at: Date;
  registration_opens_at: Date | null;
  registration_closes_at: Date | null;
  max_participants: number | null;
  matches_per_week: number;
  match_day: string | null;
  default_match_time: string | null;
  points_for_win: number;
  points_for_draw: number;
  points_for_loss: number;
  status: LeagueStatus;
}

export interface LeagueParticipant extends Timestamps {
  id: string;
  season_id: string;
  team_name: string | null;
  matches_played: number;
  wins: number;
  losses: number;
  draws: number;
  points: number;
  games_won: number;
  games_lost: number;
  points_scored: number;
  points_conceded: number;
  rank: number | null;
  previous_rank: number | null;
  status: string;
}

export interface LeagueMatch extends Timestamps {
  id: string;
  season_id: string;
  week_number: number;
  participant1_id: string;
  participant2_id: string;
  court_id: string | null;
  scheduled_at: Date | null;
  started_at: Date | null;
  completed_at: Date | null;
  status: GameStatus;
  winner_participant_id: string | null;
  scores: GameScore[];
  participant1_points: number | null;
  participant2_points: number | null;
  game_id: string | null;
}

// Social types
export interface UserFriendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: FriendshipStatus;
  requested_at: Date;
  responded_at: Date | null;
}

export interface Achievement {
  id: string;
  code: string;
  name: string;
  description: string;
  category: string;
  tier: string;
  icon_url: string | null;
  badge_color: string | null;
  requirements: AchievementRequirements;
  points: number;
  rarity_percentage: number | null;
  is_active: boolean;
  is_secret: boolean;
  created_at: Date;
}

export interface AchievementRequirements {
  type: string;
  count?: number;
  rating?: number;
  [key: string]: unknown;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  earned_at: Date;
  progress: Record<string, unknown> | null;
  source_type: string | null;
  source_id: string | null;
}

export interface ActivityFeedEvent {
  id: string;
  user_id: string;
  event_type: string;
  event_data: Record<string, unknown>;
  reference_type: string | null;
  reference_id: string | null;
  is_public: boolean;
  created_at: Date;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  action_url: string | null;
  action_data: Record<string, unknown> | null;
  reference_type: string | null;
  reference_id: string | null;
  is_read: boolean;
  read_at: Date | null;
  email_sent: boolean;
  push_sent: boolean;
  created_at: Date;
}

export interface UserAvailability extends Timestamps {
  id: string;
  user_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  effective_from: Date | null;
  effective_until: Date | null;
  preferred_venue_id: string | null;
  preferred_game_format: GameFormat | null;
  is_active: boolean;
}

// Audit types
export interface AuditLog {
  id: string;
  user_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  table_name: string;
  record_id: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  changed_fields: string[] | null;
  created_at: Date;
}
```

---

## 11. Indexing Strategy Summary

### Primary Indexes
- All tables have UUID primary keys with automatic indexing

### Foreign Key Indexes
All foreign keys are indexed for efficient joins:
- `user_id` columns across all tables
- `venue_id`, `court_id`, `club_id`, `tournament_id`, `league_id`
- Relationship table composite indexes

### Search Indexes
- `users.email`, `users.username` - Unique indexes for login
- `venues.slug`, `clubs.slug`, `tournaments.slug`, `leagues.slug` - URL-friendly lookups
- `games.status`, `tournaments.status`, `leagues.status` - Status filtering

### Geospatial Indexes (PostGIS GIST)
- `users.location` - Player location-based search
- `venues.location` - Court finder with distance calculations
- `clubs.location` - Club discovery

### Composite Indexes
- `user_ratings(rating_type, game_format)` - Rating lookups
- `league_matches(season_id, week_number)` - Schedule queries
- `activity_feed_events(user_id, created_at DESC)` - Feed pagination

### Partial Indexes
- `notifications(user_id, is_read) WHERE is_read = FALSE` - Unread notifications

---

## 12. Data Integrity Constraints

### Check Constraints
- Rating values: 1.0 to 8.0
- Game scores: Non-negative
- Review ratings: 1 to 5
- Percentages: 0 to 100
- Team numbers: 1 or 2

### Unique Constraints
- Email, username uniqueness
- Slug uniqueness per entity type
- One rating per user/type/format combination
- One review per user per venue
- Friendship uniqueness (bidirectional)

### Foreign Key Actions
- `ON DELETE CASCADE` - Child records removed with parent
- `ON DELETE SET NULL` - References cleared but record preserved
- `ON DELETE RESTRICT` - Prevent deletion if referenced

---

## 13. Performance Considerations

### Denormalization
- `clubs.member_count`, `clubs.active_member_count` - Avoid COUNT queries
- `venues.average_rating`, `venues.total_reviews` - Materialized aggregates
- `user_ratings` snapshot in `game_participants` - Historical accuracy

### Partitioning Candidates (for scale)
- `games` - By `created_at` (range partitioning)
- `activity_feed_events` - By `created_at` (range partitioning)
- `audit_log` - By `created_at` (range partitioning)
- `rating_history` - By `created_at` (range partitioning)

### JSONB vs Normalized Tables
- `operating_hours`, `amenities`, `social_links` - Flexible, infrequently queried
- `scores`, `requirements` - Variable structure
- `notification_preferences`, `privacy_settings` - User-specific configs

---

## 14. Migration Notes

When implementing this schema:

1. **Extension Setup**: Enable `uuid-ossp` and `postgis` first
2. **Enum Creation**: Create all enum types before tables
3. **Table Order**: Create tables respecting foreign key dependencies
4. **Trigger Setup**: Create triggers after all tables exist
5. **Seed Data**: Insert achievements, system settings after schema

---

## Appendix: Quick Reference

### Table Count by Category

| Category | Tables |
|----------|--------|
| Core Users | 3 |
| Venues/Courts | 3 |
| Games | 2 |
| Clubs | 4 |
| Tournaments | 5 |
| Leagues | 5 |
| Social | 5 |
| System | 2 |
| **Total** | **29** |

### Key Relationships

| From | To | Type |
|------|-----|------|
| User | Games | M:N via game_participants |
| User | Clubs | M:N via club_memberships |
| User | Tournaments | M:N via registration_players |
| User | Leagues | M:N via participant_players |
| User | User | M:N via user_friendships |
| Venue | Courts | 1:N |
| Club | Events | 1:N |
| Tournament | Divisions | 1:N |
| Tournament | Brackets | 1:N |
| League | Seasons | 1:N |
