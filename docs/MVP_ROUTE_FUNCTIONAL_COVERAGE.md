# Route-by-route functional coverage — 12 October 2026

## New discovery milestone coverage

**27/27 new HTTP checks PASS**, distinct from the dated 119-check audit below. [Exact evidence](evidence/mvp-discovery-http.json), [native workflows](evidence/mvp-discovery-native-postgres.json), [actual browser coverage and limits](evidence/mvp-discovery-browser.json). Synthetic loopback PostgreSQL only; no hosted migration/provider activation.

| Route / action | Verified behavior | Limits |
| --- | --- | --- |
| `/account/comparisons` | User list/empty state/navigation; guest denied; native bounded owner pagination. Browser save/reload. | Hosted discovery package pending. |
| `/account/comparisons/[id]` | Private detail; cross-account Admin 404; ordered matrix/editor; rename/context/invalid selection browser feedback. Native add/remove/delete/CAS/rollback/concurrent winner and archived hiding. | Browser native delete dialog timed out; automated confirmation behavior and native delete pass. |
| `/compare` | Anonymous matrix/context/shortlist retained; authenticated save editor adds account-backed persistence. Unknown facts preserved. | Reviewed full fact/fit inputs still incomplete; no invented recommendation. |
| `/account/following` | User list/type filter/unfollow/visibility; guest denial. Actual browser Tool follow/count/list/unfollow/zero state. Native six kinds/duplicates/privacy/isolation and transactional notices. | Other target controls are service/HTTP-verified, not individually browser-clicked. |
| `/tools/[slug]`, `/skills/[slug]`, `/playbooks/[slug]`, `/events/[slug]`, `/@handle`, `/industries/[slug]` | Shared follow control and view instrumentation; strict public target validation. | Industry rows must actually exist in approved taxonomy; no invented target. Hosted dependencies pending. |
| Directories and Resource Pages | Scoped selected-filter/search/view beacons; verified Resource self/Skill/Playbook relationships. HTTP actual related Skill campaign passes. | No external traffic/conversion/affiliate attribution claim. |
| `/api/analytics` POST | Same-origin 204 valid, 403 foreign origin, 400 invalid/PII/forged save/raw search/unknown target/unrelated campaign, 413 >4-KB body; signed HTTP-only session, DNT no-cookie/no-event, dedup. | Browser requests are not proof of unique/human activity; private recording config pending. |
| Saves, Stack additions, outbound and download actions | Record only actual accepted mutation/new membership and validated canonical destinations; native duplicate/isolation/rollback pass. | Actual private Storage/scanner downloads/provider tests pending. |
| `/creator/analytics`, `/vendor/tools/[id]/analytics`, `/admin/analytics` | HTTP actual aggregate/status pages, ordinary User denial, wrong-Tool Vendor denial. Native scoped aggregate/privacy/retention/audit/cleanup. | Not individually visually verified; no fabricated stats or hosted/provider acceptance. No cleanup scheduler. |

The remaining sections record the **11 October route audit** unchanged; comparisons/follows/analytics gaps in that dated table are superseded by the working increment above.

Synthetic loopback fixture only. 119/119 HTTP checks PASS; no hosted connection. Transport 200 can contain Next streamed redirect/not-found: effective statuses below follow those signals. HTTP PASS is render/routing/denial evidence, not complete mutation or accessibility coverage.

Every filesystem page pattern is listed below; individual HTTP observations follow. Separate native/service/browser evidence is described rather than inferred from a GET.

