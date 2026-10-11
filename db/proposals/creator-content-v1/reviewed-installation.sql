-- PROPOSAL ONLY: never installed automatically or through baseline migrations.
BEGIN;
SET LOCAL search_path=public,pg_catalog;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
SELECT pg_advisory_xact_lock(hashtextextended('aibean-creator-content-v1',0));
DO $preflight$
BEGIN
  IF current_user<>'postgres' THEN RAISE EXCEPTION 'Unexpected operator'; END IF;
  IF current_database()<>'postgres' THEN RAISE EXCEPTION 'Unexpected database'; END IF;
  IF coalesce(current_setting('aibean.content_install_sha256',true),'') !~ '^[0-9a-f]{64}$' THEN RAISE EXCEPTION 'Reviewed checksum required'; END IF;
  IF to_regclass('aibean_private.admin_operations_installations') IS NULL THEN RAISE EXCEPTION 'Commercial prerequisite required'; END IF;
  IF NOT EXISTS(SELECT 1 FROM aibean_private.admin_operations_installations WHERE package_id='admin-operations-v2' AND sql_sha256='1d13ac175e967a2a9512f1ed1e0e2d6b5c34a3fa2c67692d9adcf70fef686d39') THEN RAISE EXCEPTION 'Commercial history differs'; END IF;
  IF (SELECT count(*) FROM drizzle.__drizzle_migrations)<>2 OR NOT EXISTS(SELECT 1 FROM drizzle.__drizzle_migrations WHERE hash='b58134b31944656eda45a6ba929fcdb66a5ec4e66e01a8cfd3d8d9b16d4f4468' AND created_at=1791247215670) OR NOT EXISTS(SELECT 1 FROM drizzle.__drizzle_migrations WHERE hash='168fd0b654a75e1174052fc444893a66362f89bb3d1cdaec3bbfe9fcbf4f4df1' AND created_at=1791249181547) THEN RAISE EXCEPTION 'Baseline history differs'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='aibean_runtime' AND NOT rolcanlogin AND NOT rolsuper AND NOT rolbypassrls AND NOT rolcreatedb AND NOT rolcreaterole AND NOT rolreplication) THEN RAISE EXCEPTION 'Unsafe runtime role'; END IF;
