CREATE TABLE "audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"actor_id" text NOT NULL,
	"action" text NOT NULL,
	"entity_id" text NOT NULL,
	"detail" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "claim_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"tool_id" text NOT NULL,
	"user_id" text NOT NULL,
	"company" text NOT NULL,
	"role" text NOT NULL,
	"proof" text NOT NULL,
	"status" text DEFAULT 'payment_required' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"claim_id" text NOT NULL,
	"amount" integer NOT NULL,
	"currency" text DEFAULT 'usd' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"stripe_session_id" text,
	CONSTRAINT "orders_claim_id_unique" UNIQUE("claim_id"),
	CONSTRAINT "orders_stripe_session_id_unique" UNIQUE("stripe_session_id")
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer NOT NULL,
	"window_start" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tool_reviews" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"tool_id" text NOT NULL,
	"rating" integer NOT NULL,
	"body" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rating_range" CHECK ("tool_reviews"."rating" BETWEEN 1 AND 5)
);
--> statement-breakpoint
CREATE TABLE "saved_tools" (
	"user_id" text NOT NULL,
	"tool_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "saved_tools_user_id_tool_id_pk" PRIMARY KEY("user_id","tool_id")
);
--> statement-breakpoint
CREATE TABLE "stack_tools" (
	"stack_id" text NOT NULL,
	"tool_id" text NOT NULL,
	CONSTRAINT "stack_tools_stack_id_tool_id_pk" PRIMARY KEY("stack_id","tool_id")
);
--> statement-breakpoint
CREATE TABLE "stacks" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "taxonomy" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"parent_id" text,
	"data" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tools" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"category_id" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"data" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tools_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"is_admin" boolean DEFAULT false NOT NULL,
	"is_creator" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vendor_access" (
	"tool_id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "billing_webhook_receipts" (
	"id" text PRIMARY KEY NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "claim_requests" ADD CONSTRAINT "claim_requests_tool_id_tools_id_fk" FOREIGN KEY ("tool_id") REFERENCES "public"."tools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_requests" ADD CONSTRAINT "claim_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_claim_id_claim_requests_id_fk" FOREIGN KEY ("claim_id") REFERENCES "public"."claim_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tool_reviews" ADD CONSTRAINT "tool_reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tool_reviews" ADD CONSTRAINT "tool_reviews_tool_id_tools_id_fk" FOREIGN KEY ("tool_id") REFERENCES "public"."tools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_tools" ADD CONSTRAINT "saved_tools_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_tools" ADD CONSTRAINT "saved_tools_tool_id_tools_id_fk" FOREIGN KEY ("tool_id") REFERENCES "public"."tools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stack_tools" ADD CONSTRAINT "stack_tools_stack_id_stacks_id_fk" FOREIGN KEY ("stack_id") REFERENCES "public"."stacks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stack_tools" ADD CONSTRAINT "stack_tools_tool_id_tools_id_fk" FOREIGN KEY ("tool_id") REFERENCES "public"."tools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stacks" ADD CONSTRAINT "stacks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tools" ADD CONSTRAINT "tools_category_id_taxonomy_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."taxonomy"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_access" ADD CONSTRAINT "vendor_access_tool_id_tools_id_fk" FOREIGN KEY ("tool_id") REFERENCES "public"."tools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_access" ADD CONSTRAINT "vendor_access_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "one_review_per_user_tool" ON "tool_reviews" USING btree ("user_id","tool_id");