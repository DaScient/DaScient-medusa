# 06 — API Reference

**Part of:** VCEP Documentation Package · Edition June 23, 2026
**Classification:** V-Channel, Inc. Proprietary Intellectual Artifact

---

VCEP exposes three groups of HTTP routes under [`../src/api`](../src/api):
**Store** (customer-facing), **Admin** (operator-facing), and a **webhook**
receiver. Standard Medusa Store/Admin routes (auth, customers, products,
orders) are also available from the base platform but are out of scope here.

| Method & path | Group | Auth | Purpose |
| --- | --- | --- | --- |
| `GET /store/entitlements` | Store | Optional customer | Resolve tier + access decision |
| `GET /store/memberships` | Store | Public | List tiers for the pricing page |
| `POST /store/memberships` | Store | Customer | Start a subscription checkout |
| `GET /admin/creators` | Admin | Admin | List creator profiles |
| `POST /admin/creators` | Admin | Admin | Create a creator profile |
| `POST /hooks/stripe` | Webhook | Stripe signature | Receive Stripe events |

---

## 1. Conventions

- **Auth:** Store routes use the customer JWT/session; the authenticated
  customer id is read from `req.auth_context?.actor_id`. Admin routes require an
  admin session. The webhook route uses the Stripe signature instead of Medusa
  auth.
- **Errors:** Thrown as `MedusaError` and mapped to HTTP statuses — `NOT_FOUND`
  → 404, `INVALID_DATA` → 400/422, `UNAUTHORIZED` → 401.
- **CORS:** Governed by `STORE_CORS` / `ADMIN_CORS` / `AUTH_CORS`.

---

## 2. Store API

### 2.1 `GET /store/entitlements`

The single gating endpoint. The Next.js app calls this server-side to decide
whether to serve gated content. ([`route.ts`](../src/api/store/entitlements/route.ts))

**Query:** `required_tier` (optional) — `reader` | `subscriber` | `creator`.
When present, the response's `has_access` reflects whether the customer's tier
**rank** meets or exceeds it. Ranks: `reader = 0`, `subscriber = 1`,
`creator = 2`.

**Authenticated response:**

```json
{
  "authenticated": true,
  "customer_id": "cus_…",
  "tier": "subscriber",
  "tier_name": "Subscriber",
  "has_access": true,
  "capabilities": { "ad_free": true, "can_publish": false }
}
```

**Anonymous response** (no JWT): resolves to the default `reader` tier with no
`capabilities`:

```json
{ "authenticated": false, "tier": "reader", "has_access": false }
```

(`has_access` is `true` when no `required_tier` is supplied.)

**Capabilities:** `ad_free` is `true` for Subscriber and above; `can_publish` is
`true` only for Creator.

### 2.2 `GET /store/memberships`

Lists membership tiers ordered by `monthly_amount` ascending, so the pricing
page renders Reader → Subscriber → Creator. ([`route.ts`](../src/api/store/memberships/route.ts))

```json
{ "tiers": [ { "id": "mtier_…", "code": "reader", "name": "Reader", "monthly_amount": 0, "...": "..." } ] }
```

### 2.3 `POST /store/memberships`

Starts a Stripe Billing checkout for a paid tier. **Requires an authenticated
customer.**

**Body:** `{ "tier_code": "subscriber", "success_url": "...", "cancel_url": "..." }`
(all three required; otherwise `INVALID_DATA`).

**Behavior:** retrieves the customer's email, calls
`SubscriptionModuleService.startCheckout`, and returns the redirect URL:

```json
{ "checkout_url": "https://checkout.stripe.com/c/pay/…" }
```

Entitlement is **not** granted here — it is granted later when the Stripe
webhook reports the subscription `active` (see
[`05-entitlement-protocol.md`](./05-entitlement-protocol.md)).

---

## 3. Admin API

### 3.1 `GET /admin/creators`

Lists creator profiles with pagination. ([`route.ts`](../src/api/admin/creators/route.ts))
Uses `req.filterableFields` and `req.queryConfig.pagination` (defaults: skip 0,
take 20).

```json
{ "creators": [ … ], "count": 42, "offset": 0, "limit": 20 }
```

### 3.2 `POST /admin/creators`

Creates a creator profile linked to an existing customer.

**Body:** `{ "customer_id": "cus_…", "slug": "jane", "display_name": "Jane",
"bio?": "…" }` (`customer_id`, `slug`, `display_name` required).

Rejects a duplicate `slug` with `INVALID_DATA`. Returns `201`:

```json
{ "creator": { "id": "creator_…", "slug": "jane", "display_name": "Jane", "...": "..." } }
```

---

## 4. Webhook

### 4.1 `POST /hooks/stripe`

Stripe webhook receiver. ([`route.ts`](../src/api/hooks/stripe/route.ts)) It is
intentionally **not** under `/admin` or `/store` so Stripe can reach it without
Medusa auth; the Stripe signature is the authentication.

**Headers:** `stripe-signature` (required, else `400`).

**Behavior:**

1. Verify the signature against `STRIPE_WEBHOOK_SECRET` using the **raw body**
   (preserved by [`../src/api/middlewares.ts`](../src/api/middlewares.ts)).
   Failure → `400`.
2. If the event is not subscription-relevant, acknowledge it (`{ received:
   true, ignored: true }`) so Stripe stops retrying.
3. Resolve the Stripe subscription object (retrieving it for `invoice.*`
   events).
4. Emit the internal `subscription.stripe_sync` event and respond
   `{ received: true }`.

The worker's subscriber then runs the sync workflow. **Handled event types:**
`customer.subscription.created`, `customer.subscription.updated`,
`customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`.

> Webhook setup: register `https://api.v-channel.com/hooks/stripe` in Stripe and
> subscribe to `customer.subscription.*`, `invoice.paid`,
> `invoice.payment_failed`. See [`09-deployment-operations.md`](./09-deployment-operations.md).

---

## 5. Status code summary

| Situation | Status |
| --- | --- |
| Success (GET/POST returning data) | 200 |
| Creator created | 201 |
| Missing/invalid body fields | 400 / 422 (`INVALID_DATA`) |
| Missing `stripe-signature` or bad signature | 400 |
| Unauthenticated checkout attempt | 401 (`UNAUTHORIZED`) |
| Tier / default tier not found | 404 (`NOT_FOUND`) |

---

Continue to [07 — Provider Integrations](./07-providers.md).

*V-Channel, Inc. Proprietary Intellectual Artifact — DaScient Full-Stack
Development Framework — June 23, 2026. All rights reserved.*
