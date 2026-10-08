# Billing workflow — test-only claim slice

Operator configures a one-time Stripe test Price ID, test secret key, webhook secret and canonical application origin. Fees are not invented. The server retrieves price/currency, creates an internal claim/order, then creates checkout using the internal order ID as its idempotency key.

Signed paid checkout events reconcile order ID, amount, currency and session. A transactional webhook receipt prevents duplicate processing. Confirmed payment changes the claim to pending_review. It never grants Vendor access. Admin approval inserts the unique vendor owner and audit record in one transaction; competing ownership attempts fail at the database constraint.

Rejected claims remain paid but not approved. Refunds are not automatic. Claims can still need operational recovery when checkout creation fails or a user abandons checkout. Do not accept live payments until retry/recovery, cancellation/expiry, refunds, disputes, revocation, subscription state machines and end-to-end webhook tests are complete. This boundary is enforced: sk_live keys do not enable billing.

Provider references: https://docs.stripe.com/checkout/fulfillment and https://docs.stripe.com/api/idempotent_requests
