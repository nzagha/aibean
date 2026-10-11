-- FORWARD DRIZZLE PROPOSAL ONLY. Requires the unchanged admin-review-v1 package.
-- Operator must verify exact bytes/target/TLS/backup and set the reviewed hash.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
SELECT pg_advisory_xact_lock(hashtextextended('aibean-admin-operations-v2',0));
DO $preflight$
BEGIN
  IF current_database()<>'postgres' THEN RAISE EXCEPTION 'Unexpected database'; END IF;
  IF coalesce(current_setting('aibean.operations_install_sha256',true),'') !~ '^[0-9a-f]{64}$' THEN RAISE EXCEPTION 'Reviewed checksum required'; END IF;
  IF to_regclass('aibean_private.admin_review_installations') IS NULL THEN RAISE EXCEPTION 'Review package required'; END IF;
  IF NOT EXISTS(SELECT 1 FROM aibean_private.admin_review_installations WHERE package_id='admin-review-v1' AND sql_sha256='5f016dce942a7570cc8770549a4b021b456fdbb74d3bdf0512d98e418ff0faca') THEN RAISE EXCEPTION 'Review history differs'; END IF;
  IF (SELECT count(*) FROM drizzle.__drizzle_migrations)<>2 OR NOT EXISTS(SELECT 1 FROM drizzle.__drizzle_migrations WHERE hash='b58134b31944656eda45a6ba929fcdb66a5ec4e66e01a8cfd3d8d9b16d4f4468' AND created_at=1791247215670) OR NOT EXISTS(SELECT 1 FROM drizzle.__drizzle_migrations WHERE hash='168fd0b654a75e1174052fc444893a66362f89bb3d1cdaec3bbfe9fcbf4f4df1' AND created_at=1791249181547) THEN RAISE EXCEPTION 'Baseline history differs'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='aibean_runtime' AND NOT rolcanlogin AND NOT rolsuper AND NOT rolbypassrls AND NOT rolcreatedb AND NOT rolcreaterole AND NOT rolreplication) THEN RAISE EXCEPTION 'Unsafe runtime role'; END IF;
END $preflight$;
CREATE TABLE public.billing_products (
  id text PRIMARY KEY CHECK(id IN ('submission','edit','verification','vendor_subscription','creator_subscription')),
  name text NOT NULL, amount integer NOT NULL CHECK(amount BETWEEN 0 AND 1000000), currency text NOT NULL DEFAULT 'usd' CHECK(currency='usd'),
  active boolean NOT NULL DEFAULT false, updated_by text NOT NULL REFERENCES public.users(id), updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK(amount>0 OR id='verification')
);
CREATE TABLE public.tool_submissions (
  id text PRIMARY KEY,user_id text NOT NULL REFERENCES public.users(id), proposed jsonb NOT NULL CHECK(jsonb_typeof(proposed)='object'),
  status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
  tool_id text REFERENCES public.tools(id), reviewer_id text REFERENCES public.users(id),review_reason text,reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK(status='pending' OR (reviewer_id IS NOT NULL AND review_reason IS NOT NULL AND reviewed_at IS NOT NULL)),
  CHECK(status<>'approved' OR tool_id IS NOT NULL)
);
CREATE TABLE public.billing_transactions (
  id text PRIMARY KEY,user_id text NOT NULL REFERENCES public.users(id),product_id text NOT NULL REFERENCES public.billing_products(id),
  kind text NOT NULL CHECK(kind IN ('submission','edit','verification','vendor_subscription','creator_subscription')),
  subject_id text NOT NULL,amount integer NOT NULL CHECK(amount BETWEEN 0 AND 1000000),currency text NOT NULL CHECK(currency='usd'),
  status text NOT NULL DEFAULT 'created' CHECK(status IN ('created','paid','expired')),
  stripe_session_id text UNIQUE,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(kind,subject_id),CHECK(kind=product_id),CHECK(amount>0 OR kind='verification')
);
CREATE TABLE public.commerce_subscriptions (
  id text PRIMARY KEY,user_id text NOT NULL REFERENCES public.users(id),product_id text NOT NULL REFERENCES public.billing_products(id),
  stripe_subscription_id text NOT NULL UNIQUE,status text NOT NULL CHECK(status IN ('active','trialing','past_due','canceled','unpaid','incomplete','incomplete_expired','paused')),
  ends_at timestamptz,cancel_at_period_end boolean NOT NULL DEFAULT false,provider_event_at bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK(product_id IN ('vendor_subscription','creator_subscription'))
);
CREATE INDEX commercial_queue ON public.billing_transactions(status,created_at,id);
CREATE INDEX submission_queue ON public.tool_submissions(status,created_at,id);
CREATE INDEX subscriptions_owner ON public.commerce_subscriptions(user_id,created_at,id);
DO $security$
DECLARE item text;
BEGIN
  FOREACH item IN ARRAY ARRAY['billing_products','billing_transactions','tool_submissions','commerce_subscriptions'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',item);
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC,anon,authenticated,service_role',item);
    EXECUTE format('GRANT SELECT,INSERT,UPDATE ON public.%I TO aibean_runtime',item);
    EXECUTE format('CREATE POLICY runtime_service ON public.%I TO aibean_runtime USING (true) WITH CHECK (true)',item);
  END LOOP;
END $security$;
CREATE TABLE aibean_private.admin_operations_installations(package_id text PRIMARY KEY,sql_sha256 text NOT NULL CHECK(sql_sha256 ~ '^[0-9a-f]{64}$'),installed_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE aibean_private.admin_operations_installations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON aibean_private.admin_operations_installations FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON aibean_private.admin_operations_installations TO aibean_runtime;
CREATE POLICY runtime_read_operations_ledger ON aibean_private.admin_operations_installations FOR SELECT TO aibean_runtime USING(true);
INSERT INTO aibean_private.admin_operations_installations(package_id,sql_sha256) VALUES('admin-operations-v2',current_setting('aibean.operations_install_sha256'));
COMMIT;
