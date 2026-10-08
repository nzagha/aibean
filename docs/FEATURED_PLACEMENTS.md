# Featured AI Tools

Owner-approved offer: **$99 USD for five consecutive days**, with admin approval before publishing. USD is the current implementation assumption. Homepage branding and layout are retained.

## Workflow

1. Any signed-in user, creator or vendor selects a real, published directory tool at `/featured/manage`. They provide a public sponsor name, a review note and consent.
2. An admin approves or declines the request in `/admin`. No charge is taken before approval.
3. The applicant pays after approval. The server validates a fixed one-time Stripe test Price for exactly 9900 USD minor units. The price and five-day duration are recorded with the checkout.
4. A signed, reconciled payment webhook activates the placement once. Returning from Checkout alone never activates it. Duplicate payment events cannot extend the dates.
5. Homepage queries show only paid, active, unexpired placements for published, non-demo tools. The end boundary is exclusive; no scheduled task is required. Every active purchase gets a card, ordered by start date and ID. The homepage is dynamic to avoid a stale static build retaining expired ads.

One open request or unexpired placement per tool is enforced in the application transaction under a tool row lock. Admins can pause active placements, with the decision recorded in audit history. Organic ranking, ownership, verification and reviews are unaffected.

## Setup and limits

Run `npm run db:migrate` to apply `0001_hesitant_hardball.sql` after setting up PostgreSQL. Configure Clerk, the existing Stripe test key/webhook secret and `STRIPE_FEATURED_PRICE_ID`. That Price must be active, one-time, **$99 USD**, in test mode. Featured checkout does not depend on the claim price. Enable checkout completion and async payment-success events on `/api/billing/webhook`.

Checkout reuses an open session; expired sessions get a new attempt with its own idempotency key. Applicant ownership, admin permissions and price are checked on the server. Test payments only: live keys remain disabled. Connected Clerk/Stripe/Postgres end-to-end verification, refunds/disputes, operational payment recovery and launch approval remain required before accepting real money. A payment confirmed after a tool becomes ineligible is recorded as suspended for admin resolution.

The default local preview uses clearly labeled fictional cards, never claims they are paying advertisers, and offers no fake purchase success. Sources: [Stripe fulfillment](https://docs.stripe.com/checkout/fulfillment) and the installed Next.js Server Actions guide.