| Page pattern | HTTP observations | Mutation/interaction evidence and limits |
| --- | --- | --- |
| / | 1 bounded PASS observations | Public navigation/catalog/content contracts; GET/redirect or empty-state route check. No all-action browser claim. |
| /[creator] | 1 bounded PASS observations | Content/native published profile/campaign/public Stack guards; actual @handle publication browser journey. |
| /[creator]/[resource] | 2 bounded PASS observations | Content/native published profile/campaign/public Stack guards; actual @handle publication browser journey. |
| /account | 3 bounded PASS observations | Account/engagement/content/commerce contracts/native: owner isolation, saves/Stacks/review/profile/notices/billing; representative User browser actions. |
| /account/activity | 2 bounded PASS observations | Account/engagement/content/commerce contracts/native: owner isolation, saves/Stacks/review/profile/notices/billing; representative User browser actions. |
| /account/billing | 2 bounded PASS observations | Account/engagement/content/commerce contracts/native: owner isolation, saves/Stacks/review/profile/notices/billing; representative User browser actions. |
| /account/profile | 2 bounded PASS observations | Account/engagement/content/commerce contracts/native: owner isolation, saves/Stacks/review/profile/notices/billing; representative User browser actions. |
| /account/stacks/[id] | 2 bounded PASS observations | Account/engagement/content/commerce contracts/native: owner isolation, saves/Stacks/review/profile/notices/billing; representative User browser actions. |
| /account/submissions | 2 bounded PASS observations | Account/engagement/content/commerce contracts/native: owner isolation, saves/Stacks/review/profile/notices/billing; representative User browser actions. |
| /admin | 3 bounded PASS observations | Admin/review/content/native contracts: canonical authority, transition/reason/audit; provider/hosted package gates remain. |
| /admin/[queue] | 7 bounded PASS observations | Admin/review/content/native contracts: canonical authority, transition/reason/audit; provider/hosted package gates remain. |
| /admin/analytics | 1 bounded PASS observations | Admin/review/content/native contracts: canonical authority, transition/reason/audit; provider/hosted package gates remain. |
| /admin/audit | 1 bounded PASS observations | Admin/review/content/native contracts: canonical authority, transition/reason/audit; provider/hosted package gates remain. |
| /admin/commerce/[section] | 4 bounded PASS observations | Commerce contracts/native: prices, paid requests, sandbox idempotency, subscriptions; real Stripe gated. |
| /admin/content/[kind] | 5 bounded PASS observations | Content contracts/native: author/Admin, ownership, revision, moderation, rollback; representative browser resource publication. |
| /admin/content/[kind]/[id] | 3 bounded PASS observations | Content contracts/native: author/Admin, ownership, revision, moderation, rollback; representative browser resource publication. |
| /admin/featured | 1 bounded PASS observations | Admin/review/content/native contracts: canonical authority, transition/reason/audit; provider/hosted package gates remain. |
| /admin/files | 1 bounded PASS observations | Admin/review/content/native contracts: canonical authority, transition/reason/audit; provider/hosted package gates remain. |
| /admin/profiles | 1 bounded PASS observations | Admin/review/content/native contracts: canonical authority, transition/reason/audit; provider/hosted package gates remain. |
| /admin/reports | 1 bounded PASS observations | Admin/review/content/native contracts: canonical authority, transition/reason/audit; provider/hosted package gates remain. |
| /admin/taxonomy | 1 bounded PASS observations | Admin/review/content/native contracts: canonical authority, transition/reason/audit; provider/hosted package gates remain. |
| /admin/tools | 2 bounded PASS observations | Admin contracts/native: Tool create/edit/lifecycle/taxonomy/trust/ranking, revision/rollback; browser overview/review. |
| /admin/tools/[id] | 1 bounded PASS observations | Admin contracts/native: Tool create/edit/lifecycle/taxonomy/trust/ranking, revision/rollback; browser overview/review. |
| /admin/tools/[id]/preview | 1 bounded PASS observations | Admin contracts/native: Tool create/edit/lifecycle/taxonomy/trust/ranking, revision/rollback; browser overview/review. |
| /admin/tools/new | 1 bounded PASS observations | Admin contracts/native: Tool create/edit/lifecycle/taxonomy/trust/ranking, revision/rollback; browser overview/review. |
| /categories/[slug] | 1 bounded PASS observations | Public navigation/catalog/content contracts; GET/redirect or empty-state route check. No all-action browser claim. |
| /claim/[slug] | 1 bounded PASS observations | Review/commerce/placement contracts/native; actual providers gated, payment grants no editorial/capability/rank. |
| /collections | 1 bounded PASS observations | Public navigation/catalog/content contracts; GET/redirect or empty-state route check. No all-action browser claim. |
| /collections/[id] | 1 bounded PASS observations | Content/native published profile/campaign/public Stack guards; actual @handle publication browser journey. |
| /compare | 2 bounded PASS observations | Catalog/comparison/pagination/engagement/native tests; browser preview/save/review/compare. Durable comparison/complete fit model incomplete. |
| /confirm-email | 1 bounded PASS observations | Password/candidate UI/session negative tests; synthetic password browser login only. Hosted candidate/provider inactive. |
| /creator | 2 bounded PASS observations | Creator/content/native: approved author, profile/suspension, moderated publication and scoped aggregates. |
| /creator/analytics | 1 bounded PASS observations | Creator/content/native: approved author, profile/suspension, moderated publication and scoped aggregates. |
| /creator/content/[kind] | 5 bounded PASS observations | Content contracts/native: author/Admin, ownership, revision, moderation, rollback; representative browser resource publication. |
| /creator/content/[kind]/[id] | 4 bounded PASS observations | Content contracts/native: author/Admin, ownership, revision, moderation, rollback; representative browser resource publication. |
| /creators | 3 bounded PASS observations | Creator/content/native: approved author, profile/suspension, moderated publication and scoped aggregates. |
| /creators/apply | 2 bounded PASS observations | Creator/content/native: approved author, profile/suspension, moderated publication and scoped aggregates. |
| /events | 1 bounded PASS observations | Content/native publication/privacy/ordered steps/context and outbound contracts; detail HTTP. |
| /events/[slug] | 1 bounded PASS observations | Content/native publication/privacy/ordered steps/context and outbound contracts; detail HTTP. |
| /explore | 1 bounded PASS observations | Public navigation/catalog/content contracts; GET/redirect or empty-state route check. No all-action browser claim. |
| /featured | 1 bounded PASS observations | Review/commerce/placement contracts/native; actual providers gated, payment grants no editorial/capability/rank. |
| /featured/manage | 2 bounded PASS observations | Review/commerce/placement contracts/native; actual providers gated, payment grants no editorial/capability/rank. |
| /for-vendors | 1 bounded PASS observations | Public navigation/catalog/content contracts; GET/redirect or empty-state route check. No all-action browser claim. |
| /forgot-password | 1 bounded PASS observations | Password/candidate UI/session negative tests; synthetic password browser login only. Hosted candidate/provider inactive. |
| /industries | 1 bounded PASS observations | Public navigation/catalog/content contracts; GET/redirect or empty-state route check. No all-action browser claim. |
| /industries/[slug] | 1 bounded PASS observations | Public navigation/catalog/content contracts; GET/redirect or empty-state route check. No all-action browser claim. |
| /knowledge | 1 bounded PASS observations | Public navigation/catalog/content contracts; GET/redirect or empty-state route check. No all-action browser claim. |
| /login | 1 bounded PASS observations | Password/candidate UI/session negative tests; synthetic password browser login only. Hosted candidate/provider inactive. |
| /playbooks | 1 bounded PASS observations | Content/native publication/privacy/ordered steps/context and outbound contracts; detail HTTP. |
| /playbooks/[slug] | 1 bounded PASS observations | Content/native publication/privacy/ordered steps/context and outbound contracts; detail HTTP. |
| /pricing | 1 bounded PASS observations | Review/commerce/placement contracts/native; actual providers gated, payment grants no editorial/capability/rank. |
| /register | 1 bounded PASS observations | Password/candidate UI/session negative tests; synthetic password browser login only. Hosted candidate/provider inactive. |
| /reset-password | 1 bounded PASS observations | Password/candidate UI/session negative tests; synthetic password browser login only. Hosted candidate/provider inactive. |
| /search | 1 bounded PASS observations | Public navigation/catalog/content contracts; GET/redirect or empty-state route check. No all-action browser claim. |
| /skills | 3 bounded PASS observations | Content/native publication/privacy/ordered steps/context and outbound contracts; detail HTTP. |
| /skills/[slug] | 1 bounded PASS observations | Content/native publication/privacy/ordered steps/context and outbound contracts; detail HTTP. |
| /subcategories/[slug] | 3 bounded PASS observations | Public navigation/catalog/content contracts; GET/redirect or empty-state route check. No all-action browser claim. |
| /submit | 1 bounded PASS observations | Review/commerce/placement contracts/native; actual providers gated, payment grants no editorial/capability/rank. |
| /submit/tool | 2 bounded PASS observations | Review/commerce/placement contracts/native; actual providers gated, payment grants no editorial/capability/rank. |
| /tools | 1 bounded PASS observations | Catalog/comparison/pagination/engagement/native tests; browser preview/save/review/compare. Durable comparison/complete fit model incomplete. |
| /tools/[slug] | 2 bounded PASS observations | Catalog/comparison/pagination/engagement/native tests; browser preview/save/review/compare. Durable comparison/complete fit model incomplete. |
| /use-cases/[slug] | 1 bounded PASS observations | Public navigation/catalog/content contracts; GET/redirect or empty-state route check. No all-action browser claim. |
| /vendor | 3 bounded PASS observations | Vendor/review/commerce/native: current Tool ownership, requests/payment separation; browser owned inventory. |
| /vendor/tools/[id] | 2 bounded PASS observations | Vendor/review/commerce/native: current Tool ownership, requests/payment separation; browser owned inventory. |
| /vendor/tools/[id]/analytics | 1 bounded PASS observations | Vendor/review/commerce/native: current Tool ownership, requests/payment separation; browser owned inventory. |

