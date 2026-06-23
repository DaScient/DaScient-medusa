# 04 — Modules Reference

**Part of:** VCEP Documentation Package · Edition June 23, 2026
**Classification:** V-Channel, Inc. Proprietary Intellectual Artifact

---

VCEP adds three custom Medusa modules. Each follows the `MedusaService` factory
pattern: the factory auto-generates CRUD (e.g. `createMembershipTiers`,
`listMemberships`, `updateSubscriptions`, …) and the Protocol adds only the
V-Channel-specific helpers on top.

| Module | Registration key | Directory |
| --- | --- | --- |
| Membership | `MEMBERSHIP_MODULE = "membership"` | [`../src/modules/membership`](../src/modules/membership) |
| Subscription | `SUBSCRIPTION_MODULE = "subscription"` | [`../src/modules/subscription`](../src/modules/subscription) |
| Creator profile | `CREATOR_PROFILE_MODULE` | [`../src/modules/creator-profile`](../src/modules/creator-profile) |

All three are registered in [`../medusa-config.ts`](../medusa-config.ts). The
subscription module additionally receives options (`apiKey`, `webhookSecret`,
`priceByTier`).

---

## 1. Membership module

**Service:** `MembershipModuleService` ([`service.ts`](../src/modules/membership/service.ts))
extends `MedusaService({ MembershipTier, Membership })`.

Owns tiers and customer memberships. It is the authority for "which tier is this
customer entitled to right now?".

### 1.1 `resolveTierForCustomer(customerId)`

Returns the tier the customer is currently entitled to:

1. Look up the customer's `active` membership (with its `tier`).
2. If found, return that tier.
3. Otherwise return the default (`is_default = true`) tier — the free `reader`.
4. If no default tier exists, throw `MedusaError.Types.NOT_FOUND` ("Run the seed
   script.").

This method backs the entitlement endpoint
([`06-api-reference.md`](./06-api-reference.md) Section 2.1).

### 1.2 `upsertMembership(input)`

Creates or updates the customer's single membership row. Used by the
entitlement workflows when Stripe reports a change.

Input: `{ customer_id, tier_id, status?, current_period_end? }`. If a membership
already exists for the customer it is updated; otherwise one is created.
`status` defaults to `active`.

---

## 2. Subscription module

**Service:** `SubscriptionModuleService` ([`service.ts`](../src/modules/subscription/service.ts))
extends `MedusaService({ Subscription })` and holds a `StripeBilling` instance.

This module is the **bridge to Stripe Billing**. It receives options through
`medusa-config.ts`:

```ts
{
  resolve: "./src/modules/subscription",
  options: { apiKey, webhookSecret, priceByTier }
}
```

### 2.1 Tier ↔ price mapping

- `priceForTier(tierCode)` → the configured Stripe price id, or throws if none
  is configured.
- `tierForPrice(priceId)` → the tier code for a given Stripe price id, or
  `undefined`.

`priceByTier` is set from `STRIPE_PRICE_SUBSCRIBER` / `STRIPE_PRICE_CREATOR` env
vars.

### 2.2 `startCheckout(input)`

Begins a Stripe Billing checkout for a customer + tier:

1. Resolve the Stripe price for the tier.
2. `ensureCustomer()` — find or create the Stripe customer (keyed by the
   V-Channel customer id stored in Stripe metadata).
3. Create a Stripe Checkout Session (`mode: "subscription"`) with `success_url`,
   `cancel_url`, and metadata (`vchannel_customer_id`, `tier_code`).
4. Persist a local `subscription` row with `status: "incomplete"`.
5. Return `{ checkoutUrl, subscription }`.

The frontend redirects the user to `checkoutUrl`; activation happens later via
webhook.

### 2.3 `reconcileFromStripe(stripeSub)`

Upserts the local subscription from a Stripe subscription object. Matching
order:

1. By `stripe_subscription_id` — update if found.
2. Else, by the most recent `incomplete` row for the customer (resolved from
   `metadata.vchannel_customer_id`).
3. Else, create a new row (defaulting `tier_code` to the price-derived tier or
   `subscriber`).

Returns the reconciled row (or `undefined` if the customer cannot be
identified). This is the method the sync workflow's reconcile step calls.

### 2.4 `verifyWebhook(payload, signature)`

Verifies a Stripe webhook against `webhookSecret` and returns the constructed
event. Delegates to `StripeBilling.constructEvent`.

### 2.5 `StripeBilling` helper

[`stripe-billing.ts`](../src/modules/subscription/stripe-billing.ts) isolates all
direct Stripe calls so the service and workflows stay testable:

| Method | Purpose |
| --- | --- |
| `ensureCustomer({ customerId, email })` | Find-or-create a Stripe customer by `vchannel_customer_id` metadata. |
| `createSubscriptionCheckout(...)` | Create a `mode: subscription` Checkout Session. |
| `createBillingPortal(...)` | Build a Billing Portal URL so members can manage/cancel. |
| `constructEvent(payload, signature, secret)` | Verify and parse a webhook. |
| `stripe` (getter) | The raw Stripe client (e.g. to retrieve a subscription for an `invoice.*` event). |

---

## 3. Creator-profile module

**Service:** `CreatorProfileModuleService` ([`service.ts`](../src/modules/creator-profile/service.ts))
extends `MedusaService({ CreatorProfile })`.

Stores creator metadata and (eventually) Stripe Connect onboarding state. Today
it adds one helper:

- `getBySlug(slug)` → the creator profile for a public handle, or `undefined`.

CRUD (`createCreatorProfiles`, `listCreatorProfiles`,
`listAndCountCreatorProfiles`, …) is auto-generated. The module is associated to
the core customer via the link in
[`../src/links/customer-creator-profile.ts`](../src/links/customer-creator-profile.ts).

---

## 4. Module design rules (DaScient framework)

- **Auto-generated CRUD first.** Only hand-write methods that encode V-Channel
  policy (tier resolution, Stripe reconciliation, slug lookup).
- **Soft references for cross-module ids.** `customer_id` is plain text; the
  only formal association is the creator-profile link.
- **Provider isolation.** All Stripe calls funnel through `StripeBilling` so the
  rest of the module is unit-testable without the network.
- **Errors are typed.** Use `MedusaError` with the correct
  `MedusaError.Types.*` so the API layer maps them to proper HTTP statuses.

---

Continue to [05 — Entitlement Protocol (Workflows)](./05-entitlement-protocol.md).

*V-Channel, Inc. Proprietary Intellectual Artifact — DaScient Full-Stack
Development Framework — June 23, 2026. All rights reserved.*
