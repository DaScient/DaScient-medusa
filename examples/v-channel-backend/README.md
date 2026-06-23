# V-Channel × Medusa backend

A reference Medusa v2 backend that powers **identity, entitlements, payments,
subscriptions, and analytics** for [V-Channel](https://github.com/v-channel) — a
premium, monetizable platform for creators, celebrities, and influencers.

> **What this is.** A self-contained, *liftable* scaffold that implements the
> 6-phase integration plan. Per **Phase 0.3**, you should **not** fork or modify
> the Medusa monorepo. Instead, create a fresh app with
> `npx create-medusa-app@latest v-channel-backend` and copy the `src/`,
> `medusa-config.ts`, `package.json` deps, and `.env.template` from here into it.
> The `frontend/` folder holds snippets for your existing Next.js app on Vercel.

> **Proprietary documentation.** The full specification of this protocol — the
> **V-Channel Commerce & Entitlement Protocol (VCEP)** — is in
> [`docs/`](./docs/README.md). It is a V-Channel, Inc. Proprietary Intellectual
> Artifact prepared under the DaScient Full-Stack Development Framework by
> DaScient, Inc. (June 23, 2026; all rights reserved). See
> [`docs/00-legal-notice.md`](./docs/00-legal-notice.md).

## Division of responsibilities

| Concern | Owner |
| --- | --- |
| Auth / identity (fans + creators) | **Medusa** (`auth` + emailpass/google/github) |
| Membership tiers & content gating | **Medusa** (`membership` module + customer groups) |
| PPV one-time purchases | **Medusa** (`product` + `order` + Stripe) |
| Recurring subscriptions ($9 / $49) | **Medusa `subscription` module → Stripe Billing** |
| Creator payouts | **Stripe Connect** (via `creator-profile`) |
| Newsletters / transactional email | **Medusa** (`notification` → SendGrid) |
| Media storage | **Medusa** (`file` → S3 + CDN) |
| Analytics / revenue dashboard | **Medusa** (`analytics` → PostHog) + frontend PostHog |
| CMS (articles / videos / podcasts) | **Your CMS / Next.js** (links to Medusa IDs) |
| Comments, social sharing | **Next.js** (author = Medusa `customer_id`) |
| Programmatic ads | **Next.js** (ad-free when entitlement says so) |
| SEO, SSR/SSG pages | **Next.js on Vercel** |

Medusa is a long-running Node server with Postgres + Redis and **cannot run on
Vercel serverless**. Host it separately (Medusa Cloud, Railway, Render, or a
container host); the Next.js app stays on Vercel and talks to it over the
Store/Admin APIs + JS SDK.

---

## Phase 0 — Architecture

```
                      ┌────────────────────────┐
   Vercel (Next.js)   │  V-Channel frontend     │
   SSR/SSG + CMS      │  - content, SEO, ads    │
                      │  - comments, sharing    │
                      └───────────┬────────────┘
                                  │ JS SDK / REST (+ JWT)
                                  ▼
                      ┌────────────────────────┐
   Persistent host    │  Medusa backend (this)  │──► Stripe (Billing + Connect)
   Postgres + Redis   │  auth, membership,      │──► SendGrid
                      │  subscription, orders,  │──► S3 / CDN
                      │  analytics, file        │──► PostHog
                      └────────────────────────┘
```

Premium content stores the Medusa product/tier id as a reference; the frontend
calls `GET /store/entitlements` to decide free vs. gated.

## Phase 1 — Stand up the backend

1. `npx create-medusa-app@latest v-channel-backend` and copy this scaffold in.
2. Copy `.env.template` → `.env` and fill in Postgres, Redis, and provider keys.
3. Install deps, run migrations, seed, start:

   ```bash
   yarn install
   npx medusa db:migrate
   yarn seed
   yarn dev
   ```

`medusa-config.ts` enables the Redis-backed `cache`, `event-bus`,
`workflow-engine`, and `locking` modules for production, plus the Stripe,
SendGrid, S3, PostHog, and emailpass/google/github providers.

## Phase 2 — V-Channel concepts mapped onto Medusa

- **Membership tiers** (`src/modules/membership`): `MembershipTier` rows for
  reader/subscriber/creator, each linked to a **customer group** (gating) and a
  Stripe price. `Membership` rows track each customer's active tier.
- **PPV events**: model each as a one-time Product; a completed `order` is the
  entitlement — check it before serving the stream.
- **Subscriptions** (`src/modules/subscription`): bridges to **Stripe Billing**.
  Stripe is the source of truth; webhooks reconcile local state and move the
  customer between tiers/groups.
- **Creator profiles** (`src/modules/creator-profile`): extends the customer via
  a **module link** (`src/links`) with slug, bio, and a Stripe Connect account
  for payouts — without modifying the core `customer` module.

## Phase 3 — Custom modules & workflows

```
src/
├── modules/
│   ├── membership/        # tiers + memberships (MedusaService pattern)
│   ├── subscription/      # Stripe Billing bridge (stripe-billing.ts)
│   └── creator-profile/   # creator metadata + Connect
├── workflows/
│   ├── grant-entitlement.ts          # on purchase / activation
│   ├── revoke-entitlement.ts         # on cancel / unpaid
│   ├── sync-subscription-status.ts   # reconcile from Stripe, then grant/revoke
│   └── steps/                        # each mutating step has compensation
├── api/
│   ├── store/entitlements/route.ts   # entitlement-check endpoint (Phase 3.4)
│   ├── store/memberships/route.ts    # list tiers + start checkout
│   ├── admin/creators/route.ts       # creator management
│   ├── hooks/stripe/route.ts         # Stripe webhook receiver
│   └── middlewares.ts                # raw body for webhook verification
├── subscribers/
│   └── subscription-events.ts        # runs sync workflow off webhook events
├── links/
│   └── customer-creator-profile.ts   # customer ↔ creator_profile link
└── scripts/seed.ts                   # region, currency, sales channel, tiers
```

All mutating workflow steps define compensation functions, so a mid-flow failure
rolls back cleanly (pattern borrowed from `core-flows/promotion`).

### Entitlement check

`GET /store/entitlements?required_tier=subscriber`

```json
{
  "authenticated": true,
  "tier": "subscriber",
  "has_access": true,
  "capabilities": { "ad_free": true, "can_publish": false }
}
```

## Phase 4 — Connect the frontend

See [`frontend/README.md`](./frontend/README.md). Highlights: JS SDK client,
SSR gating via `getEntitlement()`, auth helpers, newsletter signup, and PostHog
event capture.

## Phase 5 — Community, ads, SEO (outside Medusa)

Built in Next.js. Use the entitlement response's `customer_id` for comment
identity and `capabilities.ad_free` to suppress ads for paying members. SEO and
rendering are entirely Next.js concerns.

## Phase 6 — Deploy & operate

1. **Frontend**: Vercel (as today).
2. **Backend**: persistent host with Postgres + Redis. Run a **separate worker
   instance** with `MEDUSA_WORKER_MODE=worker` for the Redis workflow engine; the
   server instance runs with `MEDUSA_WORKER_MODE=server`.
3. **Stripe webhooks**: point `https://api.v-channel.com/hooks/stripe` at the
   endpoint and set `STRIPE_WEBHOOK_SECRET`. Subscribe to
   `customer.subscription.*`, `invoice.paid`, `invoice.payment_failed`.
4. **CORS & secrets**: set `STORE_CORS`/`ADMIN_CORS`/`AUTH_CORS` to your Vercel
   and admin origins and generate strong `JWT_SECRET` / `COOKIE_SECRET`.
5. **Media**: serve S3 behind the CDN configured in `S3_FILE_URL`.

---

### Production checklist

- [ ] Postgres + Redis provisioned and reachable.
- [ ] Stripe Billing prices created; `STRIPE_PRICE_SUBSCRIBER` / `_CREATOR` set.
- [ ] Stripe webhook endpoint registered; secret configured.
- [ ] Tiers seeded and each tier's `product_id` / `stripe_price_id` populated.
- [ ] Worker instance deployed separately from the server instance.
- [ ] CORS origins and JWT/cookie secrets set for production.
- [ ] PostHog, SendGrid, S3 credentials verified.