## API/handler coverage

| Route | Verified boundary | Remaining gap |
| --- | --- | --- |
| /api/auth/login | Actual local HTTP/browser synthetic password login, Next origin regressions, password/session tests | Hosted Supabase candidate activation/provider testing excluded |
| /api/auth/logout | Password/candidate cookie clearing and UI/session contracts; origin helper regression | No real hosted session revocation claim |
| /api/auth/register, recover, resend, reset | Inactive candidate request/UI/recovery/replay/identity tests | Real accounts/mail and provider settings not authorized |
| /auth/callback, /auth/confirm | State/verifier/type/session/replay/unsafe callback contracts | Actual delivered provider link not verified |
| /api/billing/webhook | Synthetic reconciliation/live-mode rejection/idempotency/ownership/payment separation native tests | Real Stripe signature/event execution gated |
| /outbound/[kind]/[slug] | Actual same-origin 303/cross-origin 403 for Tools/Events/resources; native concurrent counters/URL validation | example.invalid destinations not followed; affiliate model missing |
| /resource-upload, /admin/resource-upload | File owner/Admin/size/type/scanner/rollback provider-adapter contracts and native metadata | Real private bucket/engine/browser-enabled upload unavailable |
| /resources/download/[id] | Native clean/published/account access and signed provider-adapter contract | Real Storage signed URL/download behavior unverified |

