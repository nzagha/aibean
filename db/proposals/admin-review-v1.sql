-- PROPOSAL ONLY: separately approved operator installation, never automatic.
-- Set aibean.review_install_sha256 to this file's reviewed SHA-256 in the
-- operator session first. Existing baseline/identity history stays unchanged.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
SELECT pg_advisory_xact_lock(hashtextextended('aibean-admin-review-v1',0));
DO $preflight$
DECLARE object_name text;
BEGIN
  IF current_database() <> 'postgres' THEN RAISE EXCEPTION 'Unexpected database'; END IF;
  IF current_setting('aibean.review_install_sha256',true) IS NULL
    OR current_setting('aibean.review_install_sha256',true) !~ '^[0-9a-f]{64}$'
    THEN RAISE EXCEPTION 'Reviewed installation checksum is required'; END IF;
  IF to_regclass('drizzle.__drizzle_migrations') IS NULL OR to_regclass('aibean_private.installations') IS NULL
    THEN RAISE EXCEPTION 'Reviewed baseline installation is required'; END IF;
  IF (SELECT count(*) FROM aibean_private.installations) <> 1
    OR NOT EXISTS (SELECT 1 FROM aibean_private.installations WHERE id='aibean-foundation-v1' AND sql_sha256='eea0e7309e13440224ca80030a367afc76bc99c08b2027fc722b8fa2b388277a')
    THEN RAISE EXCEPTION 'Unexpected security installation history'; END IF;
  IF (SELECT count(*) FROM drizzle.__drizzle_migrations) <> 2
    OR NOT EXISTS (SELECT 1 FROM drizzle.__drizzle_migrations WHERE hash='b58134b31944656eda45a6ba929fcdb66a5ec4e66e01a8cfd3d8d9b16d4f4468')
    OR NOT EXISTS (SELECT 1 FROM drizzle.__drizzle_migrations WHERE hash='168fd0b654a75e1174052fc444893a66362f89bb3d1cdaec3bbfe9fcbf4f4df1')
    THEN RAISE EXCEPTION 'Unexpected baseline migration history'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='aibean_runtime' AND NOT rolsuper AND NOT rolcanlogin AND NOT rolcreatedb AND NOT rolcreaterole AND NOT rolbypassrls AND NOT rolreplication)
    THEN RAISE EXCEPTION 'Restricted runtime role is required'; END IF;
  FOREACH object_name IN ARRAY ARRAY['public.creator_applications','public.creator_capability_requests','public.vendor_edit_requests','public.verification_requests','public.claim_disputes','aibean_private.admin_review_installations'] LOOP
    IF to_regclass(object_name) IS NOT NULL THEN RAISE EXCEPTION 'Unexpected existing review object'; END IF;
  END LOOP;
