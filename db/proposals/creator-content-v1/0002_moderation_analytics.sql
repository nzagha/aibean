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