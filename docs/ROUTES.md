# Route contracts

Stage 1 public: `/`, `/tools`, `/tools/[slug]`, `/compare`, `/search`, `/industries`, `/industries/[slug]`, `/categories/[slug]`, `/use-cases/[slug]`, `/for-vendors`, `/submit`.

Stage 1 protected: `/account`, `/admin`, `/vendor`, `/creator`, `/pricing`, `/submit/tool`, `/claim/[slug]`. Creator publishing, paid tool submission, and full pricing pages explicitly indicate upcoming setup/workflow status. They do not claim to be implemented commerce systems.

Auth: `/login`, `/register`. No keys: honest setup-required screen; no fake session or demo admin bypass. Configured: Clerk components. Billing webhook: POST `/api/billing/webhook`, signed test-mode events only.

Later-stage public landing pages: `/skills`, `/playbooks`, `/events`, `/creators`. Their detailed object routes and creator campaign routes will be built in their respective stages.

Compatibility: `/explore` forwards query/category selections to `/tools`; `/knowledge` redirects to `/skills`; `/collections` redirects to `/playbooks`. Legacy real-estate category becomes Industry VER-09.
