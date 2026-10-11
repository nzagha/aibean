CREATE TABLE "resource_files" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"skill_id" text,
	"playbook_id" text,
	"resource_id" text,
	"object_key" text NOT NULL,
	"filename" text NOT NULL,
	"mime" text NOT NULL,
	"bytes" integer NOT NULL,
	"sha256" text NOT NULL,
	"scan_status" text NOT NULL,
	"status" text DEFAULT 'uploading' NOT NULL,
	"reviewer_id" text,
	"review_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "resource_files_object_key_unique" UNIQUE("object_key"),
	CONSTRAINT "file_one_parent" CHECK (num_nonnulls("resource_files"."skill_id","resource_files"."playbook_id","resource_files"."resource_id")=1),
	CONSTRAINT "file_status" CHECK ("resource_files"."status" IN ('uploading','pending','approved','rejected','disabled','failed')),
	CONSTRAINT "file_scan" CHECK ("resource_files"."scan_status"='clean'),
	CONSTRAINT "file_checksum" CHECK ("resource_files"."sha256" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "file_size" CHECK ("resource_files"."bytes">0 AND "resource_files"."bytes"<=5242880)
);
--> statement-breakpoint
ALTER TABLE "resource_files" ADD CONSTRAINT "resource_files_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_files" ADD CONSTRAINT "resource_files_skill_id_ai_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."ai_skills"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_files" ADD CONSTRAINT "resource_files_playbook_id_ai_playbooks_id_fk" FOREIGN KEY ("playbook_id") REFERENCES "public"."ai_playbooks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_files" ADD CONSTRAINT "resource_files_resource_id_creator_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."creator_resources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_files" ADD CONSTRAINT "resource_files_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "file_queue" ON "resource_files" USING btree ("status","created_at");