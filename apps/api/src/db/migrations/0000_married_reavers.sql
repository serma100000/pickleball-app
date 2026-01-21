DO $$ BEGIN
 CREATE TYPE "public"."audit_action" AS ENUM('INSERT', 'UPDATE', 'DELETE');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."bracket_status" AS ENUM('pending', 'in_progress', 'completed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."club_role" AS ENUM('owner', 'admin', 'moderator', 'member');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."dominant_hand" AS ENUM('left', 'right', 'ambidextrous');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."event_registration_status" AS ENUM('registered', 'waitlisted', 'cancelled', 'attended');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."friendship_status" AS ENUM('pending', 'accepted', 'blocked');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."game_format" AS ENUM('singles', 'doubles', 'mixed_doubles');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."game_status" AS ENUM('scheduled', 'in_progress', 'completed', 'cancelled', 'forfeited');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."game_type" AS ENUM('casual', 'competitive', 'tournament', 'league', 'ladder');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."gender" AS ENUM('male', 'female', 'other', 'prefer_not_to_say');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."league_status" AS ENUM('draft', 'registration_open', 'registration_closed', 'in_progress', 'completed', 'cancelled');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."membership_status" AS ENUM('pending', 'active', 'suspended', 'expired', 'cancelled');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."notification_type" AS ENUM('game_invite', 'game_reminder', 'game_completed', 'friend_request', 'friend_accepted', 'club_invite', 'club_approved', 'tournament_registration', 'tournament_reminder', 'match_scheduled', 'match_result', 'rating_update', 'achievement_earned', 'league_update', 'system');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."participant_status" AS ENUM('active', 'withdrawn', 'disqualified');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."payment_status" AS ENUM('pending', 'completed', 'failed', 'refunded');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."rating_type" AS ENUM('dupr', 'internal', 'self_reported');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."registration_status" AS ENUM('registered', 'waitlisted', 'confirmed', 'withdrawn', 'disqualified');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."skill_level" AS ENUM('beginner', 'intermediate', 'advanced', 'pro');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."surface_type" AS ENUM('concrete', 'asphalt', 'sport_court', 'wood', 'indoor', 'turf');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."tournament_format" AS ENUM('single_elimination', 'double_elimination', 'round_robin', 'pool_play', 'swiss');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."tournament_status" AS ENUM('draft', 'registration_open', 'registration_closed', 'in_progress', 'completed', 'cancelled');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."venue_type" AS ENUM('public', 'private', 'club', 'recreation_center', 'school', 'gym');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "achievements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text NOT NULL,
	"category" varchar(50) NOT NULL,
	"tier" varchar(20) DEFAULT 'bronze',
	"icon_url" varchar(500),
	"badge_color" varchar(20),
	"requirements" jsonb NOT NULL,
	"points" integer DEFAULT 0,
	"rarity_percentage" numeric(5, 2),
	"is_active" boolean DEFAULT true,
	"is_secret" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "achievements_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "activity_feed_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"event_type" varchar(50) NOT NULL,
	"event_data" jsonb NOT NULL,
	"reference_type" varchar(50),
	"reference_id" uuid,
	"is_public" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"ip_address" "inet",
	"user_agent" text,
	"table_name" varchar(100) NOT NULL,
	"record_id" uuid NOT NULL,
	"action" "audit_action" NOT NULL,
	"old_values" jsonb,
	"new_values" jsonb,
	"changed_fields" text[],
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "club_event_registrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"status" "event_registration_status" DEFAULT 'registered' NOT NULL,
	"waitlist_position" integer,
	"registered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"cancelled_at" timestamp with time zone,
	"attended_at" timestamp with time zone,
	CONSTRAINT "club_event_registrations_event_user" UNIQUE("event_id","user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "club_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"club_id" uuid NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text,
	"event_type" varchar(50) NOT NULL,
	"venue_id" uuid,
	"location_notes" text,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"timezone" varchar(50) DEFAULT 'America/New_York',
	"max_participants" integer,
	"current_participants" integer DEFAULT 0,
	"waitlist_enabled" boolean DEFAULT true,
	"registration_opens_at" timestamp with time zone,
	"registration_closes_at" timestamp with time zone,
	"min_rating" numeric(4, 2),
	"max_rating" numeric(4, 2),
	"members_only" boolean DEFAULT true,
	"is_recurring" boolean DEFAULT false,
	"recurrence_rule" jsonb,
	"is_cancelled" boolean DEFAULT false,
	"cancelled_reason" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "club_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"club_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "club_role" DEFAULT 'member' NOT NULL,
	"status" "membership_status" DEFAULT 'pending' NOT NULL,
	"joined_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"games_played" integer DEFAULT 0,
	"events_attended" integer DEFAULT 0,
	"invited_by" uuid,
	"approved_by" uuid,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "club_memberships_club_user" UNIQUE("club_id","user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "clubs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(200) NOT NULL,
	"slug" varchar(200) NOT NULL,
	"description" text,
	"logo_url" varchar(500),
	"cover_image_url" varchar(500),
	"website" varchar(500),
	"city" varchar(100),
	"state" varchar(100),
	"country" varchar(100) DEFAULT 'USA',
	"latitude" numeric(10, 7),
	"longitude" numeric(10, 7),
	"home_venue_id" uuid,
	"is_public" boolean DEFAULT true,
	"requires_approval" boolean DEFAULT false,
	"max_members" integer,
	"member_count" integer DEFAULT 0,
	"active_member_count" integer DEFAULT 0,
	"min_skill_level" "skill_level",
	"max_skill_level" "skill_level",
	"average_rating" numeric(4, 2),
	"social_links" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "clubs_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "court_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"court_id" uuid,
	"venue_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"rating" integer NOT NULL,
	"title" varchar(200),
	"content" text,
	"surface_quality" integer,
	"net_quality" integer,
	"lighting_quality" integer,
	"cleanliness" integer,
	"is_approved" boolean DEFAULT true,
	"is_flagged" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "court_reviews_venue_user" UNIQUE("venue_id","user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "courts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"venue_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"court_number" integer,
	"surface" "surface_type" NOT NULL,
	"is_indoor" boolean DEFAULT false,
	"has_lights" boolean DEFAULT false,
	"is_covered" boolean DEFAULT false,
	"width_feet" numeric(5, 2) DEFAULT '20',
	"length_feet" numeric(5, 2) DEFAULT '44',
	"is_reservable" boolean DEFAULT true,
	"requires_membership" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"hourly_rate" numeric(8, 2),
	"peak_hourly_rate" numeric(8, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "courts_venue_court_number" UNIQUE("venue_id","court_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "game_participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"team" integer NOT NULL,
	"position" varchar(20),
	"points_scored" integer,
	"aces" integer,
	"faults" integer,
	"rating_at_game" numeric(4, 2),
	"rating_change" numeric(4, 2),
	"is_confirmed" boolean DEFAULT false,
	"confirmed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "game_participants_game_user" UNIQUE("game_id","user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "games" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_type" "game_type" DEFAULT 'casual' NOT NULL,
	"game_format" "game_format" NOT NULL,
	"status" "game_status" DEFAULT 'scheduled' NOT NULL,
	"venue_id" uuid,
	"court_id" uuid,
	"location_notes" text,
	"scheduled_at" timestamp with time zone,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"duration_minutes" integer,
	"winning_team" integer,
	"is_draw" boolean DEFAULT false,
	"scores" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"points_to_win" integer DEFAULT 11,
	"win_by" integer DEFAULT 2,
	"best_of" integer DEFAULT 1,
	"is_rated" boolean DEFAULT true,
	"rating_processed" boolean DEFAULT false,
	"rating_processed_at" timestamp with time zone,
	"tournament_match_id" uuid,
	"league_match_id" uuid,
	"notes" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "league_matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"season_id" uuid NOT NULL,
	"week_number" integer NOT NULL,
	"participant1_id" uuid NOT NULL,
	"participant2_id" uuid NOT NULL,
	"court_id" uuid,
	"scheduled_at" timestamp with time zone,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"status" "game_status" DEFAULT 'scheduled' NOT NULL,
	"winner_participant_id" uuid,
	"scores" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"participant1_points" integer,
	"participant2_points" integer,
	"game_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "league_participant_players" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"participant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"is_captain" boolean DEFAULT false,
	"rating_at_registration" numeric(4, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "league_participant_players_unique" UNIQUE("participant_id","user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "league_participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"season_id" uuid NOT NULL,
	"team_name" varchar(100),
	"matches_played" integer DEFAULT 0,
	"wins" integer DEFAULT 0,
	"losses" integer DEFAULT 0,
	"draws" integer DEFAULT 0,
	"points" integer DEFAULT 0,
	"games_won" integer DEFAULT 0,
	"games_lost" integer DEFAULT 0,
	"points_scored" integer DEFAULT 0,
	"points_conceded" integer DEFAULT 0,
	"rank" integer,
	"previous_rank" integer,
	"status" "participant_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "league_seasons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"league_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"season_number" integer NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"registration_opens_at" timestamp with time zone,
	"registration_closes_at" timestamp with time zone,
	"max_participants" integer,
	"matches_per_week" integer DEFAULT 1,
	"match_day" varchar(20),
	"default_match_time" time,
	"points_for_win" integer DEFAULT 3,
	"points_for_draw" integer DEFAULT 1,
	"points_for_loss" integer DEFAULT 0,
	"status" "league_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "league_seasons_league_season" UNIQUE("league_id","season_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "league_standings_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"participant_id" uuid NOT NULL,
	"week_number" integer NOT NULL,
	"rank" integer NOT NULL,
	"points" integer NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "league_standings_history_unique" UNIQUE("participant_id","week_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "leagues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(200) NOT NULL,
	"slug" varchar(200) NOT NULL,
	"description" text,
	"organizer_id" uuid NOT NULL,
	"club_id" uuid,
	"venue_id" uuid,
	"game_format" "game_format" NOT NULL,
	"is_rated" boolean DEFAULT true,
	"min_rating" numeric(4, 2),
	"max_rating" numeric(4, 2),
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"rules" text,
	"logo_url" varchar(500),
	"status" "league_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "leagues_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "notification_type" NOT NULL,
	"title" varchar(200) NOT NULL,
	"message" text NOT NULL,
	"action_url" varchar(500),
	"action_data" jsonb,
	"reference_type" varchar(50),
	"reference_id" uuid,
	"is_read" boolean DEFAULT false,
	"read_at" timestamp with time zone,
	"email_sent" boolean DEFAULT false,
	"push_sent" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rating_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"rating_type" "rating_type" NOT NULL,
	"game_format" "game_format" NOT NULL,
	"old_rating" numeric(4, 2),
	"new_rating" numeric(4, 2) NOT NULL,
	"source_type" varchar(50) NOT NULL,
	"source_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "system_settings" (
	"key" varchar(100) PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"description" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tournament_brackets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tournament_id" uuid NOT NULL,
	"division_id" uuid,
	"name" varchar(100) NOT NULL,
	"bracket_type" varchar(50) NOT NULL,
	"status" "bracket_status" DEFAULT 'pending' NOT NULL,
	"pool_size" integer,
	"advancement_count" integer,
	"bracket_data" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tournament_divisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tournament_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"game_format" "game_format" NOT NULL,
	"min_rating" numeric(4, 2),
	"max_rating" numeric(4, 2),
	"max_teams" integer,
	"current_teams" integer DEFAULT 0,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tournament_matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tournament_id" uuid NOT NULL,
	"bracket_id" uuid NOT NULL,
	"round_number" integer NOT NULL,
	"match_number" integer NOT NULL,
	"team1_registration_id" uuid,
	"team2_registration_id" uuid,
	"team1_from_match_id" uuid,
	"team2_from_match_id" uuid,
	"team1_from_position" varchar(10),
	"team2_from_position" varchar(10),
	"court_id" uuid,
	"scheduled_at" timestamp with time zone,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"status" "game_status" DEFAULT 'scheduled' NOT NULL,
	"winner_registration_id" uuid,
	"scores" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"game_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tournament_matches_bracket_round_match" UNIQUE("bracket_id","round_number","match_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tournament_registration_players" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"registration_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"is_captain" boolean DEFAULT false,
	"rating_at_registration" numeric(4, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tournament_registration_players_unique" UNIQUE("registration_id","user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tournament_registrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tournament_id" uuid NOT NULL,
	"division_id" uuid,
	"team_name" varchar(100),
	"seed" integer,
	"status" "registration_status" DEFAULT 'registered' NOT NULL,
	"waitlist_position" integer,
	"payment_reference" varchar(100),
	"payment_status" "payment_status" DEFAULT 'pending',
	"registered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"confirmed_at" timestamp with time zone,
	"withdrawn_at" timestamp with time zone,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tournaments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(200) NOT NULL,
	"slug" varchar(200) NOT NULL,
	"description" text,
	"organizer_id" uuid NOT NULL,
	"club_id" uuid,
	"venue_id" uuid,
	"location_notes" text,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"timezone" varchar(50) DEFAULT 'America/New_York',
	"registration_opens_at" timestamp with time zone,
	"registration_closes_at" timestamp with time zone,
	"max_participants" integer,
	"current_participants" integer DEFAULT 0,
	"waitlist_enabled" boolean DEFAULT true,
	"tournament_format" "tournament_format" NOT NULL,
	"game_format" "game_format" NOT NULL,
	"points_to_win" integer DEFAULT 11,
	"win_by" integer DEFAULT 2,
	"best_of" integer DEFAULT 1,
	"is_rated" boolean DEFAULT true,
	"min_rating" numeric(4, 2),
	"max_rating" numeric(4, 2),
	"logo_url" varchar(500),
	"banner_url" varchar(500),
	"rules" text,
	"status" "tournament_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tournaments_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_achievements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"achievement_id" uuid NOT NULL,
	"earned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"progress" jsonb,
	"source_type" varchar(50),
	"source_id" uuid,
	CONSTRAINT "user_achievements_unique" UNIQUE("user_id","achievement_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_availability" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"day_of_week" integer NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"effective_from" date,
	"effective_until" date,
	"preferred_venue_id" uuid,
	"preferred_game_format" "game_format",
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_friendships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"requester_id" uuid NOT NULL,
	"addressee_id" uuid NOT NULL,
	"status" "friendship_status" DEFAULT 'pending' NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"responded_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_ratings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"rating_type" "rating_type" NOT NULL,
	"game_format" "game_format" NOT NULL,
	"rating" numeric(4, 2) NOT NULL,
	"reliability_score" numeric(3, 2),
	"games_played" integer DEFAULT 0,
	"wins" integer DEFAULT 0,
	"losses" integer DEFAULT 0,
	"dupr_id" varchar(50),
	"dupr_last_sync" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_ratings_unique" UNIQUE("user_id","rating_type","game_format")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"username" varchar(50) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"display_name" varchar(100),
	"avatar_url" varchar(500),
	"bio" text,
	"date_of_birth" date,
	"gender" "gender",
	"city" varchar(100),
	"state" varchar(100),
	"country" varchar(100) DEFAULT 'USA',
	"zip_code" varchar(20),
	"latitude" numeric(10, 7),
	"longitude" numeric(10, 7),
	"skill_level" "skill_level",
	"play_style" varchar(50),
	"dominant_hand" "dominant_hand",
	"paddle_brand" varchar(100),
	"years_playing" integer,
	"preferred_play_times" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"preferred_game_types" jsonb DEFAULT '["doubles"]'::jsonb NOT NULL,
	"willing_to_travel_miles" integer DEFAULT 25,
	"notification_preferences" jsonb DEFAULT '{"email":true,"push":true,"sms":false}'::jsonb NOT NULL,
	"privacy_settings" jsonb DEFAULT '{"profile_public":true,"show_rating":true,"show_stats":true}'::jsonb NOT NULL,
	"email_verified" boolean DEFAULT false,
	"phone" varchar(20),
	"phone_verified" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"is_banned" boolean DEFAULT false,
	"ban_reason" text,
	"last_login_at" timestamp with time zone,
	"clerk_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_clerk_id_unique" UNIQUE("clerk_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "venues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(200) NOT NULL,
	"slug" varchar(200) NOT NULL,
	"description" text,
	"venue_type" "venue_type" NOT NULL,
	"website" varchar(500),
	"phone" varchar(20),
	"email" varchar(255),
	"street_address" varchar(255) NOT NULL,
	"city" varchar(100) NOT NULL,
	"state" varchar(100) NOT NULL,
	"country" varchar(100) DEFAULT 'USA',
	"zip_code" varchar(20) NOT NULL,
	"latitude" numeric(10, 7) NOT NULL,
	"longitude" numeric(10, 7) NOT NULL,
	"amenities" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"operating_hours" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"cover_image_url" varchar(500),
	"image_urls" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"average_rating" numeric(2, 1) DEFAULT '0',
	"total_reviews" integer DEFAULT 0,
	"owner_id" uuid,
	"is_verified" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "venues_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "activity_feed_events" ADD CONSTRAINT "activity_feed_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "club_event_registrations" ADD CONSTRAINT "club_event_registrations_event_id_club_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."club_events"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "club_event_registrations" ADD CONSTRAINT "club_event_registrations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "club_events" ADD CONSTRAINT "club_events_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "club_events" ADD CONSTRAINT "club_events_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "club_events" ADD CONSTRAINT "club_events_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "club_memberships" ADD CONSTRAINT "club_memberships_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "club_memberships" ADD CONSTRAINT "club_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "club_memberships" ADD CONSTRAINT "club_memberships_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "club_memberships" ADD CONSTRAINT "club_memberships_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "clubs" ADD CONSTRAINT "clubs_home_venue_id_venues_id_fk" FOREIGN KEY ("home_venue_id") REFERENCES "public"."venues"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "clubs" ADD CONSTRAINT "clubs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "court_reviews" ADD CONSTRAINT "court_reviews_court_id_courts_id_fk" FOREIGN KEY ("court_id") REFERENCES "public"."courts"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "court_reviews" ADD CONSTRAINT "court_reviews_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "court_reviews" ADD CONSTRAINT "court_reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "courts" ADD CONSTRAINT "courts_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "game_participants" ADD CONSTRAINT "game_participants_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "game_participants" ADD CONSTRAINT "game_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "games" ADD CONSTRAINT "games_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "games" ADD CONSTRAINT "games_court_id_courts_id_fk" FOREIGN KEY ("court_id") REFERENCES "public"."courts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "games" ADD CONSTRAINT "games_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "league_matches" ADD CONSTRAINT "league_matches_season_id_league_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."league_seasons"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "league_matches" ADD CONSTRAINT "league_matches_participant1_id_league_participants_id_fk" FOREIGN KEY ("participant1_id") REFERENCES "public"."league_participants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "league_matches" ADD CONSTRAINT "league_matches_participant2_id_league_participants_id_fk" FOREIGN KEY ("participant2_id") REFERENCES "public"."league_participants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "league_matches" ADD CONSTRAINT "league_matches_court_id_courts_id_fk" FOREIGN KEY ("court_id") REFERENCES "public"."courts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "league_matches" ADD CONSTRAINT "league_matches_winner_participant_id_league_participants_id_fk" FOREIGN KEY ("winner_participant_id") REFERENCES "public"."league_participants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "league_matches" ADD CONSTRAINT "league_matches_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "league_participant_players" ADD CONSTRAINT "league_participant_players_participant_id_league_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."league_participants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "league_participant_players" ADD CONSTRAINT "league_participant_players_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "league_participants" ADD CONSTRAINT "league_participants_season_id_league_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."league_seasons"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "league_seasons" ADD CONSTRAINT "league_seasons_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "league_standings_history" ADD CONSTRAINT "league_standings_history_participant_id_league_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."league_participants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "leagues" ADD CONSTRAINT "leagues_organizer_id_users_id_fk" FOREIGN KEY ("organizer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "leagues" ADD CONSTRAINT "leagues_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "leagues" ADD CONSTRAINT "leagues_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "rating_history" ADD CONSTRAINT "rating_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tournament_brackets" ADD CONSTRAINT "tournament_brackets_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tournament_brackets" ADD CONSTRAINT "tournament_brackets_division_id_tournament_divisions_id_fk" FOREIGN KEY ("division_id") REFERENCES "public"."tournament_divisions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tournament_divisions" ADD CONSTRAINT "tournament_divisions_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tournament_matches" ADD CONSTRAINT "tournament_matches_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tournament_matches" ADD CONSTRAINT "tournament_matches_bracket_id_tournament_brackets_id_fk" FOREIGN KEY ("bracket_id") REFERENCES "public"."tournament_brackets"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tournament_matches" ADD CONSTRAINT "tournament_matches_team1_registration_id_tournament_registrations_id_fk" FOREIGN KEY ("team1_registration_id") REFERENCES "public"."tournament_registrations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tournament_matches" ADD CONSTRAINT "tournament_matches_team2_registration_id_tournament_registrations_id_fk" FOREIGN KEY ("team2_registration_id") REFERENCES "public"."tournament_registrations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tournament_matches" ADD CONSTRAINT "tournament_matches_court_id_courts_id_fk" FOREIGN KEY ("court_id") REFERENCES "public"."courts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tournament_matches" ADD CONSTRAINT "tournament_matches_winner_registration_id_tournament_registrations_id_fk" FOREIGN KEY ("winner_registration_id") REFERENCES "public"."tournament_registrations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tournament_matches" ADD CONSTRAINT "tournament_matches_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tournament_registration_players" ADD CONSTRAINT "tournament_registration_players_registration_id_tournament_registrations_id_fk" FOREIGN KEY ("registration_id") REFERENCES "public"."tournament_registrations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tournament_registration_players" ADD CONSTRAINT "tournament_registration_players_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tournament_registrations" ADD CONSTRAINT "tournament_registrations_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tournament_registrations" ADD CONSTRAINT "tournament_registrations_division_id_tournament_divisions_id_fk" FOREIGN KEY ("division_id") REFERENCES "public"."tournament_divisions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tournaments" ADD CONSTRAINT "tournaments_organizer_id_users_id_fk" FOREIGN KEY ("organizer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tournaments" ADD CONSTRAINT "tournaments_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tournaments" ADD CONSTRAINT "tournaments_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_achievement_id_achievements_id_fk" FOREIGN KEY ("achievement_id") REFERENCES "public"."achievements"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_availability" ADD CONSTRAINT "user_availability_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_availability" ADD CONSTRAINT "user_availability_preferred_venue_id_venues_id_fk" FOREIGN KEY ("preferred_venue_id") REFERENCES "public"."venues"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_friendships" ADD CONSTRAINT "user_friendships_requester_id_users_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_friendships" ADD CONSTRAINT "user_friendships_addressee_id_users_id_fk" FOREIGN KEY ("addressee_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_ratings" ADD CONSTRAINT "user_ratings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "venues" ADD CONSTRAINT "venues_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "achievements_code_idx" ON "achievements" ("code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "activity_feed_user_id_idx" ON "activity_feed_events" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "activity_feed_created_at_idx" ON "activity_feed_events" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "activity_feed_type_idx" ON "activity_feed_events" ("event_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_log_table_name_idx" ON "audit_log" ("table_name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_log_record_id_idx" ON "audit_log" ("record_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_log_user_id_idx" ON "audit_log" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_log_created_at_idx" ON "audit_log" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "club_event_registrations_event_id_idx" ON "club_event_registrations" ("event_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "club_event_registrations_user_id_idx" ON "club_event_registrations" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "club_events_club_id_idx" ON "club_events" ("club_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "club_events_starts_at_idx" ON "club_events" ("starts_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "club_memberships_club_id_idx" ON "club_memberships" ("club_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "club_memberships_user_id_idx" ON "club_memberships" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "club_memberships_status_idx" ON "club_memberships" ("status");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "clubs_slug_idx" ON "clubs" ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "clubs_location_idx" ON "clubs" ("latitude","longitude");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "clubs_city_state_idx" ON "clubs" ("city","state");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "court_reviews_venue_id_idx" ON "court_reviews" ("venue_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "court_reviews_user_id_idx" ON "court_reviews" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "courts_venue_id_idx" ON "courts" ("venue_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "game_participants_game_id_idx" ON "game_participants" ("game_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "game_participants_user_id_idx" ON "game_participants" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "game_participants_team_idx" ON "game_participants" ("game_id","team");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "games_status_idx" ON "games" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "games_type_idx" ON "games" ("game_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "games_scheduled_at_idx" ON "games" ("scheduled_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "games_venue_id_idx" ON "games" ("venue_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "games_created_by_idx" ON "games" ("created_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "league_matches_season_id_idx" ON "league_matches" ("season_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "league_matches_week_idx" ON "league_matches" ("season_id","week_number");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "league_matches_scheduled_at_idx" ON "league_matches" ("scheduled_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "league_participant_players_user_id_idx" ON "league_participant_players" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "league_participants_season_id_idx" ON "league_participants" ("season_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "league_participants_rank_idx" ON "league_participants" ("rank");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "league_seasons_league_id_idx" ON "league_seasons" ("league_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "league_seasons_status_idx" ON "league_seasons" ("status");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "leagues_slug_idx" ON "leagues" ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "leagues_status_idx" ON "leagues" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_user_id_idx" ON "notifications" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_unread_idx" ON "notifications" ("user_id","is_read");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_created_at_idx" ON "notifications" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rating_history_user_id_idx" ON "rating_history" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rating_history_created_at_idx" ON "rating_history" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tournament_brackets_tournament_id_idx" ON "tournament_brackets" ("tournament_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tournament_divisions_tournament_id_idx" ON "tournament_divisions" ("tournament_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tournament_matches_bracket_id_idx" ON "tournament_matches" ("bracket_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tournament_matches_scheduled_at_idx" ON "tournament_matches" ("scheduled_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tournament_registration_players_user_id_idx" ON "tournament_registration_players" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tournament_registrations_tournament_id_idx" ON "tournament_registrations" ("tournament_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tournament_registrations_status_idx" ON "tournament_registrations" ("status");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "tournaments_slug_idx" ON "tournaments" ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tournaments_status_idx" ON "tournaments" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tournaments_starts_at_idx" ON "tournaments" ("starts_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tournaments_organizer_id_idx" ON "tournaments" ("organizer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_achievements_user_id_idx" ON "user_achievements" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_achievements_achievement_id_idx" ON "user_achievements" ("achievement_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_availability_user_id_idx" ON "user_availability" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_availability_day_idx" ON "user_availability" ("day_of_week");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_friendships_requester_idx" ON "user_friendships" ("requester_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_friendships_addressee_idx" ON "user_friendships" ("addressee_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_friendships_status_idx" ON "user_friendships" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_ratings_user_id_idx" ON "user_ratings" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_ratings_rating_idx" ON "user_ratings" ("rating");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_ratings_type_format_idx" ON "user_ratings" ("rating_type","game_format");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_idx" ON "users" ("email");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_username_idx" ON "users" ("username");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_clerk_id_idx" ON "users" ("clerk_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_location_idx" ON "users" ("latitude","longitude");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_skill_level_idx" ON "users" ("skill_level");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_city_state_idx" ON "users" ("city","state");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_created_at_idx" ON "users" ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "venues_slug_idx" ON "venues" ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "venues_location_idx" ON "venues" ("latitude","longitude");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "venues_city_state_idx" ON "venues" ("city","state");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "venues_type_idx" ON "venues" ("venue_type");