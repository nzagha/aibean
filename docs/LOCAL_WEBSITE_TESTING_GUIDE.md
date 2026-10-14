# Owner local website testing guide

Start at **http://127.0.0.1:3000/**. Retrieve current credentials using [the private handoff](LOCAL_QA_TEST_ACCOUNT_HANDOFF.md). Check the active preview expiry and restart if necessary using [the recovery guide](LOCAL_WEBSITE_RECOVERY_RESULT.md). The preview uses synthetic local data; it is not connected to hosted Supabase.

## Public routes

| Page | Exact local URL | Expected behavior |
| --- | --- | --- |
| Homepage | http://127.0.0.1:3000/ | Branded discovery hero, sections, empty sponsored state |
| Tools | http://127.0.0.1:3000/tools | Two published synthetic Tools; filters and comparison tray |
| Categories | http://127.0.0.1:3000/categories | Approved category index linking to filtered discovery |
| Industries | http://127.0.0.1:3000/industries | Existing approved industry cards |
| Use cases | http://127.0.0.1:3000/use-cases | Active approved use cases; excluded UC035 omitted |
| Search | http://127.0.0.1:3000/search | Scoped search |
| Comparison | http://127.0.0.1:3000/compare | Empty selection guidance or browser shortlist |
| Pricing | http://127.0.0.1:3000/pricing | Guest redirects to login; signed-in plans render |
| Creators | http://127.0.0.1:3000/creators | Approved synthetic profile |
| Skills | http://127.0.0.1:3000/skills | Published synthetic Skill |
| Playbooks | http://127.0.0.1:3000/playbooks | Published synthetic Playbook |
| Events | http://127.0.0.1:3000/events | Published synthetic Event |
| Login | http://127.0.0.1:3000/login | Ordinary User persona only on this preview |
| Registration | http://127.0.0.1:3000/register | Honest unavailable state; no account/capability creation |
| Submit | http://127.0.0.1:3000/submit | Existing submission entry; paid settlement unavailable |
| Vendors | http://127.0.0.1:3000/for-vendors | Existing Vendor information and next steps |

Useful fixture links: `/tools/acceptance-tool-1`, `/tools/acceptance-tool-2`, `/skills/acceptance-skill`, `/playbooks/acceptance-playbook`, `/events/acceptance-event`, `/@acceptance-creator`, `/@acceptance-creator/acceptance-resource`. Browser comparison URL: `http://127.0.0.1:3000/compare?tools=acceptance-tool-1,acceptance-tool-2`.

## Recommended testing order

1. Browse as a guest. Check header/footer links, branded images, 390px mobile menu open/close and the comparison table's internal horizontal scrolling. Search for `Acceptance`; expect two Tools. Select both Compare controls and open the tray link. Unknown verification facts must stay unknown. A shortlist persists in this browser; it does not sign you in.
2. Sign into the Ordinary User preview at `http://127.0.0.1:3000/login`. Open `/account`, create a uniquely named Stack and inspect feedback. Test saves, Stack ordering/visibility, comparisons, follows and profile edits. Billing/membership/submissions screens are available, but do not attempt real payment. Open `/admin` and `/creator`: expect server denial/redirect. `/vendor` may legitimately show an empty workspace; owning another person's Tool must still be denied.
3. Sign into Admin at `http://127.0.0.1:3002/login`, then `http://127.0.0.1:3002/admin`. Inspect overview and every navigation item in the matrix. Create a synthetic draft through `/admin/tools/new`, preview it and confirm it is not publicly listed. Review queues/audit history. Before trying publication/moderation, read the current fixture request status; never assume a payment grants approval. Only draft creation and listed access/validation checks have current mutation evidence; other workflow transitions are owner follow-up tests.
4. Sign into Creator at `http://127.0.0.1:3003/login`, then `http://127.0.0.1:3003/creator`. Open My Skills → Create private draft. Supply title, unique slug, summary, category, intended outcome and instructions. Expect “Draft saved. Publication requires independent Admin review.” Open the draft; guest/public browsing must not expose it. Inspect Playbook, Event, resource, profile preview and analytics screens. Upload and external-resource execution remain blocked.
5. Sign into Vendor at `http://127.0.0.1:3004/login`, then `http://127.0.0.1:3004/vendor`. Follow Tool requests & history for Tool 1. Propose an edit with a reason; expect a pending request, payment-required status and unchanged public listing. An existing pending request prevents duplicate proposals. Inspect analytics/featured/history. Tool 2 belongs to another synthetic owner and must not be editable. Do not prepare real checkout.
6. Test Logout for each persona through the account controls; account access must require login again. Sign in one persona at a time or use separate browser profiles, because localhost cookies share their host across ports.

The [QA matrix](FOUR_CONTROL_PANELS_QA_MATRIX.md) distinguishes actual route rendering/access tests, browser actions, unexecuted workflow transitions and external blockers. A rendered form is not evidence its entire workflow has passed.

## Re-run local checks

```powershell
npx tsx scripts/local-website-qa/verify-http.ts
npx tsx scripts/local-website-qa/verify-native.ts
node scripts/local-website-qa/build.mjs
npm test
npm run lint
npm run typecheck
npm audit --omit=dev
```

The HTTP verifier deliberately adds one synthetic Admin draft and then checks it through the real local database. Run it against a fresh fixture; repeated execution may encounter its existing test slug. Never substitute the private hosted environment or run historical recovery/install commands for this QA task. Do not use the ordinary Docker web profile with `.env.local` for synthetic writes.

Production build was tested hermetically in an isolated source copy without private environment files. This is independent of the live browser/HTTP results and hosted operational readiness.
