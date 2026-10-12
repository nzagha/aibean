CREATE TABLE public.pricing_releases (
 id text PRIMARY KEY,version text NOT NULL UNIQUE,config jsonb NOT NULL CHECK(jsonb_typeof(config)='object'),config_sha256 text NOT NULL CHECK(config_sha256 ~ '^[a-f0-9]{64}$'),
 status text NOT NULL DEFAULT 'proposed' CHECK(status IN ('proposed','reviewed','active','retired')),revision integer NOT NULL DEFAULT 1 CHECK(revision>0),
 created_by text NOT NULL REFERENCES public.users(id),reviewed_by text REFERENCES public.users(id),review_reason text,provider_prices jsonb NOT NULL DEFAULT '{}',activated_at timestamptz,created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(status='proposed' OR reviewed_by IS NOT NULL AND review_reason IS NOT NULL),CHECK(status<>'active' OR activated_at IS NOT NULL)
);
CREATE UNIQUE INDEX one_active_pricing ON public.pricing_releases((true)) WHERE status='active';
CREATE TABLE public.pricing_quotes (
 payment_id text PRIMARY KEY REFERENCES public.billing_transactions(id),user_id text NOT NULL REFERENCES public.users(id),release_id text NOT NULL REFERENCES public.pricing_releases(id),
 plan_id text,interval text CHECK(interval IN ('month','year')),base integer NOT NULL CHECK(base>=0),discount integer NOT NULL CHECK(discount>=0 AND discount<=base),amount integer NOT NULL CHECK(amount=base-discount),
 beneficiary_plans jsonb NOT NULL DEFAULT '[]',config_sha256 text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),CHECK((plan_id IS NULL)=(interval IS NULL))
);
CREATE INDEX pricing_quote_owner ON public.pricing_quotes(user_id,created_at DESC);
CREATE TABLE public.membership_bindings (
 subscription_id text PRIMARY KEY REFERENCES public.commerce_subscriptions(id),user_id text NOT NULL REFERENCES public.users(id),release_id text NOT NULL REFERENCES public.pricing_releases(id),payment_id text NOT NULL UNIQUE REFERENCES public.pricing_quotes(payment_id),
 plan_id text NOT NULL CHECK(plan_id IN ('creator_pro','vendor_pro')),interval text NOT NULL CHECK(interval IN ('month','year')),price_id text NOT NULL,
 paid_from timestamptz,paid_through timestamptz,last_invoice_id text UNIQUE,provider_event_at bigint NOT NULL DEFAULT 0,revision integer NOT NULL DEFAULT 1,
 CHECK((paid_from IS NULL)=(paid_through IS NULL)),CHECK(paid_through IS NULL OR paid_through>paid_from)
);
CREATE INDEX membership_owner ON public.membership_bindings(user_id,plan_id);
CREATE TABLE public.membership_changes (
 id text PRIMARY KEY,subscription_id text NOT NULL REFERENCES public.membership_bindings(subscription_id),user_id text NOT NULL REFERENCES public.users(id),release_id text NOT NULL REFERENCES public.pricing_releases(id),
 plan_id text NOT NULL CHECK(plan_id IN ('creator_pro','vendor_pro')),interval text NOT NULL CHECK(interval IN ('month','year')),price_id text NOT NULL,
 status text NOT NULL DEFAULT 'prepared' CHECK(status IN ('prepared','scheduled','applied')),provider_schedule_id text UNIQUE,expected_revision integer NOT NULL,effective_at timestamptz NOT NULL,created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX one_open_membership_change ON public.membership_changes(subscription_id) WHERE status<>'applied';
CREATE TABLE public.pricing_refunds (
 id text PRIMARY KEY,payment_id text NOT NULL UNIQUE REFERENCES public.billing_transactions(id),user_id text NOT NULL REFERENCES public.users(id),amount integer NOT NULL CHECK(amount>0),
 status text NOT NULL DEFAULT 'requested' CHECK(status IN ('requested','approved','rejected','refunded')),reason text NOT NULL,reviewer_id text REFERENCES public.users(id),review_reason text,provider_refund_id text UNIQUE,revision integer NOT NULL DEFAULT 1,created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(status='requested' OR reviewer_id IS NOT NULL AND review_reason IS NOT NULL),CHECK(status<>'refunded' OR provider_refund_id IS NOT NULL)
);
CREATE INDEX pricing_refund_queue ON public.pricing_refunds(status,created_at,id);
