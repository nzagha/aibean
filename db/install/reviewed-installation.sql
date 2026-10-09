-- GENERATED OFFLINE. PROPOSAL ONLY; owner approval required for hosted execution.
-- Target: yfknxidgphhepdtwazhn / postgres. Review endpoint outside SQL as well.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
SET LOCAL search_path = public, pg_catalog;
SELECT pg_advisory_xact_lock(621487190);
DO $preflight$
BEGIN
  IF current_database() <> 'postgres' THEN RAISE EXCEPTION 'Unexpected database'; END IF;
  IF to_regclass('auth.users') IS NULL THEN RAISE EXCEPTION 'Supabase Auth schema required'; END IF;
  IF to_regclass('drizzle.__drizzle_migrations') IS NULL AND EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename IN ('taxonomy','users','tools','saved_tools','stacks','stack_tools','tool_reviews','vendor_access','claim_requests','orders','billing_webhook_receipts','audit_logs','rate_limits','featured_placements')
  ) THEN RAISE EXCEPTION 'Untracked application tables; reconcile before installation'; END IF;
END
$preflight$;
CREATE SCHEMA IF NOT EXISTS drizzle;
REVOKE ALL ON SCHEMA drizzle FROM PUBLIC, anon, authenticated, service_role;
CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (id serial PRIMARY KEY, hash text NOT NULL, created_at bigint);
REVOKE ALL ON drizzle.__drizzle_migrations FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA drizzle FROM PUBLIC, anon, authenticated, service_role;
DO $history$
BEGIN
  IF EXISTS (SELECT 1 FROM drizzle.__drizzle_migrations WHERE (created_at IS DISTINCT FROM 1791247215670 OR hash IS DISTINCT FROM 'b58134b31944656eda45a6ba929fcdb66a5ec4e66e01a8cfd3d8d9b16d4f4468') AND (created_at IS DISTINCT FROM 1791249181547 OR hash IS DISTINCT FROM '168fd0b654a75e1174052fc444893a66362f89bb3d1cdaec3bbfe9fcbf4f4df1'))
  OR EXISTS (SELECT 1 FROM drizzle.__drizzle_migrations GROUP BY created_at HAVING count(*) > 1)
  THEN RAISE EXCEPTION 'Migration ledger mismatch'; END IF;
  IF EXISTS (SELECT 1 FROM drizzle.__drizzle_migrations WHERE created_at=1791249181547)
  AND NOT EXISTS (SELECT 1 FROM drizzle.__drizzle_migrations WHERE created_at=1791247215670)
  THEN RAISE EXCEPTION 'Migration ledger is not a contiguous prefix'; END IF;
END
$history$;
DO $migration_0$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM drizzle.__drizzle_migrations WHERE created_at=1791247215670) THEN
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
    INSERT INTO drizzle.__drizzle_migrations(hash,created_at) VALUES ('b58134b31944656eda45a6ba929fcdb66a5ec4e66e01a8cfd3d8d9b16d4f4468',1791247215670);
  END IF;
END
$migration_0$;
DO $migration_1$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM drizzle.__drizzle_migrations WHERE created_at=1791249181547) THEN
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
    INSERT INTO drizzle.__drizzle_migrations(hash,created_at) VALUES ('168fd0b654a75e1174052fc444893a66362f89bb3d1cdaec3bbfe9fcbf4f4df1',1791249181547);
  END IF;
END
$migration_1$;
DO $supplement$
DECLARE installed_hash text;
BEGIN
  IF to_regclass('aibean_private.installations') IS NOT NULL THEN
    SELECT sql_sha256 INTO installed_hash FROM aibean_private.installations WHERE id='aibean-foundation-v1';
    IF installed_hash IS DISTINCT FROM 'eea0e7309e13440224ca80030a367afc76bc99c08b2027fc722b8fa2b388277a' THEN RAISE EXCEPTION 'Security package ledger mismatch'; END IF;
  ELSE
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='aibean_runtime')
      OR EXISTS (SELECT 1 FROM pg_namespace WHERE nspname='aibean_private')
    THEN RAISE EXCEPTION 'Untracked runtime role/private schema'; END IF;
