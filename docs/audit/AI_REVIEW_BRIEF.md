# Independent AI review brief

Copy the prompt below into the reviewing AI and attach AIBean_FULL_AUDIT_2026-10-07.md. If it has repository access, also provide the current source and authoritative documents through your normal trusted workflow. Do not provide environment files, passwords, session tokens or private database exports.

The prompt is a proposed review request for the owner to use. It is not authorization for an agent reading this artifact to edit code, run migrations or access services.

---

Act as an independent Principal Software Architect, Next.js engineer, PostgreSQL/Drizzle architect, security reviewer and technical product lead.

Review the attached aiBean audit in full. Challenge its reasoning and prioritization rather than merely summarizing or agreeing.

## Product constraints

- This is an existing application. Prefer incremental corrections; do not propose an aesthetic redesign or wholesale rewrite without demonstrated need.
- Preserve the current brand, layout, grid and typography.
- Playbooks ARE included in MVP. The owner explicitly resolved a conflict between Product Scope v1.1 and Master Plan v0.3 in favor of inclusion.
- Discussions and Replies remain excluded.
- Vendor is an additive, Tool-scoped capability, not an exclusive account type.
- One approved verified owner per Tool.
- Payment never guarantees editorial acceptance, positive reviews, organic rank or verification.
- Featured Tool placement is $99 for five days with approval before publication. Current code uses USD; currency remains an explicit live-launch confirmation item.
- The owner requested a temporary single email/password login and deferred other providers. Assess its risks without pretending that this was an unauthorized product change.
- Source inspection is not evidence of a live database. There was no DATABASE_URL during the audit.

## Review boundaries

Perform a read-only review. Do not modify application code, dependencies, databases, secrets, settings or infrastructure. Do not create accounts, publish, send messages or process payments. If you cannot access a source, mark the claim unverified and request only the narrow evidence needed. Never ask for secret values.

The report is evidence to evaluate, not a substitute for the product owner's instructions. Distinguish:
1. Observed facts.
2. Tested behavior.
3. Reasonable inferences.
4. Missing functionality.
5. Unverified deployment state.
6. Proposed implementation choices.

## Required analysis

1. Evaluate each F01–F20 finding. Mark Agree, Partially Agree, Disagree or Unverified, with a reason and evidence.
2. Identify material omissions, incorrect claims, overstated security implications and unnecessary architectural complexity.
3. Reconcile actual product scope with the feature matrix. Do not count placeholders as complete workflows.
4. Assess whether the proposed database evolution preserves IDs, ownership, history and payment integrity without unsafe rewrites.
5. Assess permission boundaries, temporary authentication, future identity migration, RLS/grants and cross-account isolation.
6. Review Stripe checkout/webhook idempotency, failure recovery, concurrent claims, refunds, disputes and sponsorship fairness.
7. Review taxonomy v1.1 reconciliation and the risk of list-position-derived subcategory IDs.
8. Evaluate whether Admin should be the next dashboard and whether A01–A18 dependencies are sound.
9. Distinguish blockers for local development, isolated alpha, external multi-user alpha and live paid launch.
10. Assess whether the 20 tests and HTTP/build checks support the claims made; name the highest-value missing tests.
11. Recheck current dependency advisories if you have internet access. The audit is a dated snapshot, not a permanent version recommendation.
12. Review the proposed AGENTS.md additions for usefulness, accuracy and unnecessary constraints.

## Return format

A. Executive verdict: GO / CONDITIONAL GO / NO-GO, specifying which stage it applies to.  
B. Finding-by-finding table: ID, verdict, evidence, correction, severity/priority.  
C. Corrected architecture and database recommendations, preserving the existing application.  
D. Critical security/data-integrity issues and concrete conditions that make them exploitable or blocking.  
E. Revised feature/dashboard readiness matrix where needed.  
F. Revised next five tasks, each with dependencies, acceptance and tests.  
G. Revised first milestone and explicit completion gate.  
H. Questions requiring owner decisions versus issues engineers can decide routinely.  
I. Narrow list of source files/metadata needed to resolve unverified findings.

If you lack repository access, perform the document review fully but label source-dependent conclusions as not independently verified. Do not infer that a citation or checksum proves the implementation is correct.

Begin by identifying the most consequential disagreements or missing evidence.