END $preflight$;
CREATE TABLE "account_notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"message" text NOT NULL,
	"read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "account_profiles" (
	"user_id" text PRIMARY KEY NOT NULL,
	"handle" text NOT NULL,
	"display_name" text NOT NULL,
	"bio" text NOT NULL,
	"website" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"reviewer_id" text,
	"review_reason" text,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "account_profiles_handle_unique" UNIQUE("handle"),
	CONSTRAINT "profile_status" CHECK ("account_profiles"."status" IN ('draft','pending','published','rejected','suspended'))
);
--> statement-breakpoint
CREATE TABLE "ai_playbooks" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"category_id" text NOT NULL,
	"use_case_ids" jsonb NOT NULL,
	"industry_ids" jsonb NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"reviewer_id" text,
	"review_reason" text,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"outcome" text NOT NULL,
	"audience" text NOT NULL,
	"difficulty" text NOT NULL,
	"minutes" integer NOT NULL,
	"steps" jsonb NOT NULL,
	"examples" text NOT NULL,
	"free_to_read" boolean DEFAULT true NOT NULL,
	CONSTRAINT "ai_playbooks_slug_unique" UNIQUE("slug"),
	CONSTRAINT "playbook_status" CHECK ("ai_playbooks"."status" IN ('draft','pending','published','rejected','archived')),
	CONSTRAINT "playbook_free" CHECK ("ai_playbooks"."free_to_read"=true),
	CONSTRAINT "playbook_difficulty" CHECK ("ai_playbooks"."difficulty" IN ('beginner','intermediate','advanced')),
	CONSTRAINT "playbook_minutes" CHECK ("ai_playbooks"."minutes">0)
);
--> statement-breakpoint
CREATE TABLE "ai_skills" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"category_id" text NOT NULL,
	"use_case_ids" jsonb NOT NULL,
	"industry_ids" jsonb NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"reviewer_id" text,
	"review_reason" text,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"outcome" text NOT NULL,
	"instructions" text NOT NULL,
	"prompts" text NOT NULL,
	"examples" text NOT NULL,
	CONSTRAINT "ai_skills_slug_unique" UNIQUE("slug"),
	CONSTRAINT "skill_status" CHECK ("ai_skills"."status" IN ('draft','pending','published','rejected','archived'))
);
--> statement-breakpoint
CREATE TABLE "creator_follows" (
	"user_id" text NOT NULL,
	"creator_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "creator_follows_user_id_creator_id_pk" PRIMARY KEY("user_id","creator_id"),
	CONSTRAINT "follow_not_self" CHECK ("creator_follows"."user_id"<>"creator_follows"."creator_id")
);
--> statement-breakpoint
CREATE TABLE "creator_resources" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"category_id" text NOT NULL,
	"use_case_ids" jsonb NOT NULL,
	"industry_ids" jsonb NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"reviewer_id" text,
	"review_reason" text,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"destination" text NOT NULL,
	"disclosure" text NOT NULL,
	"skill_id" text,
	"playbook_id" text,
	CONSTRAINT "creator_resources_slug_unique" UNIQUE("slug"),
	CONSTRAINT "resource_status" CHECK ("creator_resources"."status" IN ('draft','pending','published','rejected','archived'))
);
--> statement-breakpoint
CREATE TABLE "event_tools" (
	"event_id" text NOT NULL,
	"tool_id" text NOT NULL,
	CONSTRAINT "event_tools_event_id_tool_id_pk" PRIMARY KEY("event_id","tool_id")
);
--> statement-breakpoint
CREATE TABLE "playbook_skills" (
	"playbook_id" text NOT NULL,
	"skill_id" text NOT NULL,
	CONSTRAINT "playbook_skills_playbook_id_skill_id_pk" PRIMARY KEY("playbook_id","skill_id")
);
--> statement-breakpoint
CREATE TABLE "playbook_tools" (
	"playbook_id" text NOT NULL,
	"tool_id" text NOT NULL,
	CONSTRAINT "playbook_tools_playbook_id_tool_id_pk" PRIMARY KEY("playbook_id","tool_id")
);
--> statement-breakpoint
CREATE TABLE "public_events" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"category_id" text NOT NULL,
	"use_case_ids" jsonb NOT NULL,
	"industry_ids" jsonb NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"reviewer_id" text,
	"review_reason" text,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"description" text NOT NULL,
	"organizer" text NOT NULL,
	"event_type" text NOT NULL,
	"format" text NOT NULL,
	"venue" text NOT NULL,
	"city" text NOT NULL,
	"country" text NOT NULL,
	"virtual_url" text,
	"registration_url" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"timezone" text NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	CONSTRAINT "public_events_slug_unique" UNIQUE("slug"),
	CONSTRAINT "event_status" CHECK ("public_events"."status" IN ('draft','pending','published','rejected','archived','canceled')),
	CONSTRAINT "event_dates" CHECK ("public_events"."ends_at">"public_events"."starts_at"),
	CONSTRAINT "event_format" CHECK ("public_events"."format" IN ('in_person','virtual','hybrid'))
);
--> statement-breakpoint
CREATE TABLE "saved_entities" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"skill_id" text,
	"playbook_id" text,
	"event_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "saved_one_target" CHECK (num_nonnulls("saved_entities"."skill_id","saved_entities"."playbook_id","saved_entities"."event_id")=1)
);
--> statement-breakpoint
CREATE TABLE "skill_tools" (
	"skill_id" text NOT NULL,
	"tool_id" text NOT NULL,
	CONSTRAINT "skill_tools_skill_id_tool_id_pk" PRIMARY KEY("skill_id","tool_id")
);
--> statement-breakpoint
CREATE TABLE "stack_settings" (
	"stack_id" text PRIMARY KEY NOT NULL,
	"visibility" text DEFAULT 'private' NOT NULL,
	"ordered_tool_ids" jsonb NOT NULL,
	"note" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stack_visibility" CHECK ("stack_settings"."visibility" IN ('private','public'))
);
--> statement-breakpoint
ALTER TABLE "account_notifications" ADD CONSTRAINT "account_notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_profiles" ADD CONSTRAINT "account_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_profiles" ADD CONSTRAINT "account_profiles_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_playbooks" ADD CONSTRAINT "ai_playbooks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_playbooks" ADD CONSTRAINT "ai_playbooks_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_skills" ADD CONSTRAINT "ai_skills_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_skills" ADD CONSTRAINT "ai_skills_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_follows" ADD CONSTRAINT "creator_follows_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_follows" ADD CONSTRAINT "creator_follows_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_resources" ADD CONSTRAINT "creator_resources_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_resources" ADD CONSTRAINT "creator_resources_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_resources" ADD CONSTRAINT "creator_resources_skill_id_ai_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."ai_skills"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_resources" ADD CONSTRAINT "creator_resources_playbook_id_ai_playbooks_id_fk" FOREIGN KEY ("playbook_id") REFERENCES "public"."ai_playbooks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_tools" ADD CONSTRAINT "event_tools_event_id_public_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."public_events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_tools" ADD CONSTRAINT "event_tools_tool_id_tools_id_fk" FOREIGN KEY ("tool_id") REFERENCES "public"."tools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playbook_skills" ADD CONSTRAINT "playbook_skills_playbook_id_ai_playbooks_id_fk" FOREIGN KEY ("playbook_id") REFERENCES "public"."ai_playbooks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playbook_skills" ADD CONSTRAINT "playbook_skills_skill_id_ai_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."ai_skills"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playbook_tools" ADD CONSTRAINT "playbook_tools_playbook_id_ai_playbooks_id_fk" FOREIGN KEY ("playbook_id") REFERENCES "public"."ai_playbooks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playbook_tools" ADD CONSTRAINT "playbook_tools_tool_id_tools_id_fk" FOREIGN KEY ("tool_id") REFERENCES "public"."tools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public_events" ADD CONSTRAINT "public_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public_events" ADD CONSTRAINT "public_events_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_entities" ADD CONSTRAINT "saved_entities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_entities" ADD CONSTRAINT "saved_entities_skill_id_ai_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."ai_skills"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_entities" ADD CONSTRAINT "saved_entities_playbook_id_ai_playbooks_id_fk" FOREIGN KEY ("playbook_id") REFERENCES "public"."ai_playbooks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_entities" ADD CONSTRAINT "saved_entities_event_id_public_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."public_events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_tools" ADD CONSTRAINT "skill_tools_skill_id_ai_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."ai_skills"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_tools" ADD CONSTRAINT "skill_tools_tool_id_tools_id_fk" FOREIGN KEY ("tool_id") REFERENCES "public"."tools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stack_settings" ADD CONSTRAINT "stack_settings_stack_id_stacks_id_fk" FOREIGN KEY ("stack_id") REFERENCES "public"."stacks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notification_owner" ON "account_notifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "playbook_queue" ON "ai_playbooks" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "skill_queue" ON "ai_skills" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "resource_queue" ON "creator_resources" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "event_queue" ON "public_events" USING btree ("status","starts_at");--> statement-breakpoint
CREATE INDEX "saved_entities_owner" ON "saved_entities" USING btree ("user_id","created_at");
ALTER TABLE "ai_playbooks" ADD CONSTRAINT "ai_playbooks_category_id_taxonomy_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."taxonomy"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_skills" ADD CONSTRAINT "ai_skills_category_id_taxonomy_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."taxonomy"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_resources" ADD CONSTRAINT "creator_resources_category_id_taxonomy_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."taxonomy"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public_events" ADD CONSTRAINT "public_events_category_id_taxonomy_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."taxonomy"("id") ON DELETE no action ON UPDATE no action;
CREATE TABLE "content_reports" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"review_id" text,
	"skill_id" text,
	"playbook_id" text,
	"resource_id" text,
	"event_id" text,
	"reason" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"reviewer_id" text,
	"review_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "report_one_target" CHECK (num_nonnulls("content_reports"."review_id","content_reports"."skill_id","content_reports"."playbook_id","content_reports"."resource_id","content_reports"."event_id")=1),
	CONSTRAINT "report_status" CHECK ("content_reports"."status" IN ('open','dismissed','actioned'))
);
--> statement-breakpoint
CREATE TABLE "engagement_counters" (
	"kind" text NOT NULL,
	"entity_id" text NOT NULL,
	"day" date NOT NULL,
	"source" text NOT NULL,
	"requests" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "engagement_counters_kind_entity_id_day_source_pk" PRIMARY KEY("kind","entity_id","day","source"),
	CONSTRAINT "counter_kind" CHECK ("engagement_counters"."kind" IN ('tools','resources','events')),
	CONSTRAINT "counter_source" CHECK ("engagement_counters"."source" IN ('internal','direct','external')),
	CONSTRAINT "counter_positive" CHECK ("engagement_counters"."requests">0)
);
--> statement-breakpoint
ALTER TABLE "content_reports" ADD CONSTRAINT "content_reports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_reports" ADD CONSTRAINT "content_reports_review_id_tool_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."tool_reviews"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_reports" ADD CONSTRAINT "content_reports_skill_id_ai_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."ai_skills"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_reports" ADD CONSTRAINT "content_reports_playbook_id_ai_playbooks_id_fk" FOREIGN KEY ("playbook_id") REFERENCES "public"."ai_playbooks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_reports" ADD CONSTRAINT "content_reports_resource_id_creator_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."creator_resources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_reports" ADD CONSTRAINT "content_reports_event_id_public_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."public_events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_reports" ADD CONSTRAINT "content_reports_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "report_queue" ON "content_reports" USING btree ("status","created_at");
ALTER TABLE public.account_notifications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.account_notifications FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT,INSERT,UPDATE ON public.account_notifications TO aibean_runtime;
CREATE POLICY runtime_service ON public.account_notifications TO aibean_runtime USING(true) WITH CHECK(true);
ALTER TABLE public.account_profiles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.account_profiles FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT,INSERT,UPDATE ON public.account_profiles TO aibean_runtime;
CREATE POLICY runtime_service ON public.account_profiles TO aibean_runtime USING(true) WITH CHECK(true);
ALTER TABLE public.ai_playbooks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ai_playbooks FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT,INSERT,UPDATE ON public.ai_playbooks TO aibean_runtime;
CREATE POLICY runtime_service ON public.ai_playbooks TO aibean_runtime USING(true) WITH CHECK(true);
ALTER TABLE public.ai_skills ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ai_skills FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT,INSERT,UPDATE ON public.ai_skills TO aibean_runtime;
CREATE POLICY runtime_service ON public.ai_skills TO aibean_runtime USING(true) WITH CHECK(true);
ALTER TABLE public.creator_follows ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.creator_follows FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT,INSERT,UPDATE ON public.creator_follows TO aibean_runtime;
CREATE POLICY runtime_service ON public.creator_follows TO aibean_runtime USING(true) WITH CHECK(true);
ALTER TABLE public.creator_resources ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.creator_resources FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT,INSERT,UPDATE ON public.creator_resources TO aibean_runtime;
CREATE POLICY runtime_service ON public.creator_resources TO aibean_runtime USING(true) WITH CHECK(true);
ALTER TABLE public.event_tools ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.event_tools FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT,INSERT,UPDATE ON public.event_tools TO aibean_runtime;
CREATE POLICY runtime_service ON public.event_tools TO aibean_runtime USING(true) WITH CHECK(true);
ALTER TABLE public.playbook_skills ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.playbook_skills FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT,INSERT,UPDATE ON public.playbook_skills TO aibean_runtime;
CREATE POLICY runtime_service ON public.playbook_skills TO aibean_runtime USING(true) WITH CHECK(true);
ALTER TABLE public.playbook_tools ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.playbook_tools FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT,INSERT,UPDATE ON public.playbook_tools TO aibean_runtime;
CREATE POLICY runtime_service ON public.playbook_tools TO aibean_runtime USING(true) WITH CHECK(true);
ALTER TABLE public.public_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.public_events FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT,INSERT,UPDATE ON public.public_events TO aibean_runtime;
CREATE POLICY runtime_service ON public.public_events TO aibean_runtime USING(true) WITH CHECK(true);
ALTER TABLE public.saved_entities ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.saved_entities FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT,INSERT,UPDATE ON public.saved_entities TO aibean_runtime;
CREATE POLICY runtime_service ON public.saved_entities TO aibean_runtime USING(true) WITH CHECK(true);
ALTER TABLE public.skill_tools ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.skill_tools FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT,INSERT,UPDATE ON public.skill_tools TO aibean_runtime;
CREATE POLICY runtime_service ON public.skill_tools TO aibean_runtime USING(true) WITH CHECK(true);
ALTER TABLE public.stack_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.stack_settings FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT,INSERT,UPDATE ON public.stack_settings TO aibean_runtime;
CREATE POLICY runtime_service ON public.stack_settings TO aibean_runtime USING(true) WITH CHECK(true);
GRANT DELETE ON public.event_tools,public.playbook_skills,public.playbook_tools,public.skill_tools,public.saved_entities,public.creator_follows TO aibean_runtime;
ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.content_reports FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT,INSERT,UPDATE ON public.content_reports TO aibean_runtime;
CREATE POLICY runtime_service ON public.content_reports TO aibean_runtime USING(true) WITH CHECK(true);
ALTER TABLE public.engagement_counters ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.engagement_counters FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT,INSERT,UPDATE ON public.engagement_counters TO aibean_runtime;
CREATE POLICY runtime_service ON public.engagement_counters TO aibean_runtime USING(true) WITH CHECK(true);
CREATE TABLE aibean_private.content_installations(package_id text PRIMARY KEY,sql_sha256 text NOT NULL CHECK(sql_sha256 ~ '^[0-9a-f]{64}$'),installed_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE aibean_private.content_installations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON aibean_private.content_installations FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON aibean_private.content_installations TO aibean_runtime;
CREATE POLICY runtime_read_content_ledger ON aibean_private.content_installations FOR SELECT TO aibean_runtime USING(true);
INSERT INTO aibean_private.content_installations(package_id,sql_sha256) VALUES('creator-content-v1',current_setting('aibean.content_install_sha256'));
COMMIT;
