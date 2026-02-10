DO $$ BEGIN
 CREATE TYPE "public"."partner_listing_status" AS ENUM('active', 'matched', 'expired');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."team_invite_status" AS ENUM('pending', 'accepted', 'declined', 'expired');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TYPE "notification_type" ADD VALUE 'game_result';--> statement-breakpoint
ALTER TYPE "notification_type" ADD VALUE 'tournament_update';--> statement-breakpoint
ALTER TYPE "notification_type" ADD VALUE 'achievement';--> statement-breakpoint
ALTER TYPE "notification_type" ADD VALUE 'waitlist_update';--> statement-breakpoint
ALTER TYPE "registration_status" ADD VALUE 'pending_partner';--> statement-breakpoint
ALTER TYPE "registration_status" ADD VALUE 'pending_payment';--> statement-breakpoint
ALTER TYPE "registration_status" ADD VALUE 'spot_offered';--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "dupr_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"dupr_id" varchar(50) NOT NULL,
	"dupr_internal_id" varchar(100),
	"dupr_user_token" text,
	"dupr_refresh_token" text,
	"token_expires_at" timestamp with time zone,
	"entitlement_level" varchar(20) DEFAULT 'NONE' NOT NULL,
	"singles_rating" numeric(4, 2),
	"doubles_rating" numeric(4, 2),
	"mixed_doubles_rating" numeric(4, 2),
	"last_sync_at" timestamp with time zone,
	"linked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dupr_accounts_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "dupr_accounts_dupr_id_unique" UNIQUE("dupr_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "dupr_match_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid,
	"tournament_match_id" uuid,
	"league_match_id" uuid,
	"dupr_match_id" varchar(100),
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"submitted_by" uuid,
	"payload" jsonb NOT NULL,
	"error_message" text,
	"submitted_at" timestamp with time zone,
	"confirmed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "partner_listings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"tournament_id" uuid,
	"league_id" uuid,
	"event_id" uuid,
	"skill_level_min" numeric(4, 2),
	"skill_level_max" numeric(4, 2),
	"message" text,
	"status" "partner_listing_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "referral_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"code" varchar(20) NOT NULL,
	"event_type" varchar(50),
	"event_id" uuid,
	"uses_count" integer DEFAULT 0 NOT NULL,
	"max_uses" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "referral_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "referral_conversions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"referral_code_id" uuid NOT NULL,
	"referred_user_id" uuid NOT NULL,
	"conversion_type" varchar(50) NOT NULL,
	"event_id" uuid,
	"reward_applied" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "referral_conversions_unique" UNIQUE("referral_code_id","referred_user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "team_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tournament_id" uuid,
	"league_id" uuid,
	"event_id" uuid,
	"inviter_id" uuid NOT NULL,
	"invitee_email" varchar(255),
	"invitee_user_id" uuid,
	"invite_code" varchar(50) NOT NULL,
	"team_name" varchar(100),
	"message" text,
	"status" "team_invite_status" DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "team_invites_invite_code_unique" UNIQUE("invite_code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tournament_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tournament_id" uuid NOT NULL,
	"name" varchar(200),
	"category" varchar(50) NOT NULL,
	"skill_level" varchar(20) NOT NULL,
	"age_group" varchar(50) DEFAULT 'open' NOT NULL,
	"format" "tournament_format" NOT NULL,
	"max_participants" integer DEFAULT 32 NOT NULL,
	"current_participants" integer DEFAULT 0,
	"entry_fee" numeric(8, 2) DEFAULT '0',
	"prize_money" numeric(10, 2) DEFAULT '0',
	"scoring_format" varchar(20) DEFAULT 'best_of_1',
	"points_to" integer DEFAULT 11,
	"win_by" integer DEFAULT 2,
	"pool_play_config" jsonb DEFAULT '{"enabled":false,"calculationMethod":"auto","numberOfPools":4,"gamesPerMatch":1,"advancementCount":2}'::jsonb NOT NULL,
	"seeding_config" jsonb DEFAULT '{"method":"skill_based","crossPoolSeeding":"standard"}'::jsonb NOT NULL,
	"bracket_config" jsonb DEFAULT '{"format":"double_elimination","thirdPlaceMatch":false,"consolationBracket":false}'::jsonb NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "club_events" ADD COLUMN "requires_dupr" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "club_events" ADD COLUMN "requires_dupr_plus" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "club_events" ADD COLUMN "requires_dupr_verified" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "tournament_registrations" ADD COLUMN "spot_offered_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "tournament_registrations" ADD COLUMN "spot_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "tournament_registrations" ADD COLUMN "partner_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "tournaments" ADD COLUMN "requires_dupr" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "tournaments" ADD COLUMN "requires_dupr_plus" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "tournaments" ADD COLUMN "requires_dupr_verified" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "tournaments" ADD COLUMN "report_to_dupr" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "tournaments" ADD COLUMN "entry_fee" numeric(8, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "tournaments" ADD COLUMN "stripe_payment_required" boolean DEFAULT false;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dupr_accounts" ADD CONSTRAINT "dupr_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dupr_match_submissions" ADD CONSTRAINT "dupr_match_submissions_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dupr_match_submissions" ADD CONSTRAINT "dupr_match_submissions_tournament_match_id_tournament_matches_id_fk" FOREIGN KEY ("tournament_match_id") REFERENCES "public"."tournament_matches"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dupr_match_submissions" ADD CONSTRAINT "dupr_match_submissions_league_match_id_league_matches_id_fk" FOREIGN KEY ("league_match_id") REFERENCES "public"."league_matches"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dupr_match_submissions" ADD CONSTRAINT "dupr_match_submissions_submitted_by_users_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "partner_listings" ADD CONSTRAINT "partner_listings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "partner_listings" ADD CONSTRAINT "partner_listings_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "partner_listings" ADD CONSTRAINT "partner_listings_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "referral_codes" ADD CONSTRAINT "referral_codes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "referral_conversions" ADD CONSTRAINT "referral_conversions_referral_code_id_referral_codes_id_fk" FOREIGN KEY ("referral_code_id") REFERENCES "public"."referral_codes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "referral_conversions" ADD CONSTRAINT "referral_conversions_referred_user_id_users_id_fk" FOREIGN KEY ("referred_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "team_invites" ADD CONSTRAINT "team_invites_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "team_invites" ADD CONSTRAINT "team_invites_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "team_invites" ADD CONSTRAINT "team_invites_inviter_id_users_id_fk" FOREIGN KEY ("inviter_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "team_invites" ADD CONSTRAINT "team_invites_invitee_user_id_users_id_fk" FOREIGN KEY ("invitee_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tournament_events" ADD CONSTRAINT "tournament_events_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "dupr_accounts_user_id_idx" ON "dupr_accounts" ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "dupr_accounts_dupr_id_idx" ON "dupr_accounts" ("dupr_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dupr_match_submissions_game_id_idx" ON "dupr_match_submissions" ("game_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dupr_match_submissions_tournament_match_id_idx" ON "dupr_match_submissions" ("tournament_match_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dupr_match_submissions_status_idx" ON "dupr_match_submissions" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dupr_match_submissions_dupr_match_id_idx" ON "dupr_match_submissions" ("dupr_match_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "partner_listings_user_id_idx" ON "partner_listings" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "partner_listings_tournament_id_idx" ON "partner_listings" ("tournament_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "partner_listings_league_id_idx" ON "partner_listings" ("league_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "partner_listings_status_idx" ON "partner_listings" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "partner_listings_skill_level_idx" ON "partner_listings" ("skill_level_min","skill_level_max");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "referral_codes_user_id_idx" ON "referral_codes" ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "referral_codes_code_idx" ON "referral_codes" ("code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "referral_codes_event_type_idx" ON "referral_codes" ("event_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "referral_codes_is_active_idx" ON "referral_codes" ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "referral_conversions_referral_code_id_idx" ON "referral_conversions" ("referral_code_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "referral_conversions_referred_user_id_idx" ON "referral_conversions" ("referred_user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "referral_conversions_conversion_type_idx" ON "referral_conversions" ("conversion_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "team_invites_inviter_id_idx" ON "team_invites" ("inviter_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "team_invites_invite_code_idx" ON "team_invites" ("invite_code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "team_invites_status_idx" ON "team_invites" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "team_invites_tournament_id_idx" ON "team_invites" ("tournament_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "team_invites_league_id_idx" ON "team_invites" ("league_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "team_invites_invitee_user_id_idx" ON "team_invites" ("invitee_user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tournament_events_tournament_id_idx" ON "tournament_events" ("tournament_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tournament_events_category_idx" ON "tournament_events" ("category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tournament_events_skill_level_idx" ON "tournament_events" ("skill_level");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tournament_events_sort_order_idx" ON "tournament_events" ("tournament_id","sort_order");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tournament_registrations_waitlist_position_idx" ON "tournament_registrations" ("tournament_id","waitlist_position");