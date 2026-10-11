-- PROPOSAL ONLY. Separate approval required; never run through baseline migrations.
BEGIN;
SET LOCAL search_path=public,pg_catalog;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
SELECT pg_advisory_xact_lock(hashtextextended('aibean-creator-files-v1',0));
DO $preflight$
BEGIN
 IF current_database()<>'postgres' OR current_user<>'postgres' THEN RAISE EXCEPTION 'Unexpected target/operator'; END IF;
 IF coalesce(current_setting('aibean.files_install_sha256',true),'') !~ '^[0-9a-f]{64}$' THEN RAISE EXCEPTION 'Reviewed checksum required'; END IF;
 IF to_regclass('aibean_private.content_installations') IS NULL THEN RAISE EXCEPTION 'Content prerequisite required'; END IF;
 IF NOT EXISTS(SELECT 1 FROM aibean_private.content_installations WHERE package_id='creator-content-v1' AND sql_sha256='ecdac0e6d3448456d16b71a274d29a62050264ba9d406d4077081c998541f78d') THEN RAISE EXCEPTION 'Content history differs'; END IF;
 IF (SELECT count(*) FROM drizzle.__drizzle_migrations)<>2 OR NOT EXISTS(SELECT 1 FROM drizzle.__drizzle_migrations WHERE hash='b58134b31944656eda45a6ba929fcdb66a5ec4e66e01a8cfd3d8d9b16d4f4468' AND created_at=1791247215670) OR NOT EXISTS(SELECT 1 FROM drizzle.__drizzle_migrations WHERE hash='168fd0b654a75e1174052fc444893a66362f89bb3d1cdaec3bbfe9fcbf4f4df1' AND created_at=1791249181547) THEN RAISE EXCEPTION 'Baseline history differs'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='aibean_runtime' AND NOT rolcanlogin AND NOT rolsuper AND NOT rolbypassrls AND NOT rolcreatedb AND NOT rolcreaterole AND NOT rolreplication) THEN RAISE EXCEPTION 'Unsafe runtime role'; END IF;
END $preflight$;
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
ALTER TABLE public.resource_files ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.resource_files FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT,INSERT,UPDATE ON public.resource_files TO aibean_runtime;
CREATE POLICY runtime_service ON public.resource_files TO aibean_runtime USING(true) WITH CHECK(true);
CREATE TABLE aibean_private.files_installations(package_id text PRIMARY KEY,sql_sha256 text NOT NULL CHECK(sql_sha256 ~ '^[0-9a-f]{64}$'),installed_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE aibean_private.files_installations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON aibean_private.files_installations FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON aibean_private.files_installations TO aibean_runtime;
CREATE POLICY runtime_read_files_ledger ON aibean_private.files_installations FOR SELECT TO aibean_runtime USING(true);
INSERT INTO aibean_private.files_installations(package_id,sql_sha256) VALUES('creator-files-v1',current_setting('aibean.files_install_sha256'));
COMMIT;