-- PROPOSAL ONLY. Execute only through the reviewed atomic installation package.
-- No Auth records, legacy IDs, capability flags or TestUsers rows are modified.
CREATE ROLE aibean_runtime NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE SCHEMA aibean_private;
REVOKE ALL ON SCHEMA aibean_private FROM PUBLIC, anon, authenticated, service_role;
GRANT USAGE ON SCHEMA public, aibean_private TO aibean_runtime;

CREATE TABLE aibean_private.user_identities (
  auth_user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  user_id text NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE aibean_private.user_identities ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON aibean_private.user_identities FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT ON aibean_private.user_identities TO aibean_runtime;
CREATE POLICY runtime_read_identity ON aibean_private.user_identities
  FOR SELECT TO aibean_runtime USING (true);
CREATE POLICY runtime_insert_identity ON aibean_private.user_identities
  FOR INSERT TO aibean_runtime WITH CHECK (true);

-- Browser roles never access application tables directly in this stage.
-- The restricted service role is trusted server code; it does not inherit JWT
-- identity. Per-user ownership/capability checks remain mandatory in the app.
DO $security$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'taxonomy','users','tools','saved_tools','stacks','stack_tools','tool_reviews',
    'vendor_access','claim_requests','orders','featured_placements',
    'billing_webhook_receipts','audit_logs','rate_limits'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon, authenticated, service_role', table_name);
    EXECUTE format('CREATE POLICY runtime_service ON public.%I TO aibean_runtime USING (true) WITH CHECK (true)', table_name);
  END LOOP;
END
$security$;

GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.taxonomy, public.tools, public.saved_tools, public.stacks, public.stack_tools,
  public.tool_reviews, public.vendor_access, public.claim_requests, public.orders,
  public.featured_placements, public.rate_limits
TO aibean_runtime;
GRANT SELECT ON public.users TO aibean_runtime;
GRANT INSERT (id) ON public.users TO aibean_runtime;
-- Privileged capability changes remain an audited trusted-operator operation.
-- Runtime cannot grant Admin/Creator or delete application users.
GRANT SELECT, INSERT ON public.audit_logs, public.billing_webhook_receipts TO aibean_runtime;

-- Do not alter schema-wide defaults here: they may serve unrelated owner data.
-- Each later migration must harden its own objects before transaction commit.
-- Runtime receives no schema CREATE, TRUNCATE, role, ledger, or Auth privileges.

    CREATE TABLE aibean_private.installations (id text PRIMARY KEY, sql_sha256 text NOT NULL, installed_at timestamptz NOT NULL DEFAULT now());
    REVOKE ALL ON aibean_private.installations FROM PUBLIC, anon, authenticated, service_role, aibean_runtime;
    ALTER TABLE aibean_private.installations ENABLE ROW LEVEL SECURITY;
    INSERT INTO aibean_private.installations(id,sql_sha256) VALUES ('aibean-foundation-v1','eea0e7309e13440224ca80030a367afc76bc99c08b2027fc722b8fa2b388277a');
  END IF;
END
$supplement$;
-- Repeated installation validates history and basic hardening; never repairs drift silently.
DO $postflight$
BEGIN
  IF (SELECT count(*) FROM pg_tables WHERE schemaname='public' AND tablename IN ('taxonomy','users','tools','saved_tools','stacks','stack_tools','tool_reviews','vendor_access','claim_requests','orders','billing_webhook_receipts','audit_logs','rate_limits','featured_placements') AND rowsecurity) <> 14
  THEN RAISE EXCEPTION 'Application table/RLS drift'; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.table_privileges WHERE table_schema='public' AND table_name IN ('taxonomy','users','tools','saved_tools','stacks','stack_tools','tool_reviews','vendor_access','claim_requests','orders','billing_webhook_receipts','audit_logs','rate_limits','featured_placements') AND grantee IN ('PUBLIC','anon','authenticated','service_role'))
  THEN RAISE EXCEPTION 'Unexpected client API grants'; END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='aibean_runtime' AND (rolsuper OR rolbypassrls OR rolcreatedb OR rolcreaterole OR rolcanlogin OR rolreplication))
  THEN RAISE EXCEPTION 'Runtime role privilege drift'; END IF;
END
$postflight$;
COMMIT;
