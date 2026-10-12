-- PROPOSAL ONLY: separate exact owner approval and verified TLS/operator preflight required.
BEGIN;
SET LOCAL search_path=public,pg_catalog;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
SELECT pg_advisory_xact_lock(hashtextextended('aibean-discovery-v1',0));
DO $preflight$
BEGIN
 IF current_database()<>'postgres' OR current_user<>'postgres' THEN RAISE EXCEPTION 'Unexpected target/operator'; END IF;
 IF coalesce(current_setting('aibean.discovery_install_sha256',true),'') !~ '^[0-9a-f]{64}$' THEN RAISE EXCEPTION 'Reviewed checksum required'; END IF;
 IF to_regclass('aibean_private.admin_review_installations') IS NULL THEN RAISE EXCEPTION 'Missing prerequisite admin-review-v1'; END IF;
 IF NOT EXISTS(SELECT 1 FROM aibean_private.admin_review_installations WHERE package_id='admin-review-v1' AND sql_sha256='5f016dce942a7570cc8770549a4b021b456fdbb74d3bdf0512d98e418ff0faca') THEN RAISE EXCEPTION 'History mismatch admin-review-v1'; END IF;
 IF to_regclass('aibean_private.admin_operations_installations') IS NULL THEN RAISE EXCEPTION 'Missing prerequisite admin-operations-v2'; END IF;
 IF NOT EXISTS(SELECT 1 FROM aibean_private.admin_operations_installations WHERE package_id='admin-operations-v2' AND sql_sha256='1d13ac175e967a2a9512f1ed1e0e2d6b5c34a3fa2c67692d9adcf70fef686d39') THEN RAISE EXCEPTION 'History mismatch admin-operations-v2'; END IF;
 IF to_regclass('aibean_private.content_installations') IS NULL THEN RAISE EXCEPTION 'Missing prerequisite creator-content-v1'; END IF;
 IF NOT EXISTS(SELECT 1 FROM aibean_private.content_installations WHERE package_id='creator-content-v1' AND sql_sha256='ecdac0e6d3448456d16b71a274d29a62050264ba9d406d4077081c998541f78d') THEN RAISE EXCEPTION 'History mismatch creator-content-v1'; END IF;
 IF to_regclass('aibean_private.files_installations') IS NULL THEN RAISE EXCEPTION 'Missing prerequisite creator-files-v1'; END IF;
 IF NOT EXISTS(SELECT 1 FROM aibean_private.files_installations WHERE package_id='creator-files-v1' AND sql_sha256='88b5cc102a30097f7579f7dcd1da482e691522353439b5f688abcce2ad50b66b') THEN RAISE EXCEPTION 'History mismatch creator-files-v1'; END IF;
 IF (SELECT count(*) FROM drizzle.__drizzle_migrations)<>2 OR NOT EXISTS(SELECT 1 FROM drizzle.__drizzle_migrations WHERE hash='b58134b31944656eda45a6ba929fcdb66a5ec4e66e01a8cfd3d8d9b16d4f4468' AND created_at=1791247215670) OR NOT EXISTS(SELECT 1 FROM drizzle.__drizzle_migrations WHERE hash='168fd0b654a75e1174052fc444893a66362f89bb3d1cdaec3bbfe9fcbf4f4df1' AND created_at=1791249181547) THEN RAISE EXCEPTION 'Baseline history differs'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='aibean_runtime' AND NOT rolcanlogin AND NOT rolsuper AND NOT rolbypassrls AND NOT rolcreatedb AND NOT rolcreaterole AND NOT rolreplication) THEN RAISE EXCEPTION 'Unsafe runtime role'; END IF;
 IF EXISTS(SELECT 1 FROM pg_class WHERE relnamespace='public'::regnamespace AND relname IN ('saved_comparisons','comparison_tools','account_follows','analytics_events')) OR to_regclass('aibean_private.discovery_installations') IS NOT NULL THEN RAISE EXCEPTION 'Unexpected discovery objects'; END IF;
