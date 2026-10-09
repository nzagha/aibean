-- PROPOSAL ONLY. Execute only through the reviewed atomic installation package.
-- No Auth records, legacy IDs, capability flags or TestUsers rows are modified.
CREATE ROLE aibean_runtime NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE SCHEMA aibean_private;
REVOKE ALL ON SCHEMA aibean_private FROM PUBLIC, anon, authenticated, service_role;
GRANT USAGE ON SCHEMA public, aibean_private TO aibean_runtime;

CREATE TABLE aibean_private.user_identities (
  auth_user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  user_id text NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE aibean_private.user_identities ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON aibean_private.user_identities FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT ON aibean_private.user_identities TO aibean_runtime;
CREATE POLICY runtime_read_identity ON aibean_private.user_identities
  FOR SELECT TO aibean_runtime USING (true);
CREATE POLICY runtime_insert_identity ON aibean_private.user_identities
  FOR INSERT TO aibean_runtime WITH CHECK (true);

-- Browser roles never access application tables directly in this stage.
-- The restricted service role is trusted server code; it does not inherit JWT
-- identity. Per-user ownership/capability checks remain mandatory in the app.
DO $security$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'taxonomy','users','tools','saved_tools','stacks','stack_tools','tool_reviews',
    'vendor_access','claim_requests','orders','featured_placements',
    'billing_webhook_receipts','audit_logs','rate_limits'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon, authenticated, service_role', table_name);
    EXECUTE format('CREATE POLICY runtime_service ON public.%I TO aibean_runtime USING (true) WITH CHECK (true)', table_name);
  END LOOP;
END
$security$;

GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.taxonomy, public.tools, public.saved_tools, public.stacks, public.stack_tools,
  public.tool_reviews, public.vendor_access, public.claim_requests, public.orders,
  public.featured_placements, public.rate_limits
TO aibean_runtime;
GRANT SELECT ON public.users TO aibean_runtime;
GRANT INSERT (id) ON public.users TO aibean_runtime;
-- Privileged capability changes remain an audited trusted-operator operation.
-- Runtime cannot grant Admin/Creator or delete application users.
GRANT SELECT, INSERT ON public.audit_logs, public.billing_webhook_receipts TO aibean_runtime;

-- Do not alter schema-wide defaults here: they may serve unrelated owner data.
-- Each later migration must harden its own objects before transaction commit.
-- Runtime receives no schema CREATE, TRUNCATE, role, ledger, or Auth privileges.
