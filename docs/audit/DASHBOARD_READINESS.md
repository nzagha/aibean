# Dashboard readiness

## Decision

**Build the Admin foundation next, after repository, dependency, identity and database prerequisites.**

The existing User dashboard has reusable work. Vendor and Creator areas depend on data and moderation systems that are not complete. A visual dashboard shell alone would not satisfy those dependencies.

## Readiness comparison

| Dashboard | Already exists | Missing dependencies | Safe next increment |
|---|---|---|---|
| Admin | requireAdmin, Tool draft creation/publication/archive, reviews, paid-claim review, placement review and 25 recent audit rows | Working admin identity; connected DB; full Tool/taxonomy editing; reliable transitions; trust evidence; searchable queues; commercial recovery | Extend current operations into audited Tool/taxonomy CRUD using existing styling |
| User | Session gate; saved Tools; create/add-to-Stack; reviews/claims display; browser compare | Real persistence and isolation tests; Stack editing/order/removal; multi-content saves; profile settings; follows/notifications; billing | Complete the existing Tool engagement workflow once DB is connected |
| Vendor | Per-Tool vendor_access, ownership approval constraint, listing of owned published Tools | Payment reliability; claims history/revoke/dispute; paid submission/edit/verification; analytics; subscription/entitlement model | Prove paid Claim -> review -> one-owner access, then controlled requests |
| Creator | isCreator flag and protected placeholder | Application/status transitions; profiles; content ownership; Skill/Playbook schemas; shared public Stacks; uploads/resources; events; attribution/billing | Build application/approval and one moderated publishing flow before full dashboard |

## Admin Control Panel

The present /admin page performs real server queries and actions when dependencies exist; it is not merely a mockup. However, the current auth mode cannot obtain admin capability through the documented bootstrap script.

First acceptance:
- Operator access is explicitly granted and audited.
- Non-admins fail at the server boundary even when posting crafted action payloads.
- Admin edits canonical Tool data and typed taxonomy relations.
- Publication validates completeness, allowed state and target existence.
- Status transitions include reviewer/reason/history.
- Lists are paginated/searchable and show pending/error/empty states.
- Audit history can trace the underlying operation.
- Existing visual treatment is retained.

Do not initially build every /admin/* route. Extract common shell/forms and add operational pages as real workflows arrive.

## User Control Panel

The current /account page includes saves, Stacks, reviews and claim status. Owner filters are visible in source. Without DB, it correctly acknowledges sign-in and states persistence is unavailable.

First acceptance:
- Two test users cannot read/write each other's Stacks, reviews, saved content or claims.
- A user can remove a saved Tool even when the Tool becomes unavailable, according to an explicit product policy; current publishedTool gating needs review for this case.
- Stack creation, renaming, removal, ordering and membership changes work consistently.
- Review edits re-enter moderation; status is visible.
- Comparison browser state and account persistence are distinguishable.
- Sensitive account data is never placed in shared cache output.

Following, notifications, saved Skills/Playbooks/Events and billing depend on later domain modules. Implement them when their sources exist rather than presenting false completion.

## Vendor Control Panel

Vendor is a capability on a User/Creator account. Preserve that model. The current ownership list is a useful starting point, and the database primary key enforces one owner per Tool.

First acceptance:
- Successful payment alone cannot assign ownership.
- Admin approval can assign only one verified owner.
- Rejected or competing claims have defined handling.
- Every edit request is constrained to an owned Tool.
- Proposed facts remain separate from public canonical data until approved.
- Vendors cannot change rankings, verification dates/badges or review moderation.
- Analytics derive from real, deduplicated records.
- Claims, paid requests and entitlements have visible history.

## Creator Control Panel

The current page only reports whether the Creator flag is set. No application workflow or publishing model exists.

First acceptance:
- Registered user applies; admin approves/rejects/suspends with a reason.
- Creator profile has stable handle and ownership.
- Creator edits only owned drafts.
- Skill and Playbook remain distinct objects.
- Resource assets use secure upload/delivery controls.
- Public Stacks reuse core Stack infrastructure with explicit visibility/type.
- Content publication follows moderation rules.
- Resource campaigns preserve attribution and approved affiliate disclosures.
- Unpublished/private resources remain inaccessible even through tracked URLs.

## Shared dashboard components

Introduce a common layout, capability-aware navigation, form error/pending feedback, table pagination, empty states and audit-status presentation using the current brand components and tokens.

Navigation should expose only available capabilities, but hidden navigation is not authorization. All actions and data reads still enforce permissions. Retain an ordinary User experience for someone who also has Creator and Vendor capabilities.

## Build order

1. A01–A04: baseline, patched dependencies, identity/permissions and real database.
2. A05: Admin catalog/taxonomy operations.
3. A06: User engagement and isolation.
4. A07–A10: trust/ranking, billing, paid claim/submission and initial Vendor analytics.
5. A11: controlled Vendor edits and verification.
6. A12–A13: Creator approval, Skills/Playbooks, public Stacks and resource funnels.
7. A14–A16: Events, subscriptions/placements and notifications.
8. A17 before external release; A18 for broader optimization/polish.

Some implementation work can overlap after contracts stabilize, but no parallel-agent work or implementation is authorized by this report.