END $preflight$;
CREATE TABLE public.creator_applications (
  id text PRIMARY KEY, user_id text NOT NULL UNIQUE REFERENCES public.users(id),
  name text NOT NULL, bio text NOT NULL, links jsonb NOT NULL CHECK (jsonb_typeof(links)='array'),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','suspension_requested')),
  reviewer_id text REFERENCES public.users(id), review_reason text, reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (status='pending' OR (reviewer_id IS NOT NULL AND review_reason IS NOT NULL AND reviewed_at IS NOT NULL))
);
CREATE TABLE public.creator_capability_requests (
  id text PRIMARY KEY, application_id text NOT NULL REFERENCES public.creator_applications(id),
  user_id text NOT NULL REFERENCES public.users(id), desired_state text NOT NULL CHECK (desired_state IN ('enabled','disabled')),
  requested_by text NOT NULL REFERENCES public.users(id), reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending_operator' CHECK (status IN ('pending_operator','applied','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(), applied_at timestamptz, applied_by text,
  CHECK (status <> 'applied' OR (applied_at IS NOT NULL AND applied_by IS NOT NULL))
);
CREATE UNIQUE INDEX one_pending_creator_capability ON public.creator_capability_requests(user_id,desired_state) WHERE status='pending_operator';
CREATE TABLE public.vendor_edit_requests (
  id text PRIMARY KEY, tool_id text NOT NULL REFERENCES public.tools(id), user_id text NOT NULL REFERENCES public.users(id),
  base_revision text NOT NULL, proposed jsonb NOT NULL CHECK (jsonb_typeof(proposed)='object'), note text NOT NULL,
  payment_state text NOT NULL DEFAULT 'required' CHECK (payment_state IN ('required','promo_zero')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewer_id text REFERENCES public.users(id), review_reason text, reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (status='pending' OR (reviewer_id IS NOT NULL AND review_reason IS NOT NULL AND reviewed_at IS NOT NULL))
);
ALTER TABLE public.vendor_edit_requests ADD CONSTRAINT paid_edit_no_promo CHECK (payment_state='required');
CREATE UNIQUE INDEX one_pending_vendor_edit ON public.vendor_edit_requests(tool_id) WHERE status='pending';
CREATE TABLE public.verification_requests (
  id text PRIMARY KEY, tool_id text NOT NULL REFERENCES public.tools(id), user_id text NOT NULL REFERENCES public.users(id),
  base_revision text NOT NULL, evidence jsonb NOT NULL CHECK (jsonb_typeof(evidence)='array'), note text NOT NULL,
  payment_state text NOT NULL DEFAULT 'required' CHECK (payment_state IN ('required','promo_zero')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewer_id text REFERENCES public.users(id), review_reason text, reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (status='pending' OR (reviewer_id IS NOT NULL AND review_reason IS NOT NULL AND reviewed_at IS NOT NULL))
);
CREATE UNIQUE INDEX one_pending_verification_request ON public.verification_requests(tool_id) WHERE status='pending';
CREATE TABLE public.claim_disputes (
  id text PRIMARY KEY, tool_id text NOT NULL REFERENCES public.tools(id), claim_id text NOT NULL REFERENCES public.claim_requests(id),
  owner_id text NOT NULL REFERENCES public.users(id), opened_by text NOT NULL REFERENCES public.users(id), reason text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved')), decision text CHECK (decision IN ('retain','revoke')),
  reviewer_id text REFERENCES public.users(id), review_reason text, reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (status='open' OR (decision IS NOT NULL AND reviewer_id IS NOT NULL AND review_reason IS NOT NULL AND reviewed_at IS NOT NULL))
);
CREATE UNIQUE INDEX one_open_tool_dispute ON public.claim_disputes(tool_id) WHERE status='open';
CREATE TABLE aibean_private.admin_review_installations (
  package_id text PRIMARY KEY, sql_sha256 text NOT NULL CHECK (sql_sha256 ~ '^[0-9a-f]{64}$'), installed_at timestamptz NOT NULL DEFAULT now()
);
DO $security$
DECLARE object_name text;
BEGIN
  FOREACH object_name IN ARRAY ARRAY['creator_applications','creator_capability_requests','vendor_edit_requests','verification_requests','claim_disputes'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',object_name);
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC,anon,authenticated,service_role',object_name);
    EXECUTE format('CREATE POLICY runtime_service ON public.%I TO aibean_runtime USING (true) WITH CHECK (true)',object_name);
  END LOOP;
END $security$;
GRANT SELECT,INSERT,UPDATE ON public.creator_applications,public.vendor_edit_requests,public.verification_requests,public.claim_disputes TO aibean_runtime;
-- Capability requests cannot themselves change User flags. Only an independently
-- authorized operator may fulfill/cancel a request or change protected flags.
GRANT SELECT,INSERT ON public.creator_capability_requests TO aibean_runtime;
ALTER TABLE aibean_private.admin_review_installations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON aibean_private.admin_review_installations FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON aibean_private.admin_review_installations TO aibean_runtime;
CREATE POLICY runtime_read_review_ledger ON aibean_private.admin_review_installations FOR SELECT TO aibean_runtime USING (true);
INSERT INTO aibean_private.admin_review_installations(package_id,sql_sha256)
  VALUES ('admin-review-v1',current_setting('aibean.review_install_sha256'));
COMMIT;
