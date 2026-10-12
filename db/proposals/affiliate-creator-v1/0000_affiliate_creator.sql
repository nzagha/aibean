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
