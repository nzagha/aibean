-- Disposable loopback QA database only. Never a hosted migration/package.
CREATE SCHEMA local_qa_auth;
REVOKE ALL ON SCHEMA local_qa_auth FROM PUBLIC, anon, authenticated, service_role;
CREATE TABLE local_qa_auth.version (id integer PRIMARY KEY CHECK(id=1), checksum text NOT NULL);
CREATE TABLE local_qa_auth.accounts (
 user_id text PRIMARY KEY REFERENCES public.users(id), email text UNIQUE NOT NULL,
 password_hash text NOT NULL, confirmed boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE local_qa_auth.sessions (
 digest text PRIMARY KEY, user_id text REFERENCES local_qa_auth.accounts(user_id),
 purpose text NOT NULL CHECK(purpose IN ('access','recovery','mailbox')),
 expires_at timestamptz NOT NULL, revoked boolean NOT NULL DEFAULT false
);
CREATE INDEX sessions_user_idx ON local_qa_auth.sessions(user_id);
CREATE TABLE local_qa_auth.tokens (
 digest text PRIMARY KEY, user_id text NOT NULL REFERENCES local_qa_auth.accounts(user_id),
 purpose text NOT NULL CHECK(purpose IN ('verify','reset')), expires_at timestamptz NOT NULL,
 consumed boolean NOT NULL DEFAULT false
);
CREATE TABLE local_qa_auth.rates (key text PRIMARY KEY, count integer NOT NULL, expires_at timestamptz NOT NULL);
CREATE TABLE local_qa_auth.mail (
 id text PRIMARY KEY, email text NOT NULL, purpose text NOT NULL CHECK(purpose IN ('verify','reset')),
 token text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
GRANT USAGE ON SCHEMA local_qa_auth TO aibean_runtime;
GRANT SELECT ON local_qa_auth.version TO aibean_runtime;
GRANT SELECT, INSERT, UPDATE ON local_qa_auth.accounts, local_qa_auth.sessions, local_qa_auth.tokens, local_qa_auth.rates TO aibean_runtime;
GRANT SELECT, INSERT ON local_qa_auth.mail TO aibean_runtime;
-- Private schema, no Data API/browser grants. RLS protects against public roles;
-- only the restricted server role receives explicit all-row backend policies.
ALTER TABLE local_qa_auth.version ENABLE ROW LEVEL SECURITY;
ALTER TABLE local_qa_auth.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE local_qa_auth.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE local_qa_auth.tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE local_qa_auth.rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE local_qa_auth.mail ENABLE ROW LEVEL SECURITY;
CREATE POLICY server_only ON local_qa_auth.version TO aibean_runtime USING(true);
CREATE POLICY server_only ON local_qa_auth.accounts TO aibean_runtime USING(true) WITH CHECK(true);
CREATE POLICY server_only ON local_qa_auth.sessions TO aibean_runtime USING(true) WITH CHECK(true);
CREATE POLICY server_only ON local_qa_auth.tokens TO aibean_runtime USING(true) WITH CHECK(true);
CREATE POLICY server_only ON local_qa_auth.rates TO aibean_runtime USING(true) WITH CHECK(true);
CREATE POLICY server_only ON local_qa_auth.mail TO aibean_runtime USING(true) WITH CHECK(true);