END $preflight$;
CREATE TABLE public.saved_comparisons (
 id text PRIMARY KEY, user_id text NOT NULL REFERENCES public.users(id),
 name text NOT NULL CHECK(length(name) BETWEEN 2 AND 80),
 context jsonb NOT NULL DEFAULT '{}' CHECK(jsonb_typeof(context)='object'),
 revision integer NOT NULL DEFAULT 1 CHECK(revision>0),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX comparison_owner ON public.saved_comparisons(user_id,created_at DESC,id);
CREATE TABLE public.comparison_tools (
 comparison_id text NOT NULL REFERENCES public.saved_comparisons(id) ON DELETE CASCADE,
 tool_id text NOT NULL REFERENCES public.tools(id),
 position integer NOT NULL CHECK(position BETWEEN 0 AND 3),
 PRIMARY KEY(comparison_id,tool_id), UNIQUE(comparison_id,position)
);
CREATE FUNCTION aibean_private.check_comparison_size() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE selected text; affected text[]; size integer;
BEGIN
 IF TG_TABLE_NAME='saved_comparisons' THEN affected=ARRAY[NEW.id];
 ELSE affected=ARRAY[CASE WHEN TG_OP<>'DELETE' THEN NEW.comparison_id END,CASE WHEN TG_OP<>'INSERT' THEN OLD.comparison_id END]; END IF;
 FOR selected IN SELECT DISTINCT id FROM unnest(affected) AS ids(id) WHERE id IS NOT NULL ORDER BY id LOOP
  -- Serialize final size checks; a moved member must also validate its old parent.
  PERFORM 1 FROM public.saved_comparisons WHERE id=selected FOR NO KEY UPDATE;
  IF FOUND THEN
   SELECT count(*) INTO size FROM public.comparison_tools WHERE comparison_id=selected;
   IF size<2 OR size>4 THEN RAISE EXCEPTION 'Comparison requires 2-4 Tools' USING ERRCODE='23514'; END IF;
  END IF;
 END LOOP;
 RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION aibean_private.check_comparison_size() FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION aibean_private.check_comparison_size() TO aibean_runtime;
CREATE CONSTRAINT TRIGGER comparison_header_size AFTER INSERT OR UPDATE ON public.saved_comparisons DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION aibean_private.check_comparison_size();
CREATE CONSTRAINT TRIGGER comparison_member_size AFTER INSERT OR UPDATE OR DELETE ON public.comparison_tools DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION aibean_private.check_comparison_size();
CREATE TABLE public.account_follows (
 user_id text NOT NULL REFERENCES public.users(id), kind text NOT NULL,
 target_id text NOT NULL,
 tool_id text REFERENCES public.tools(id), skill_id text REFERENCES public.ai_skills(id),
 playbook_id text REFERENCES public.ai_playbooks(id), creator_id text REFERENCES public.users(id),
 event_id text REFERENCES public.public_events(id), industry_id text REFERENCES public.taxonomy(id),
 created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(user_id,kind,target_id),
 CHECK(num_nonnulls(tool_id,skill_id,playbook_id,creator_id,event_id,industry_id)=1),
 CHECK(kind<>'creators' OR user_id<>creator_id),
 CHECK(CASE kind WHEN 'tools' THEN target_id=tool_id WHEN 'skills' THEN target_id=skill_id WHEN 'playbooks' THEN target_id=playbook_id WHEN 'creators' THEN target_id=creator_id WHEN 'events' THEN target_id=event_id WHEN 'industries' THEN target_id=industry_id ELSE false END IS TRUE)
);
CREATE INDEX follow_target ON public.account_follows(kind,target_id,user_id);
CREATE INDEX follow_owner ON public.account_follows(user_id,created_at DESC,kind,target_id);
-- Preserve existing Creator subscriptions without deleting legacy history.
INSERT INTO public.account_follows(user_id,kind,target_id,creator_id,created_at)
 SELECT user_id,'creators',creator_id,creator_id,created_at FROM public.creator_follows;
CREATE TABLE public.analytics_events (
 id text PRIMARY KEY, event text NOT NULL CHECK(event IN ('search','discovery_view','tool_view','save','comparison_add','comparison_complete','stack_add','skill_view','playbook_view','resource_view','creator_view','event_view','resource_download','event_outbound','tool_outbound','resource_outbound')),
 kind text NOT NULL CHECK(kind IN ('tools','skills','playbooks','resources','creators','events','discovery')),
 target_id text NOT NULL CHECK(length(target_id) BETWEEN 1 AND 100),
 session_hash text NOT NULL CHECK(session_hash ~ '^[0-9a-f]{64}$'),
 dedup_key text NOT NULL UNIQUE CHECK(dedup_key ~ '^[0-9a-f]{64}$'),
 source text NOT NULL CHECK(source IN ('direct','directory','comparison','stack','creator','resource','event','featured')),
 campaign_id text REFERENCES public.creator_resources(id),
 metadata jsonb NOT NULL DEFAULT '{}' CHECK(jsonb_typeof(metadata)='object'),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX analytics_retention ON public.analytics_events(created_at);
CREATE INDEX analytics_target ON public.analytics_events(kind,target_id,created_at DESC,event);
CREATE INDEX analytics_campaign ON public.analytics_events(campaign_id,created_at DESC) WHERE campaign_id IS NOT NULL;

ALTER TABLE public.saved_comparisons ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.saved_comparisons FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.saved_comparisons TO aibean_runtime;
CREATE POLICY runtime_service ON public.saved_comparisons TO aibean_runtime USING(true) WITH CHECK(true);
ALTER TABLE public.comparison_tools ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.comparison_tools FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.comparison_tools TO aibean_runtime;
CREATE POLICY runtime_service ON public.comparison_tools TO aibean_runtime USING(true) WITH CHECK(true);
ALTER TABLE public.account_follows ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.account_follows FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.account_follows TO aibean_runtime;
CREATE POLICY runtime_service ON public.account_follows TO aibean_runtime USING(true) WITH CHECK(true);
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.analytics_events FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT,INSERT,DELETE ON public.analytics_events TO aibean_runtime;
CREATE POLICY runtime_service ON public.analytics_events TO aibean_runtime USING(true) WITH CHECK(true);
CREATE TABLE aibean_private.discovery_installations(package_id text PRIMARY KEY,sql_sha256 text NOT NULL CHECK(sql_sha256 ~ '^[0-9a-f]{64}$'),installed_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE aibean_private.discovery_installations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON aibean_private.discovery_installations FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON aibean_private.discovery_installations TO aibean_runtime;
CREATE POLICY runtime_read_discovery_ledger ON aibean_private.discovery_installations FOR SELECT TO aibean_runtime USING(true);
INSERT INTO aibean_private.discovery_installations(package_id,sql_sha256) VALUES('discovery-v1',current_setting('aibean.discovery_install_sha256'));
COMMIT;
