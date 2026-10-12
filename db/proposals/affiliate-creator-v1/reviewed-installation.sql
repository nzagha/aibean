-- SEPARATE PROPOSAL: exact owner approval, trusted TLS/target/operator and expanded recovery preflight required.
BEGIN; SET LOCAL search_path=pg_catalog,public; SET LOCAL lock_timeout='5s'; SET LOCAL statement_timeout='60s';
SELECT pg_advisory_xact_lock(hashtextextended('aibean-affiliate-creator-v1',0));
DO $preflight$ BEGIN
 IF current_database()<>'postgres' OR current_user<>'postgres' THEN RAISE EXCEPTION 'Unexpected database/operator'; END IF;
 IF coalesce(current_setting('aibean.affiliate_creator_install_sha256',true),'') !~ '^[0-9a-f]{64}$' THEN RAISE EXCEPTION 'Reviewed checksum required'; END IF;
 IF to_regclass('aibean_private.admin_review_installations') IS NULL THEN RAISE EXCEPTION 'Missing prerequisite'; END IF; IF NOT EXISTS(SELECT 1 FROM aibean_private.admin_review_installations WHERE package_id='admin-review-v1' AND sql_sha256='5f016dce942a7570cc8770549a4b021b456fdbb74d3bdf0512d98e418ff0faca') THEN RAISE EXCEPTION 'Dependency history differs'; END IF;
IF to_regclass('aibean_private.admin_operations_installations') IS NULL THEN RAISE EXCEPTION 'Missing prerequisite'; END IF; IF NOT EXISTS(SELECT 1 FROM aibean_private.admin_operations_installations WHERE package_id='admin-operations-v2' AND sql_sha256='1d13ac175e967a2a9512f1ed1e0e2d6b5c34a3fa2c67692d9adcf70fef686d39') THEN RAISE EXCEPTION 'Dependency history differs'; END IF;
IF to_regclass('aibean_private.content_installations') IS NULL THEN RAISE EXCEPTION 'Missing prerequisite'; END IF; IF NOT EXISTS(SELECT 1 FROM aibean_private.content_installations WHERE package_id='creator-content-v1' AND sql_sha256='ecdac0e6d3448456d16b71a274d29a62050264ba9d406d4077081c998541f78d') THEN RAISE EXCEPTION 'Dependency history differs'; END IF;
IF to_regclass('aibean_private.files_installations') IS NULL THEN RAISE EXCEPTION 'Missing prerequisite'; END IF; IF NOT EXISTS(SELECT 1 FROM aibean_private.files_installations WHERE package_id='creator-files-v1' AND sql_sha256='88b5cc102a30097f7579f7dcd1da482e691522353439b5f688abcce2ad50b66b') THEN RAISE EXCEPTION 'Dependency history differs'; END IF;
IF to_regclass('aibean_private.discovery_installations') IS NULL THEN RAISE EXCEPTION 'Missing prerequisite'; END IF; IF NOT EXISTS(SELECT 1 FROM aibean_private.discovery_installations WHERE package_id='discovery-v1' AND sql_sha256='c29a3436daa54eee9f9ec1e9eb0e633da6d7cc14cb42fd9b05784db5a96de0b3') THEN RAISE EXCEPTION 'Dependency history differs'; END IF;
IF to_regclass('aibean_private.pricing_installations') IS NULL THEN RAISE EXCEPTION 'Missing prerequisite'; END IF; IF NOT EXISTS(SELECT 1 FROM aibean_private.pricing_installations WHERE package_id='pricing-v1' AND sql_sha256='80ad136519030266bbf03d7b6edab9a541d3548874f9c5f89a9b2a416821fcab') THEN RAISE EXCEPTION 'Dependency history differs'; END IF;
 IF (SELECT count(*) FROM drizzle.__drizzle_migrations)<>2 OR NOT EXISTS(SELECT 1 FROM drizzle.__drizzle_migrations WHERE hash='b58134b31944656eda45a6ba929fcdb66a5ec4e66e01a8cfd3d8d9b16d4f4468' AND created_at=1791247215670) OR NOT EXISTS(SELECT 1 FROM drizzle.__drizzle_migrations WHERE hash='168fd0b654a75e1174052fc444893a66362f89bb3d1cdaec3bbfe9fcbf4f4df1' AND created_at=1791249181547) THEN RAISE EXCEPTION 'Baseline history differs'; END IF;
 IF EXISTS(SELECT 1 FROM pg_class WHERE relnamespace='public'::regnamespace AND relname IN ('affiliate_programs','affiliate_destinations','affiliate_relationships','affiliate_clicks','affiliate_reconciliations','creator_presentations','campaign_blocks','creator_revision_history')) OR to_regclass('aibean_private.affiliate_creator_installations') IS NOT NULL THEN RAISE EXCEPTION 'Unexpected pricing objects'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='aibean_runtime' AND NOT rolcanlogin AND NOT rolsuper AND NOT rolbypassrls AND NOT rolcreatedb AND NOT rolcreaterole AND NOT rolreplication) THEN RAISE EXCEPTION 'Unsafe runtime'; END IF;
