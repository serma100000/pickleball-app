ALTER TABLE "league_seasons" ADD COLUMN "requires_dupr" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "league_seasons" ADD COLUMN "requires_dupr_plus" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "league_seasons" ADD COLUMN "requires_dupr_verified" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "league_seasons" ADD COLUMN "report_to_dupr" boolean DEFAULT false;