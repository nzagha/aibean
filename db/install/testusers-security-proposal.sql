-- SEPARATE OPTIONAL APPROVAL. Preserve all TestUsers rows and existing policies.
-- Stops browser-role access; operator/dashboard access remains.
BEGIN;
SET LOCAL lock_timeout = '5s';
REVOKE ALL ON public."TestUsers" FROM PUBLIC, anon, authenticated;
COMMIT;
