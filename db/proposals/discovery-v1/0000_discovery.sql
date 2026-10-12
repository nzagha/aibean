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
