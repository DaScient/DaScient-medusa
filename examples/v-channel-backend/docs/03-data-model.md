# 03 — Data Model

**Part of:** VCEP Documentation Package · Edition June 23, 2026
**Classification:** V-Channel, Inc. Proprietary Intellectual Artifact

---

## 1. Entity overview

VCEP defines four custom entities across three modules, plus one module link to
the core Medusa `customer`. All field types are Medusa `model` definitions
(snake_case columns), and every entity uses a prefixed ULID-style primary key.

```
                ┌──────────────────┐         ┌──────────────────┐
   (core)       │     customer     │ 1 ─── 1 │  creator_profile │
   Medusa       └─────────┬────────┘  link   └──────────────────┘
                          │ customer_id (soft ref)
              ┌───────────┴───────────┐
              │                       │
     ┌────────▼────────┐     ┌────────▼────────┐
     │    membership   │ N─1 │ membership_tier │
     └─────────────────┘     └─────────────────┘
              ▲
              │ customer_id (soft ref)
     ┌────────┴────────┐
     │   subscription  │  (mirrors Stripe Billing)
     └─────────────────┘
```

> Soft reference vs. link: `customer_id` is stored as plain text on
> `membership`, `subscription`, and `creator_profile` so the modules stay
> decoupled. The **only** formal association is the `customer ↔ creator_profile`
> module link in [`../src/links/customer-creator-profile.ts`](../src/links/customer-creator-profile.ts).

## 2. `membership_tier`

Defined in [`../src/modules/membership/models/membership-tier.ts`](../src/modules/membership/models/membership-tier.ts).
One row per V-Channel plan.

| Field | Type | Notes |
| --- | --- | --- |
| `id` | id (`mtier_…`) | Primary key. |
| `code` | text, searchable | Stable machine code: `reader` \| `subscriber` \| `creator`. **Unique.** |
| `name` | text, searchable | Display name. |
| `description` | text, nullable | Marketing copy. |
| `monthly_amount` | number, default `0` | Price in the smallest currency unit (cents). `0` for reader. |
| `currency_code` | text, default `usd` | ISO currency. |
| `is_default` | boolean, default `false` | The free fallback tier (exactly one should be `true`). |
| `product_id` | text, nullable | Medusa Product fans purchase/subscribe to. Indexed. |
| `customer_group_id` | text, nullable | Group used for content gating + member pricing. Indexed. |
| `stripe_price_id` | text, nullable | Stripe Billing recurring price for this tier. |
| `memberships` | hasMany → `membership` | Reverse relation. |

**Indexes:** unique `code`; non-unique `product_id`, `customer_group_id`.

## 3. `membership`

Defined in the same file. A customer's current tier — **one active membership
per customer** (unique `customer_id`).

| Field | Type | Notes |
| --- | --- | --- |
| `id` | id (`mem_…`) | Primary key. |
| `customer_id` | text, searchable | **Unique.** Soft reference to the core customer. |
| `status` | enum, default `active` | `active` \| `past_due` \| `canceled` \| `incomplete`. Driven by Stripe webhooks. |
| `current_period_end` | dateTime, nullable | End of the paid period (mirrors Stripe). |
| `tier` | belongsTo → `membership_tier` | The tier currently granted. |

**Indexes:** unique `customer_id`; non-unique `status`.

## 4. `subscription`

Defined in [`../src/modules/subscription/models/subscription.ts`](../src/modules/subscription/models/subscription.ts).
The Protocol's local mirror of a Stripe Billing subscription. **Stripe is the
source of truth**; this row is reconciled from webhook events.

Key fields (as used by the service and steps):

| Field | Type | Notes |
| --- | --- | --- |
| `id` | id (`sub_…`) | Primary key. |
| `customer_id` | text | Soft reference to the core customer. |
| `tier_code` | text | The tier this subscription grants (`subscriber` \| `creator`). |
| `status` | enum/text | Mirrors the Stripe subscription status (`incomplete`, `active`, `past_due`, `canceled`, `unpaid`, …). |
| `stripe_customer_id` | text | The Stripe customer this maps to. |
| `stripe_subscription_id` | text, nullable | The Stripe subscription id (set once Stripe creates it). |
| `stripe_price_id` | text | The Stripe price billed. |
| `current_period_end` | dateTime, nullable | Mirrors Stripe's `current_period_end`. |
| `cancel_at_period_end` | boolean | Whether Stripe will not renew. |

Lifecycle: a row is created `incomplete` at checkout start, then updated by
`reconcileFromStripe()` as Stripe events arrive. See
[`04-modules.md`](./04-modules.md) Section 3.

## 5. `creator_profile`

Defined in [`../src/modules/creator-profile/models/creator-profile.ts`](../src/modules/creator-profile/models/creator-profile.ts).
Creator-specific metadata that extends a customer **without modifying the core
customer module**.

| Field | Type | Notes |
| --- | --- | --- |
| `id` | id (`creator_…`) | Primary key. |
| `customer_id` | text, searchable | **Unique.** Linked to a core customer via the module link. |
| `slug` | text, searchable | **Unique.** Public, URL-friendly handle for the creator page. |
| `display_name` | text | Public name. |
| `bio` | text, nullable | Profile bio. |
| `avatar_url` | text, nullable | Profile image. |
| `stripe_connect_account_id` | text, nullable | Stripe Connect account for payouts. |
| `payouts_enabled` | boolean, default `false` | Whether Connect onboarding is complete. |
| `is_published` | boolean, default `false` | Whether the creator page is live. |

**Indexes:** unique `customer_id`; unique `slug`.

## 6. The customer ↔ creator-profile link

[`../src/links/customer-creator-profile.ts`](../src/links/customer-creator-profile.ts)
declares a non-list link between the core `customer` and `creator_profile`. This
lets the Query graph fetch a customer together with its creator metadata:

```ts
query.graph({
  entity: "customer",
  fields: ["id", "email", "creator_profile.*"],
})
```

The link keeps the core customer module untouched while giving creators
first-class, queryable metadata.

## 7. Seeded baseline

[`../src/scripts/seed.ts`](../src/scripts/seed.ts) (run with `yarn seed`)
establishes the minimum data VCEP needs:

- A US region with USD.
- A `V-Channel` sales channel set as the store default.
- One **customer group per tier** (`reader`, `subscriber`, `creator`).
- The three **membership tiers** wired to their groups.

> Post-seed step: link each paid tier's `product_id` and `stripe_price_id` after
> creating the matching Medusa Products and Stripe Billing prices.

## 8. Referential integrity notes

- `membership.customer_id` and `subscription.customer_id` are not foreign keys;
  integrity is maintained by the workflows, not the database. This is a
  deliberate decoupling so modules can be deployed and reasoned about
  independently.
- The uniqueness of `membership.customer_id` enforces the "one membership per
  customer" invariant at the database level.
- `subscription` may have multiple historical rows per customer; reconciliation
  matches by `stripe_subscription_id` first, then the most recent `incomplete`
  row for the customer (see [`04-modules.md`](./04-modules.md) Section 3.3).

---

Continue to [04 — Modules Reference](./04-modules.md).

*V-Channel, Inc. Proprietary Intellectual Artifact — DaScient Full-Stack
Development Framework — June 23, 2026. All rights reserved.*