## Individual HTTP observations

IDs below are synthetic. Their record bodies/cookies/connection strings are absent. Status 307 denotes intentional navigation or denied-workspace redirect, 404 denotes unavailable/private/cross-account content, 303 outbound is validated without following the external destination, 403 rejects cross-origin requests.

| Route | Identity/scenario | Effective status | Result |
| --- | --- | --- | --- |
| /account/activity | synthetic-admin-creator-vendor | 200 | PASS |
| /account/billing | synthetic-admin-creator-vendor | 200 | PASS |
| /account | synthetic-admin-creator-vendor | 200 | PASS |
| /account/profile | synthetic-admin-creator-vendor | 200 | PASS |
| /account/stacks/32e93aad-9d1a-44a1-a718-b95f312c8ad9 | synthetic-admin-creator-vendor | 404 | PASS |
| /account/submissions | synthetic-admin-creator-vendor | 200 | PASS |
| /admin/analytics | synthetic-admin-creator-vendor | 200 | PASS |
| /admin/audit | synthetic-admin-creator-vendor | 200 | PASS |
| /admin/commerce/payments | synthetic-admin-creator-vendor | 200 | PASS |
| /admin/commerce/subscriptions | synthetic-admin-creator-vendor | 200 | PASS |
| /admin/commerce/submissions | synthetic-admin-creator-vendor | 200 | PASS |
| /admin/commerce/pricing | synthetic-admin-creator-vendor | 200 | PASS |
| /admin/content/skills | synthetic-admin-creator-vendor | 200 | PASS |
| /admin/content/playbooks | synthetic-admin-creator-vendor | 200 | PASS |
| /admin/content/events | synthetic-admin-creator-vendor | 200 | PASS |
| /admin/content/resources | synthetic-admin-creator-vendor | 200 | PASS |
| /admin/content/skills/f6ef4166-6883-4cfb-aad7-60125d4732cb | synthetic-admin-creator-vendor | 200 | PASS |
| /admin/content/playbooks/f47b41bb-9265-4198-9613-91fa30774f27 | synthetic-admin-creator-vendor | 200 | PASS |
| /admin/content/events/fabe1ee8-7b99-41a6-a549-213636834d0f | synthetic-admin-creator-vendor | 200 | PASS |
| /admin/featured | synthetic-admin-creator-vendor | 200 | PASS |
| /admin/files | synthetic-admin-creator-vendor | 200 | PASS |
| /admin | synthetic-admin-creator-vendor | 200 | PASS |
| /admin/profiles | synthetic-admin-creator-vendor | 200 | PASS |
| /admin/reports | synthetic-admin-creator-vendor | 200 | PASS |
| /admin/taxonomy | synthetic-admin-creator-vendor | 200 | PASS |
| /admin/tools/new | synthetic-admin-creator-vendor | 200 | PASS |
| /admin/tools | synthetic-admin-creator-vendor | 200 | PASS |
| /admin/tools/e26913a2-955d-4791-afd4-42744e63449c | synthetic-admin-creator-vendor | 200 | PASS |
| /admin/tools/e26913a2-955d-4791-afd4-42744e63449c/preview | synthetic-admin-creator-vendor | 200 | PASS |
| /admin/reviews | synthetic-admin-creator-vendor | 200 | PASS |
| /admin/claims | synthetic-admin-creator-vendor | 200 | PASS |
| /admin/creators | synthetic-admin-creator-vendor | 200 | PASS |
| /admin/edits | synthetic-admin-creator-vendor | 200 | PASS |
| /admin/verification | synthetic-admin-creator-vendor | 200 | PASS |
| /admin/disputes | synthetic-admin-creator-vendor | 200 | PASS |
| /admin/capabilities | synthetic-admin-creator-vendor | 200 | PASS |
| /categories/chatbots-assistants-and-copilots | synthetic-admin-creator-vendor | 307 | PASS |
| /claim/acceptance-tool-1 | synthetic-admin-creator-vendor | 200 | PASS |
| /collections | synthetic-admin-creator-vendor | 307 | PASS |
| /collections/32e93aad-9d1a-44a1-a718-b95f312c8ad9 | synthetic-admin-creator-vendor | 404 | PASS |
| /compare | synthetic-admin-creator-vendor | 200 | PASS |
| /confirm-email | synthetic-admin-creator-vendor | 307 | PASS |
| /creator/analytics | synthetic-admin-creator-vendor | 200 | PASS |
| /creator/content/skills | synthetic-admin-creator-vendor | 200 | PASS |
| /creator/content/playbooks | synthetic-admin-creator-vendor | 200 | PASS |
| /creator/content/events | synthetic-admin-creator-vendor | 200 | PASS |
| /creator/content/resources | synthetic-admin-creator-vendor | 200 | PASS |
| /creator/content/skills/f6ef4166-6883-4cfb-aad7-60125d4732cb | synthetic-admin-creator-vendor | 200 | PASS |
| /creator/content/playbooks/new | synthetic-admin-creator-vendor | 200 | PASS |
| /creator/content/resources/new | synthetic-admin-creator-vendor | 200 | PASS |
| /creator/content/events/new | synthetic-admin-creator-vendor | 200 | PASS |
| /creator | synthetic-admin-creator-vendor | 200 | PASS |
| /creators/apply | synthetic-admin-creator-vendor | 200 | PASS |
| /creators | synthetic-admin-creator-vendor | 200 | PASS |
| /events | synthetic-admin-creator-vendor | 200 | PASS |
| /events/acceptance-event | synthetic-admin-creator-vendor | 200 | PASS |
| /explore | synthetic-admin-creator-vendor | 307 | PASS |
| /featured/manage | synthetic-admin-creator-vendor | 200 | PASS |
| /featured | synthetic-admin-creator-vendor | 200 | PASS |
| /for-vendors | synthetic-admin-creator-vendor | 200 | PASS |
| /forgot-password | synthetic-admin-creator-vendor | 307 | PASS |
| /industries | synthetic-admin-creator-vendor | 200 | PASS |
| /industries/creators-influencers-and-solopreneurs | synthetic-admin-creator-vendor | 200 | PASS |
| /knowledge | synthetic-admin-creator-vendor | 307 | PASS |
| /login | synthetic-admin-creator-vendor | 200 | PASS |
| / | synthetic-admin-creator-vendor | 200 | PASS |
| /playbooks | synthetic-admin-creator-vendor | 200 | PASS |
| /playbooks/acceptance-playbook | synthetic-admin-creator-vendor | 200 | PASS |
| /pricing | synthetic-admin-creator-vendor | 200 | PASS |
| /register | synthetic-admin-creator-vendor | 200 | PASS |
| /reset-password | synthetic-admin-creator-vendor | 307 | PASS |
| /search | synthetic-admin-creator-vendor | 200 | PASS |
| /skills | synthetic-admin-creator-vendor | 200 | PASS |
| /skills/acceptance-skill | synthetic-admin-creator-vendor | 200 | PASS |
| /subcategories/general-ai-chat-assistants | synthetic-admin-creator-vendor | 307 | PASS |
| /submit | synthetic-admin-creator-vendor | 200 | PASS |
| /submit/tool | synthetic-admin-creator-vendor | 200 | PASS |
| /tools | synthetic-admin-creator-vendor | 200 | PASS |
| /tools/acceptance-tool-1 | synthetic-admin-creator-vendor | 200 | PASS |
| /use-cases/find-the-best-ai-tool-for-a-specific-task | synthetic-admin-creator-vendor | 307 | PASS |
| /vendor | synthetic-admin-creator-vendor | 200 | PASS |
| /vendor/tools/e26913a2-955d-4791-afd4-42744e63449c/analytics | synthetic-admin-creator-vendor | 200 | PASS |
| /vendor/tools/e26913a2-955d-4791-afd4-42744e63449c | synthetic-admin-creator-vendor | 200 | PASS |
| /@acceptance-creator | synthetic-admin-creator-vendor | 200 | PASS |
| /@acceptance-creator/not-published | synthetic-admin-creator-vendor | 404 | PASS |
| /account | ordinary-user | 200 | PASS |
| /account/profile | ordinary-user | 200 | PASS |
| /account/activity | ordinary-user | 200 | PASS |
| /account/billing | ordinary-user | 200 | PASS |
| /account/submissions | ordinary-user | 200 | PASS |
| /creators/apply | ordinary-user | 200 | PASS |
| /vendor | ordinary-user | 200 | PASS |
| /submit/tool | ordinary-user | 200 | PASS |
| /featured/manage | ordinary-user | 200 | PASS |
| /admin | ordinary-user-denial | 307 | PASS |
| /admin/tools | ordinary-user-denial | 307 | PASS |
| /admin/content/skills | ordinary-user-denial | 307 | PASS |
| /creator/content/skills | ordinary-user-denial | 307 | PASS |
| /vendor/tools/e26913a2-955d-4791-afd4-42744e63449c | ordinary-user-denial | 307 | PASS |
| /admin | anonymous-denial | 307 | PASS |
| /account | anonymous-denial | 307 | PASS |
| /creator | anonymous-denial | 307 | PASS |
| /vendor | anonymous-denial | 307 | PASS |
| /skills?q=not-a-match | public-empty-filter | 200 | PASS |
| /skills?category=CAT-01 | public-context-filter | 200 | PASS |
| /compare?tools=acceptance-tool-1,acceptance-tool-2&category=CAT-01 | public-comparison | 200 | PASS |
| /tools/not-published | public-unavailable | 404 | PASS |
| /creators?category=CAT-01 | creator-context-filter | 200 | PASS |
| /creators?industry=VER-01 | creator-empty-context-filter | 200 | PASS |
| /subcategories/knowledge-base-assistants | ambiguous-historical-subcategory | 404 | PASS |
| /subcategories/knowledge-base-assistants?category=CAT-01 | explicit-parent-subcategory | 307 | PASS |
| /account/stacks/32e93aad-9d1a-44a1-a718-b95f312c8ad9 | ordinary-user-owned-stack | 200 | PASS |
| /@acceptance-creator/acceptance-resource | public-published-resource | 200 | PASS |
| /outbound/tools/acceptance-tool-1 | same-origin-outbound | 303 | PASS |
| /outbound/tools/acceptance-tool-1 | cross-origin-denial | 403 | PASS |
| /outbound/events/acceptance-event | same-origin-outbound | 303 | PASS |
| /outbound/events/acceptance-event | cross-origin-denial | 403 | PASS |
| /outbound/resources/acceptance-resource | same-origin-outbound | 303 | PASS |
| /outbound/resources/acceptance-resource | cross-origin-denial | 403 | PASS |

Source: [HTTP evidence](evidence/mvp-product-http-acceptance.json), [native scenarios](evidence/mvp-product-native-acceptance.json), [actual browser journeys](evidence/mvp-product-browser-acceptance.json), [corrections and incomplete requirements](MVP_PRODUCT_ACCEPTANCE_AND_UX_RESULT.md).
