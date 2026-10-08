CREATE TABLE "featured_placements" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"tool_id" text NOT NULL,
	"sponsor_name" text NOT NULL,
	"note" text NOT NULL,
	"status" text DEFAULT 'pending_review' NOT NULL,
	"review_reason" text,
	"amount" integer,
	"currency" text,
	"duration_days" integer,
	"stripe_price_id" text,
	"stripe_session_id" text,
	"checkout_attempt" integer DEFAULT 0 NOT NULL,
	"paid_at" timestamp with time zone,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "featured_placements_stripe_session_id_unique" UNIQUE("stripe_session_id"),
	CONSTRAINT "featured_status" CHECK ("featured_placements"."status" IN ('pending_review','approved','rejected','active','suspended')),
	CONSTRAINT "featured_positive_amount" CHECK ("featured_placements"."amount" IS NULL OR "featured_placements"."amount" > 0),
	CONSTRAINT "featured_duration" CHECK ("featured_placements"."duration_days" IS NULL OR "featured_placements"."duration_days" BETWEEN 1 AND 365),
	CONSTRAINT "featured_paid_window" CHECK ("featured_placements"."status" NOT IN ('active','suspended') OR ("featured_placements"."paid_at" IS NOT NULL AND "featured_placements"."starts_at" IS NOT NULL AND "featured_placements"."ends_at" IS NOT NULL AND "featured_placements"."ends_at" > "featured_placements"."starts_at" AND "featured_placements"."amount" IS NOT NULL AND "featured_placements"."duration_days" IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "featured_placements" ADD CONSTRAINT "featured_placements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "featured_placements" ADD CONSTRAINT "featured_placements_tool_id_tools_id_fk" FOREIGN KEY ("tool_id") REFERENCES "public"."tools"("id") ON DELETE no action ON UPDATE no action;