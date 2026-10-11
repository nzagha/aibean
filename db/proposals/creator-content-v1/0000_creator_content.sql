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