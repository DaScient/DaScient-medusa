# 07 — Provider Integrations

**Part of:** VCEP Documentation Package · Edition June 23, 2026
**Classification:** V-Channel, Inc. Proprietary Intellectual Artifact

---

All external services are wired through [`../medusa-config.ts`](../medusa-config.ts)
and configured by environment variables defined in
[`../.env.template`](../.env.template). This document explains what each
provider does in VCEP, why it was chosen, and the keys it needs. **No real
secrets appear here or in the template — only placeholders.**

## 1. Infrastructure (Redis-backed) — Phase 1.1

Production-grade Medusa needs Redis so the event bus, workflow engine, cache,
and distributed locks survive horizontal scaling and a separate worker process.

| Module | Resolve | Env |
| --- | --- | --- |
| Cache | `@medusajs/medusa/cache-redis` | `REDIS_URL` |
| Event bus | `@medusajs/medusa/event-bus-redis` | `REDIS_URL` |
| Workflow engine | `@medusajs/medusa/workflow-engine-redis` | `REDIS_URL` |
| Locking | `@medusajs/medusa/locking` + `locking-redis` (default) | `REDIS_URL` |

The event bus is what carries `subscription.stripe_sync` from the webhook route
to the worker subscriber; the workflow engine runs the entitlement workflows;
locking prevents two workers from double-processing the same event.

## 2. Stripe — payments, PPV, subscription billing, payouts

Stripe is the **source of truth** for recurring billing and the payout rail for
creators. VCEP uses it in three ways:

1. **Payments + PPV** via the Medusa `payment` module
   (`@medusajs/medusa/payment-stripe`).
2. **Subscription billing** via the custom `subscription` module bridging to
   Stripe Billing (see [`04-modules.md`](./04-modules.md)).
3. **Creator payouts** via **Stripe Connect** (account id stored on
   `creator_profile`; payout execution delegated to Stripe).

| Env | Meaning |
| --- | --- |
| `STRIPE_API_KEY` | Secret API key (server-side only). |
| `STRIPE_WEBHOOK_SECRET` | Verifies the `/hooks/stripe` signature. |
| `STRIPE_PRICE_SUBSCRIBER` | Stripe Billing price id for the $9 tier. |
| `STRIPE_PRICE_CREATOR` | Stripe Billing price id for the $49 tier. |

The price ids are mapped to tier codes via the subscription module's
`priceByTier` option.

## 3. SendGrid — newsletters & transactional email — Phase 1.2

The Medusa `notification` module with `@medusajs/medusa/notification-sendgrid`
on the `email` channel sends newsletters and transactional messages.

| Env | Meaning |
| --- | --- |
| `SENDGRID_API_KEY` | SendGrid API key. |
| `SENDGRID_FROM` | Verified sender address. |

Frontend newsletter signup ([`08-frontend-integration.md`](./08-frontend-integration.md))
ultimately routes here.

## 4. Amazon S3 — media storage behind a CDN — Phase 1.2

The Medusa `file` module with `@medusajs/medusa/file-s3` stores uploaded media;
files are served through the CDN configured in `S3_FILE_URL`.

| Env | Meaning |
| --- | --- |
| `S3_FILE_URL` | Public CDN base URL for stored files. |
| `S3_BUCKET`, `S3_REGION`, `S3_ENDPOINT` | Bucket location. |
| `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | Credentials. |

## 5. PostHog — analytics & revenue insight — Phase 1.2

The Medusa `analytics` module with `@medusajs/medusa/analytics-posthog` captures
server-side product/revenue events; the frontend also captures engagement events
with `posthog-js`.

| Env | Meaning |
| --- | --- |
| `POSTHOG_API_KEY` | Project key. |
| `POSTHOG_HOST` | PostHog ingestion host. |

## 6. Authentication — emailpass + Google + GitHub — Phase 1.2

The Medusa `auth` module registers three providers so fans and creators can sign
in by email/password or social login:

| Provider | Resolve | Env |
| --- | --- | --- |
| Email/password | `@medusajs/medusa/auth-emailpass` | — |
| Google OAuth | `@medusajs/medusa/auth-google` | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` |
| GitHub OAuth | `@medusajs/medusa/auth-github` | `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_CALLBACK_URL` |

Callback URLs follow `…/auth/customer/<provider>/callback`.

## 7. Core platform configuration

Set in `projectConfig`:

| Env | Meaning |
| --- | --- |
| `DATABASE_URL` | Postgres connection. |
| `REDIS_URL` | Redis connection (shared by all infra modules). |
| `STORE_CORS` / `ADMIN_CORS` / `AUTH_CORS` | Allowed origins (Vercel app + admin). |
| `JWT_SECRET` / `COOKIE_SECRET` | Session secrets — generate with `openssl rand -base64 32`. |
| `MEDUSA_WORKER_MODE` | `server` or `worker` (admin disabled for `worker`). |

## 8. Provider selection rationale (DaScient framework)

- **Stripe** for billing because it offers Billing (subscriptions), Checkout,
  Connect (payouts), and signed webhooks — covering every money concern with one
  vendor and keeping a single source of truth.
- **Redis** for all coordination so the server/worker split scales without a
  bespoke queue.
- **Managed providers** (SendGrid, S3, PostHog) for email, media, and analytics
  so V-Channel owns product, not undifferentiated infrastructure.
- **Multiple auth providers** to reduce signup friction for both fans and
  creators.

---

Continue to [08 — Frontend Integration](./08-frontend-integration.md).

*V-Channel, Inc. Proprietary Intellectual Artifact — DaScient Full-Stack
Development Framework — June 23, 2026. All rights reserved.*