END $preflight$;
CREATE TABLE public.affiliate_programs (
 id text PRIMARY KEY, partner text NOT NULL, name text NOT NULL, hosts jsonb NOT NULL,
 proposed_rate_bps integer NOT NULL CHECK(proposed_rate_bps BETWEEN 0 AND 10000),
 status text NOT NULL DEFAULT 'disabled' CHECK(status IN ('disabled','enabled')),
 starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL CHECK(ends_at>starts_at),
 config_sha256 text NOT NULL CHECK(config_sha256 ~ '^[a-f0-9]{64}$'), revision integer NOT NULL DEFAULT 1 CHECK(revision>0),
 updated_by text NOT NULL REFERENCES public.users(id), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.affiliate_destinations (
 id text PRIMARY KEY, program_id text NOT NULL REFERENCES public.affiliate_programs(id),
 label text NOT NULL, url text NOT NULL, parameters jsonb NOT NULL, disclosure text NOT NULL,
 enabled boolean NOT NULL DEFAULT false, revision integer NOT NULL DEFAULT 1 CHECK(revision>0),
 updated_by text NOT NULL REFERENCES public.users(id), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX affiliate_destination_program ON public.affiliate_destinations(program_id);
CREATE TABLE public.affiliate_relationships (
 id text PRIMARY KEY, destination_id text NOT NULL REFERENCES public.affiliate_destinations(id),
 tool_id text NOT NULL REFERENCES public.tools(id), campaign_id text REFERENCES public.creator_resources(id),
 creator_share_bps integer NOT NULL DEFAULT 0 CHECK(creator_share_bps BETWEEN 0 AND 10000),
 enabled boolean NOT NULL DEFAULT false, revision integer NOT NULL DEFAULT 1 CHECK(revision>0),
 updated_by text NOT NULL REFERENCES public.users(id), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX affiliate_one_context ON public.affiliate_relationships(tool_id,coalesce(campaign_id,''));
CREATE INDEX affiliate_relationship_destination ON public.affiliate_relationships(destination_id);
CREATE INDEX affiliate_relationship_campaign ON public.affiliate_relationships(campaign_id) WHERE campaign_id IS NOT NULL;
CREATE TABLE public.affiliate_clicks (
 id text PRIMARY KEY, relationship_id text NOT NULL REFERENCES public.affiliate_relationships(id),
 tool_id text NOT NULL REFERENCES public.tools(id), campaign_id text REFERENCES public.creator_resources(id),
 dedup_key text NOT NULL UNIQUE CHECK(dedup_key ~ '^[a-f0-9]{64}$'), source text NOT NULL,
 disclosure text NOT NULL, program_sha256 text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX affiliate_click_reporting ON public.affiliate_clicks(relationship_id,created_at);
CREATE INDEX affiliate_click_tool ON public.affiliate_clicks(tool_id,created_at);
CREATE INDEX affiliate_click_campaign ON public.affiliate_clicks(campaign_id,created_at) WHERE campaign_id IS NOT NULL;
CREATE TABLE public.affiliate_reconciliations (
 id text PRIMARY KEY, program_id text NOT NULL REFERENCES public.affiliate_programs(id),
 provider_event_id text NOT NULL, click_id text NOT NULL REFERENCES public.affiliate_clicks(id),
 status text NOT NULL CHECK(status IN ('confirmed','reversed')), conversion_count integer NOT NULL CHECK(conversion_count BETWEEN 0 AND 1),
 commission_cents integer NOT NULL CHECK(commission_cents BETWEEN 0 AND 100000000), currency text NOT NULL CHECK(currency='usd'),
 evidence_sha256 text NOT NULL CHECK(evidence_sha256 ~ '^[a-f0-9]{64}$'),
 updated_by text NOT NULL REFERENCES public.users(id), created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(program_id,provider_event_id)
);
CREATE INDEX affiliate_reconciliation_click ON public.affiliate_reconciliations(click_id);
CREATE TABLE public.creator_presentations (
 user_id text PRIMARY KEY REFERENCES public.account_profiles(user_id), headline text NOT NULL, biography jsonb NOT NULL, socials jsonb NOT NULL,
 avatar_file_id text REFERENCES public.resource_files(id), avatar_alt text NOT NULL,
 cover_file_id text REFERENCES public.resource_files(id), cover_alt text NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.campaign_blocks (
 id text PRIMARY KEY, campaign_id text NOT NULL REFERENCES public.creator_resources(id), position integer NOT NULL CHECK(position BETWEEN 0 AND 39),
 kind text NOT NULL CHECK(kind IN ('tools','skills','playbooks','stacks','events','resources','media','text')),
 title text NOT NULL, description text NOT NULL,
 tool_id text REFERENCES public.tools(id), skill_id text REFERENCES public.ai_skills(id), playbook_id text REFERENCES public.ai_playbooks(id),
 stack_id text REFERENCES public.stacks(id), event_id text REFERENCES public.public_events(id), resource_id text REFERENCES public.creator_resources(id), file_id text REFERENCES public.resource_files(id),
 CHECK(CASE kind WHEN 'text' THEN num_nonnulls(tool_id,skill_id,playbook_id,stack_id,event_id,resource_id,file_id)=0 ELSE num_nonnulls(tool_id,skill_id,playbook_id,stack_id,event_id,resource_id,file_id)=1 END),
 CHECK((kind='tools')=(tool_id IS NOT NULL) AND (kind='skills')=(skill_id IS NOT NULL) AND (kind='playbooks')=(playbook_id IS NOT NULL) AND (kind='stacks')=(stack_id IS NOT NULL) AND (kind='events')=(event_id IS NOT NULL) AND (kind='resources')=(resource_id IS NOT NULL) AND (kind='media')=(file_id IS NOT NULL)),
 CHECK(resource_id IS NULL OR resource_id<>campaign_id), UNIQUE(campaign_id,position)
);
CREATE TABLE public.creator_revision_history (
 id text PRIMARY KEY, kind text NOT NULL CHECK(kind IN ('profile','campaign','affiliate')), entity_id text NOT NULL,
 revision text NOT NULL, snapshot jsonb NOT NULL, actor_id text NOT NULL REFERENCES public.users(id), created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(kind,entity_id,revision)
);
CREATE INDEX creator_revision_entity ON public.creator_revision_history(kind,entity_id,created_at);

ALTER TABLE public.affiliate_programs ENABLE ROW LEVEL SECURITY; REVOKE ALL ON public.affiliate_programs FROM PUBLIC,anon,authenticated,service_role; GRANT SELECT,INSERT,UPDATE ON public.affiliate_programs TO aibean_runtime; CREATE POLICY runtime_service ON public.affiliate_programs TO aibean_runtime USING(true) WITH CHECK(true);
ALTER TABLE public.affiliate_destinations ENABLE ROW LEVEL SECURITY; REVOKE ALL ON public.affiliate_destinations FROM PUBLIC,anon,authenticated,service_role; GRANT SELECT,INSERT,UPDATE ON public.affiliate_destinations TO aibean_runtime; CREATE POLICY runtime_service ON public.affiliate_destinations TO aibean_runtime USING(true) WITH CHECK(true);
ALTER TABLE public.affiliate_relationships ENABLE ROW LEVEL SECURITY; REVOKE ALL ON public.affiliate_relationships FROM PUBLIC,anon,authenticated,service_role; GRANT SELECT,INSERT,UPDATE ON public.affiliate_relationships TO aibean_runtime; CREATE POLICY runtime_service ON public.affiliate_relationships TO aibean_runtime USING(true) WITH CHECK(true);
ALTER TABLE public.affiliate_clicks ENABLE ROW LEVEL SECURITY; REVOKE ALL ON public.affiliate_clicks FROM PUBLIC,anon,authenticated,service_role; GRANT SELECT,INSERT ON public.affiliate_clicks TO aibean_runtime; CREATE POLICY runtime_service ON public.affiliate_clicks TO aibean_runtime USING(true) WITH CHECK(true);
ALTER TABLE public.affiliate_reconciliations ENABLE ROW LEVEL SECURITY; REVOKE ALL ON public.affiliate_reconciliations FROM PUBLIC,anon,authenticated,service_role; GRANT SELECT,INSERT ON public.affiliate_reconciliations TO aibean_runtime; CREATE POLICY runtime_service ON public.affiliate_reconciliations TO aibean_runtime USING(true) WITH CHECK(true);
ALTER TABLE public.creator_presentations ENABLE ROW LEVEL SECURITY; REVOKE ALL ON public.creator_presentations FROM PUBLIC,anon,authenticated,service_role; GRANT SELECT,INSERT,UPDATE ON public.creator_presentations TO aibean_runtime; CREATE POLICY runtime_service ON public.creator_presentations TO aibean_runtime USING(true) WITH CHECK(true);
ALTER TABLE public.campaign_blocks ENABLE ROW LEVEL SECURITY; REVOKE ALL ON public.campaign_blocks FROM PUBLIC,anon,authenticated,service_role; GRANT SELECT,INSERT,UPDATE ON public.campaign_blocks TO aibean_runtime; CREATE POLICY runtime_service ON public.campaign_blocks TO aibean_runtime USING(true) WITH CHECK(true);
ALTER TABLE public.creator_revision_history ENABLE ROW LEVEL SECURITY; REVOKE ALL ON public.creator_revision_history FROM PUBLIC,anon,authenticated,service_role; GRANT SELECT,INSERT ON public.creator_revision_history TO aibean_runtime; CREATE POLICY runtime_service ON public.creator_revision_history TO aibean_runtime USING(true) WITH CHECK(true);
GRANT DELETE ON public.campaign_blocks TO aibean_runtime;
CREATE TABLE aibean_private.affiliate_creator_installations(package_id text PRIMARY KEY,sql_sha256 text NOT NULL CHECK(sql_sha256 ~ '^[a-f0-9]{64}$'),installed_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE aibean_private.affiliate_creator_installations ENABLE ROW LEVEL SECURITY; REVOKE ALL ON aibean_private.affiliate_creator_installations FROM PUBLIC,anon,authenticated,service_role; GRANT SELECT ON aibean_private.affiliate_creator_installations TO aibean_runtime;
CREATE POLICY runtime_read_affiliate_creator_history ON aibean_private.affiliate_creator_installations FOR SELECT TO aibean_runtime USING(true);
INSERT INTO aibean_private.affiliate_creator_installations VALUES('affiliate-creator-v1',current_setting('aibean.affiliate_creator_install_sha256'),now());
COMMIT;
