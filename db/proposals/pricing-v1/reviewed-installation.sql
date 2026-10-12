-- SEPARATE PROPOSAL: exact owner approval, trusted TLS/target/operator and expanded recovery preflight required.
BEGIN; SET LOCAL search_path=pg_catalog,public; SET LOCAL lock_timeout='5s'; SET LOCAL statement_timeout='60s';
SELECT pg_advisory_xact_lock(hashtextextended('aibean-pricing-v1',0));
DO $preflight$ BEGIN
 IF current_database()<>'postgres' OR current_user<>'postgres' THEN RAISE EXCEPTION 'Unexpected database/operator'; END IF;
 IF coalesce(current_setting('aibean.pricing_install_sha256',true),'') !~ '^[0-9a-f]{64}$' THEN RAISE EXCEPTION 'Reviewed checksum required'; END IF;
 IF to_regclass('aibean_private.admin_review_installations') IS NULL THEN RAISE EXCEPTION 'Missing prerequisite'; END IF; IF NOT EXISTS(SELECT 1 FROM aibean_private.admin_review_installations WHERE package_id='admin-review-v1' AND sql_sha256='5f016dce942a7570cc8770549a4b021b456fdbb74d3bdf0512d98e418ff0faca') THEN RAISE EXCEPTION 'Dependency history differs'; END IF;
IF to_regclass('aibean_private.admin_operations_installations') IS NULL THEN RAISE EXCEPTION 'Missing prerequisite'; END IF; IF NOT EXISTS(SELECT 1 FROM aibean_private.admin_operations_installations WHERE package_id='admin-operations-v2' AND sql_sha256='1d13ac175e967a2a9512f1ed1e0e2d6b5c34a3fa2c67692d9adcf70fef686d39') THEN RAISE EXCEPTION 'Dependency history differs'; END IF;
IF to_regclass('aibean_private.content_installations') IS NULL THEN RAISE EXCEPTION 'Missing prerequisite'; END IF; IF NOT EXISTS(SELECT 1 FROM aibean_private.content_installations WHERE package_id='creator-content-v1' AND sql_sha256='ecdac0e6d3448456d16b71a274d29a62050264ba9d406d4077081c998541f78d') THEN RAISE EXCEPTION 'Dependency history differs'; END IF;
IF to_regclass('aibean_private.files_installations') IS NULL THEN RAISE EXCEPTION 'Missing prerequisite'; END IF; IF NOT EXISTS(SELECT 1 FROM aibean_private.files_installations WHERE package_id='creator-files-v1' AND sql_sha256='88b5cc102a30097f7579f7dcd1da482e691522353439b5f688abcce2ad50b66b') THEN RAISE EXCEPTION 'Dependency history differs'; END IF;
IF to_regclass('aibean_private.discovery_installations') IS NULL THEN RAISE EXCEPTION 'Missing prerequisite'; END IF; IF NOT EXISTS(SELECT 1 FROM aibean_private.discovery_installations WHERE package_id='discovery-v1' AND sql_sha256='c29a3436daa54eee9f9ec1e9eb0e633da6d7cc14cb42fd9b05784db5a96de0b3') THEN RAISE EXCEPTION 'Dependency history differs'; END IF;
 IF (SELECT count(*) FROM drizzle.__drizzle_migrations)<>2 OR NOT EXISTS(SELECT 1 FROM drizzle.__drizzle_migrations WHERE hash='b58134b31944656eda45a6ba929fcdb66a5ec4e66e01a8cfd3d8d9b16d4f4468' AND created_at=1791247215670) OR NOT EXISTS(SELECT 1 FROM drizzle.__drizzle_migrations WHERE hash='168fd0b654a75e1174052fc444893a66362f89bb3d1cdaec3bbfe9fcbf4f4df1' AND created_at=1791249181547) THEN RAISE EXCEPTION 'Baseline history differs'; END IF;
 IF EXISTS(SELECT 1 FROM pg_class WHERE relnamespace='public'::regnamespace AND relname IN ('pricing_releases','pricing_quotes','membership_bindings','membership_changes','pricing_refunds')) OR to_regclass('aibean_private.pricing_installations') IS NOT NULL THEN RAISE EXCEPTION 'Unexpected pricing objects'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='aibean_runtime' AND NOT rolcanlogin AND NOT rolsuper AND NOT rolbypassrls AND NOT rolcreatedb AND NOT rolcreaterole AND NOT rolreplication) THEN RAISE EXCEPTION 'Unsafe runtime'; END IF;
