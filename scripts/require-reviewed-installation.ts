console.error(
  "Migration execution is gated. Review docs/SUPABASE_DATABASE_INSTALLATION_APPROVAL.md and db/install/reviewed-installation.sql. Hosted execution requires explicit owner approval; no database connection was opened.",
);
process.exitCode = 1;
