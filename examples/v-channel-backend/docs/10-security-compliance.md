# 10 — Security & Compliance

**Part of:** VCEP Documentation Package · Edition June 23, 2026
**Classification:** V-Channel, Inc. Proprietary Intellectual Artifact

---

## 1. Security model summary

VCEP enforces access decisions **server-side** and treats the frontend as
untrusted. Three distinct trust mechanisms protect three distinct surfaces:

| Surface | Mechanism |
| --- | --- |
| Store/Admin APIs | Medusa customer/admin auth (JWT/session) + CORS allowlist |
| Stripe webhook | Stripe signature verification over the raw body |
| Outbound provider calls | Server-held API keys, never exposed to the browser |

## 2. Authentication & authorization

- **Customers** authenticate via email/password or Google/GitHub OAuth
  ([`07-providers.md`](./07-providers.md) Section 6). The resulting JWT carries
  the customer id used by the entitlement endpoint.
- **Entitlement is computed on the server.** `GET /store/entitlements` derives
  the tier from the authenticated customer; an anonymous request can only ever
  resolve to the free `reader` tier. The frontend cannot elevate its own access.
- **Admin routes** (`/admin/creators`) require an admin session.
- **Gating happens before rendering.** Premium content is gated in
  `getServerSideProps`/Server Components, so protected bodies never reach an
  unauthorized client ([`08-frontend-integration.md`](./08-frontend-integration.md)
  Section 3).

## 3. Webhook integrity

The `/hooks/stripe` route is unauthenticated by Medusa **by design** — Stripe
cannot present a Medusa session. Integrity is guaranteed instead by:

1. **Signature verification.** Every payload is checked against
   `STRIPE_WEBHOOK_SECRET`. Invalid signatures are rejected with `400`.
2. **Raw-body preservation.** [`../src/api/middlewares.ts`](../src/api/middlewares.ts)
   keeps the unparsed body so the signature is computed over exactly what Stripe
   signed. Without this, verification would fail or be bypassable.
3. **Event allowlist.** Only a fixed set of subscription/invoice events is acted
   on; everything else is acknowledged and ignored.

## 4. Secrets handling

- All secrets are injected via environment variables; none are committed. See
  [`../.env.template`](../.env.template), which contains placeholders only.
- `JWT_SECRET` and `COOKIE_SECRET` MUST be strong, unique values in production
  (`openssl rand -base64 32`). The default placeholders MUST NOT ship.
- Provider keys (`STRIPE_API_KEY`, `SENDGRID_API_KEY`, S3 credentials,
  `POSTHOG_API_KEY`, OAuth client secrets) are server-side only and never sent
  to the browser. The frontend uses only the **publishable** key.
- This documentation package contains no live credentials (see
  [`00-legal-notice.md`](./00-legal-notice.md) Section 8).

## 5. CORS

`STORE_CORS`, `ADMIN_CORS`, and `AUTH_CORS` restrict which origins may call the
backend. Production values MUST list only the real Vercel app and admin origins,
never wildcards.

## 6. Data handling & privacy

- **Personal data stored:** customer id (soft reference), email (for Stripe
  customer creation), creator profile fields (slug, display name, bio, avatar).
  Membership and subscription rows hold lifecycle status and period dates, not
  card data.
- **No card data is stored by VCEP.** Stripe handles all payment instruments;
  the Protocol stores only Stripe identifiers (`stripe_customer_id`,
  `stripe_subscription_id`, `stripe_price_id`) and a `stripe_connect_account_id`
  for payouts. This keeps PCI scope with Stripe.
- **Source of truth:** billing state is owned by Stripe; the local mirror can be
  rebuilt by re-reconciliation, limiting the blast radius of local data loss.

## 7. Idempotency & abuse resistance

- Reconciliation is idempotent, so replayed or duplicated webhooks cannot
  corrupt entitlement state.
- The Redis locking module prevents two workers from processing the same event
  simultaneously.
- Checkout requires an authenticated customer, so anonymous actors cannot create
  subscriptions on behalf of others.

## 8. Failure containment

Every mutating workflow step has a compensation function
([`05-entitlement-protocol.md`](./05-entitlement-protocol.md) Section 2), so a
partial failure during an entitlement change never leaves a customer in a
half-granted state (e.g. paying but in the wrong group, or in the group without
a membership row).

## 9. Operator responsibilities

- Rotate provider keys periodically and on personnel changes.
- Keep the Stripe webhook secret synchronized with the registered endpoint.
- Restrict admin access to trusted operators.
- Monitor worker health — a stalled worker delays revocation of access for
  canceled/unpaid subscriptions.
- Review the [Legal Notice](./00-legal-notice.md) before any external
  distribution of the Artifact.

---

Continue to [11 — Glossary](./11-glossary.md).

*V-Channel, Inc. Proprietary Intellectual Artifact — DaScient Full-Stack
Development Framework — June 23, 2026. All rights reserved.*