END $preflight$;
CREATE TABLE public.pricing_releases (
 id text PRIMARY KEY,version text NOT NULL UNIQUE,config jsonb NOT NULL CHECK(jsonb_typeof(config)='object'),config_sha256 text NOT NULL CHECK(config_sha256 ~ '^[a-f0-9]{64}$'),
 status text NOT NULL DEFAULT 'proposed' CHECK(status IN ('proposed','reviewed','active','retired')),revision integer NOT NULL DEFAULT 1 CHECK(revision>0),
 created_by text NOT NULL REFERENCES public.users(id),reviewed_by text REFERENCES public.users(id),review_reason text,provider_prices jsonb NOT NULL DEFAULT '{}',activated_at timestamptz,created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(status='proposed' OR reviewed_by IS NOT NULL AND review_reason IS NOT NULL),CHECK(status<>'active' OR activated_at IS NOT NULL)
);
CREATE UNIQUE INDEX one_active_pricing ON public.pricing_releases((true)) WHERE status='active';
CREATE TABLE public.pricing_quotes (
 payment_id text PRIMARY KEY REFERENCES public.billing_transactions(id),user_id text NOT NULL REFERENCES public.users(id),release_id text NOT NULL REFERENCES public.pricing_releases(id),
 plan_id text,interval text CHECK(interval IN ('month','year')),base integer NOT NULL CHECK(base>=0),discount integer NOT NULL CHECK(discount>=0 AND discount<=base),amount integer NOT NULL CHECK(amount=base-discount),
 beneficiary_plans jsonb NOT NULL DEFAULT '[]',config_sha256 text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),CHECK((plan_id IS NULL)=(interval IS NULL))
);
CREATE INDEX pricing_quote_owner ON public.pricing_quotes(user_id,created_at DESC);
CREATE TABLE public.membership_bindings (
 subscription_id text PRIMARY KEY REFERENCES public.commerce_subscriptions(id),user_id text NOT NULL REFERENCES public.users(id),release_id text NOT NULL REFERENCES public.pricing_releases(id),payment_id text NOT NULL UNIQUE REFERENCES public.pricing_quotes(payment_id),
 plan_id text NOT NULL CHECK(plan_id IN ('creator_pro','vendor_pro')),interval text NOT NULL CHECK(interval IN ('month','year')),price_id text NOT NULL,
 paid_from timestamptz,paid_through timestamptz,last_invoice_id text UNIQUE,provider_event_at bigint NOT NULL DEFAULT 0,revision integer NOT NULL DEFAULT 1,
 CHECK((paid_from IS NULL)=(paid_through IS NULL)),CHECK(paid_through IS NULL OR paid_through>paid_from)
);
CREATE INDEX membership_owner ON public.membership_bindings(user_id,plan_id);
CREATE TABLE public.membership_changes (
 id text PRIMARY KEY,subscription_id text NOT NULL REFERENCES public.membership_bindings(subscription_id),user_id text NOT NULL REFERENCES public.users(id),release_id text NOT NULL REFERENCES public.pricing_releases(id),
 plan_id text NOT NULL CHECK(plan_id IN ('creator_pro','vendor_pro')),interval text NOT NULL CHECK(interval IN ('month','year')),price_id text NOT NULL,
 status text NOT NULL DEFAULT 'prepared' CHECK(status IN ('prepared','scheduled','applied')),provider_schedule_id text UNIQUE,expected_revision integer NOT NULL,effective_at timestamptz NOT NULL,created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX one_open_membership_change ON public.membership_changes(subscription_id) WHERE status<>'applied';
CREATE TABLE public.pricing_refunds (
 id text PRIMARY KEY,payment_id text NOT NULL UNIQUE REFERENCES public.billing_transactions(id),user_id text NOT NULL REFERENCES public.users(id),amount integer NOT NULL CHECK(amount>0),
 status text NOT NULL DEFAULT 'requested' CHECK(status IN ('requested','approved','rejected','refunded')),reason text NOT NULL,reviewer_id text REFERENCES public.users(id),review_reason text,provider_refund_id text UNIQUE,revision integer NOT NULL DEFAULT 1,created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(status='requested' OR reviewer_id IS NOT NULL AND review_reason IS NOT NULL),CHECK(status<>'refunded' OR provider_refund_id IS NOT NULL)
);
CREATE INDEX pricing_refund_queue ON public.pricing_refunds(status,created_at,id);

ALTER TABLE public.pricing_releases ENABLE ROW LEVEL SECURITY; REVOKE ALL ON public.pricing_releases FROM PUBLIC,anon,authenticated,service_role; GRANT SELECT,INSERT,UPDATE ON public.pricing_releases TO aibean_runtime; CREATE POLICY runtime_service ON public.pricing_releases TO aibean_runtime USING(true) WITH CHECK(true);
ALTER TABLE public.pricing_quotes ENABLE ROW LEVEL SECURITY; REVOKE ALL ON public.pricing_quotes FROM PUBLIC,anon,authenticated,service_role; GRANT SELECT,INSERT,UPDATE ON public.pricing_quotes TO aibean_runtime; CREATE POLICY runtime_service ON public.pricing_quotes TO aibean_runtime USING(true) WITH CHECK(true);
ALTER TABLE public.membership_bindings ENABLE ROW LEVEL SECURITY; REVOKE ALL ON public.membership_bindings FROM PUBLIC,anon,authenticated,service_role; GRANT SELECT,INSERT,UPDATE ON public.membership_bindings TO aibean_runtime; CREATE POLICY runtime_service ON public.membership_bindings TO aibean_runtime USING(true) WITH CHECK(true);
ALTER TABLE public.membership_changes ENABLE ROW LEVEL SECURITY; REVOKE ALL ON public.membership_changes FROM PUBLIC,anon,authenticated,service_role; GRANT SELECT,INSERT,UPDATE ON public.membership_changes TO aibean_runtime; CREATE POLICY runtime_service ON public.membership_changes TO aibean_runtime USING(true) WITH CHECK(true);
ALTER TABLE public.pricing_refunds ENABLE ROW LEVEL SECURITY; REVOKE ALL ON public.pricing_refunds FROM PUBLIC,anon,authenticated,service_role; GRANT SELECT,INSERT,UPDATE ON public.pricing_refunds TO aibean_runtime; CREATE POLICY runtime_service ON public.pricing_refunds TO aibean_runtime USING(true) WITH CHECK(true);
CREATE TABLE aibean_private.pricing_installations(package_id text PRIMARY KEY,sql_sha256 text NOT NULL CHECK(sql_sha256 ~ '^[a-f0-9]{64}$'),installed_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE aibean_private.pricing_installations ENABLE ROW LEVEL SECURITY; REVOKE ALL ON aibean_private.pricing_installations FROM PUBLIC,anon,authenticated,service_role; GRANT SELECT ON aibean_private.pricing_installations TO aibean_runtime;
CREATE POLICY runtime_read_pricing_history ON aibean_private.pricing_installations FOR SELECT TO aibean_runtime USING(true);
INSERT INTO aibean_private.pricing_installations VALUES('pricing-v1',current_setting('aibean.pricing_install_sha256'),now());
COMMIT;
