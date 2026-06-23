# 02 — Architecture

**Part of:** VCEP Documentation Package · Edition June 23, 2026
**Classification:** V-Channel, Inc. Proprietary Intellectual Artifact

---

## 1. Topology

VCEP is a two-tier deployment: a stateless edge (Next.js on Vercel) and a
persistent commerce backend (Medusa with Postgres + Redis). They communicate
over the Medusa Store/Admin APIs and the JS SDK, carrying a customer JWT.

```
                    ┌────────────────────────┐
   Vercel (Next.js) │  V-Channel frontend     │
   SSR/SSG + CMS     │  - content, SEO, ads    │
                    │  - comments, sharing    │
                    └───────────┬────────────┘
                                │ JS SDK / REST (+ JWT)
                                ▼
                    ┌────────────────────────┐
   Persistent host  │  Medusa backend (VCEP) │──► Stripe (Billing + Connect)
   Postgres + Redis  │  auth, membership,     │──► SendGrid
                    │  subscription, orders,  │──► S3 / CDN
                    │  analytics, file        │──► PostHog
                    └────────────────────────┘
```

The Medusa backend is a long-running Node server and **cannot run on Vercel
serverless**. It is hosted separately (Medusa Cloud, Railway, Render, or a
container host). See [`09-deployment-operations.md`](./09-deployment-operations.md).

## 2. Runtime processes

In production, VCEP runs as **two process roles** that share the same database
and Redis:

| Role | `MEDUSA_WORKER_MODE` | Responsibilities |
| --- | --- | --- |
| **Server** | `server` | Serves HTTP (Store/Admin APIs, the Stripe webhook), hosts the admin dashboard. |
| **Worker** | `worker` | Runs the Redis-backed workflow engine and event subscribers. Admin is disabled here. |

This split is configured in [`../medusa-config.ts`](../medusa-config.ts): the
admin is disabled when `MEDUSA_WORKER_MODE === "worker"`. Redis-backed `cache`,
`event-bus`, `workflow-engine`, and `locking` modules let the two roles
coordinate safely under horizontal scaling.

## 3. Layered structure (where each thing lives)

| Layer | Directory | Contents |
| --- | --- | --- |
| Platform & config | [`../medusa-config.ts`](../medusa-config.ts) | Redis infra modules + all providers |
| Domain | [`../src/modules`](../src/modules) | `membership`, `subscription`, `creator-profile` |
| Module links | [`../src/links`](../src/links) | `customer ↔ creator_profile` association |
| Orchestration | [`../src/workflows`](../src/workflows) | grant / revoke / sync workflows + steps |
| Interface | [`../src/api`](../src/api) | Store, Admin, and webhook routes + middleware |
| Eventing | [`../src/subscribers`](../src/subscribers) | Runs the sync workflow off webhook events |
| Seed | [`../src/scripts/seed.ts`](../src/scripts/seed.ts) | Region, sales channel, groups, tiers |
| Frontend helpers | [`../frontend`](../frontend) | JS SDK client, auth, gating, newsletter, analytics |

## 4. The end-to-end request paths

### 4.1 Read path — gating a page (synchronous)

```
Visitor → Next.js getServerSideProps
        → GET /store/entitlements?required_tier=subscriber  (with JWT)
        → MembershipModuleService.resolveTierForCustomer()
        → { authenticated, tier, has_access, capabilities }
        → Next.js renders or redirects to /pricing
```

This path is read-only and fast — safe to call during SSR. See
[`06-api-reference.md`](./06-api-reference.md) Section 2.1.

### 4.2 Write path — buying a subscription (asynchronous reconcile)

```
Customer → POST /store/memberships {tier_code,...}
         → SubscriptionModuleService.startCheckout()
         → Stripe Checkout Session (mode=subscription)
         → customer pays on Stripe
         → Stripe sends webhook → POST /hooks/stripe
         → verify signature → emit "subscription.stripe_sync"
         → subscriber runs syncSubscriptionStatusWorkflow
         → reconcile local subscription → grant or revoke entitlement
```

The HTTP webhook handler does the minimum (verify + emit) and returns quickly;
the heavy lifting happens in the worker via an event subscriber, so Stripe
retries stay safe. See [`05-entitlement-protocol.md`](./05-entitlement-protocol.md).

## 5. Trust boundaries

| Boundary | What crosses it | How it is trusted |
| --- | --- | --- |
| Browser → Next.js | User actions | Standard web session |
| Next.js → Medusa | Customer JWT / publishable key | Medusa auth + CORS allowlist |
| Stripe → Medusa | Webhook payload | **Stripe signature** verified against `STRIPE_WEBHOOK_SECRET` using the raw body |
| Medusa server → worker | Internal events | Redis event bus |
| Medusa → Stripe/SendGrid/S3/PostHog | API calls | Provider API keys from env |

The Stripe webhook route is deliberately **not** under `/admin` or `/store` so
it is reachable without Medusa auth; the Stripe signature *is* the
authentication. Raw-body preservation for that route is configured in
[`../src/api/middlewares.ts`](../src/api/middlewares.ts).

## 6. Architectural ground rules (Phase 0)

1. **Do not fork the Medusa monorepo.** Create a fresh app with
   `npx create-medusa-app@latest v-channel-backend` and copy in `src/`,
   `medusa-config.ts`, `package.json` dependencies, and `.env.template`.
2. **Keep the frontend on Vercel** and the backend on a persistent host.
3. **Reference, don't embed.** Premium content stores the Medusa product/tier ID
   and asks the entitlement endpoint at render time.
4. **One concern, one owner** (see [`01-overview.md`](./01-overview.md) Section 5).

## 7. Scaling characteristics

- **Stateless edge** scales horizontally on Vercel with zero coordination.
- **Server role** scales horizontally behind a load balancer; sessions are
  JWT-based and the cache/locks are in Redis.
- **Worker role** scales by adding instances; the Redis workflow engine
  distributes work and the locking module prevents double-processing.
- **Database** (Postgres) is the single stateful dependency to size and back up.

---

Continue to [03 — Data Model](./03-data-model.md).

*V-Channel, Inc. Proprietary Intellectual Artifact — DaScient Full-Stack
Development Framework — June 23, 2026. All rights reserved.*
