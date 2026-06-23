# 09 — Deployment & Operations

**Part of:** VCEP Documentation Package · Edition June 23, 2026
**Classification:** V-Channel, Inc. Proprietary Intellectual Artifact

---

## 1. Stand up the backend (Phase 1)

The Protocol is **liftable**, not forked. To create a runnable instance:

1. Scaffold a fresh app:
   `npx create-medusa-app@latest v-channel-backend`.
2. Copy this scaffold's `src/`, `medusa-config.ts`, `package.json` dependencies,
   and `.env.template` into it.
3. Copy `.env.template` → `.env` and fill in Postgres, Redis, and provider keys
   ([`07-providers.md`](./07-providers.md)).
4. Install, migrate, seed, run:

   ```bash
   yarn install
   npx medusa db:migrate
   yarn seed
   yarn dev
   ```

`yarn seed` runs [`../src/scripts/seed.ts`](../src/scripts/seed.ts) to create the
region, sales channel, per-tier customer groups, and the three tiers. The
`package.json` scripts are: `build` (`medusa build`), `seed`, `start`
(`medusa start`), `dev` (`medusa develop`), and `predeploy` (`medusa db:migrate`).

## 2. Production process roles (Phase 6)

Run **two instances** sharing the same Postgres + Redis:

| Role | Set | Notes |
| --- | --- | --- |
| Server | `MEDUSA_WORKER_MODE=server` | Serves HTTP + admin dashboard. |
| Worker | `MEDUSA_WORKER_MODE=worker` | Runs the Redis workflow engine + subscribers; admin disabled. |

This split is honored in [`../medusa-config.ts`](../medusa-config.ts) (admin is
disabled when the mode is `worker`).

## 3. Hosting

- **Frontend:** Vercel (unchanged from today).
- **Backend:** a persistent host with Postgres + Redis — Medusa Cloud, Railway,
  Render, or a container host. Medusa is a long-running server and **cannot run
  on Vercel serverless**.

## 4. Stripe webhooks

1. Point `https://api.v-channel.com/hooks/stripe` at the deployed server.
2. Set `STRIPE_WEBHOOK_SECRET` to the endpoint's signing secret.
3. Subscribe to `customer.subscription.*`, `invoice.paid`,
   `invoice.payment_failed`.

The route verifies every payload against the secret using the raw body
([`06-api-reference.md`](./06-api-reference.md) Section 4.1).

## 5. CORS & secrets

- Set `STORE_CORS` / `ADMIN_CORS` / `AUTH_CORS` to the Vercel app and admin
  origins.
- Generate strong `JWT_SECRET` and `COOKIE_SECRET`
  (`openssl rand -base64 32`). Never ship the placeholder values.

## 6. Media

Serve S3 behind the CDN configured in `S3_FILE_URL`.

## 7. Production checklist

Mirrors the backend README, consolidated here as the operational gate:

- [ ] Postgres + Redis provisioned and reachable.
- [ ] Stripe Billing prices created; `STRIPE_PRICE_SUBSCRIBER` /
      `STRIPE_PRICE_CREATOR` set.
- [ ] Stripe webhook endpoint registered; secret configured.
- [ ] Tiers seeded and each tier's `product_id` / `stripe_price_id` populated.
- [ ] Worker instance deployed separately from the server instance.
- [ ] CORS origins and JWT/cookie secrets set for production.
- [ ] PostHog, SendGrid, S3 credentials verified.

## 8. Day-2 operations

| Task | How |
| --- | --- |
| Add/adjust a tier | Update the tier row (price, group, `stripe_price_id`); ensure the matching Stripe price exists and is in `priceByTier`. |
| Onboard a creator | `POST /admin/creators`, then complete Stripe Connect onboarding and set `payouts_enabled`. |
| Reconcile a stuck subscription | Re-send the Stripe event (or trigger one); the idempotent sync workflow converges state. |
| Rotate a provider key | Update the env var and restart server + worker. |
| Scale | Add server and/or worker instances; Redis locking prevents double-processing. |

## 9. Observability

- **Logs:** the webhook route logs each accepted event
  (`Stripe webhook <type> queued for subscription sync`); the subscriber warns
  on malformed events.
- **Analytics:** PostHog receives both frontend engagement and backend revenue
  events.
- **Health:** monitor the server's HTTP health, worker liveness, Postgres, and
  Redis. A failing worker stalls entitlement reconciliation even while the
  server still serves reads.

## 10. Backup & recovery

- **Postgres** is the only stateful store to back up; restore re-establishes all
  memberships, subscriptions, and creator profiles.
- **Redis** is recoverable — a cold Redis loses in-flight events, but Stripe will
  redeliver webhooks, and reconciliation is idempotent.
- **Stripe** remains the source of truth for billing; a full local rebuild can be
  re-reconciled from Stripe subscriptions.

---

Continue to [10 — Security & Compliance](./10-security-compliance.md).

*V-Channel, Inc. Proprietary Intellectual Artifact — DaScient Full-Stack
Development Framework — June 23, 2026. All rights reserved.*
