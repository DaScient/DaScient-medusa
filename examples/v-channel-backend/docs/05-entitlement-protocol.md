# 05 — Entitlement Protocol (Workflows)

**Part of:** VCEP Documentation Package · Edition June 23, 2026
**Classification:** V-Channel, Inc. Proprietary Intellectual Artifact

---

This is the heart of VCEP: the orchestration layer that turns a billing event
into a correct, fully-reversible change in a customer's access. Every mutating
step defines a **compensation** function, so a failure mid-flow rolls back
cleanly (pattern borrowed from `core-flows/promotion`).

## 1. The three workflows

| Workflow | ID | File | Trigger |
| --- | --- | --- | --- |
| Grant entitlement | `grant-entitlement` | [`grant-entitlement.ts`](../src/workflows/grant-entitlement.ts) | Successful PPV purchase or activated subscription |
| Revoke entitlement | `revoke-entitlement` | [`revoke-entitlement.ts`](../src/workflows/revoke-entitlement.ts) | Subscription canceled or unpaid |
| Sync subscription status | `sync-subscription-status` | [`sync-subscription-status.ts`](../src/workflows/sync-subscription-status.ts) | Stripe webhook event |

The sync workflow is the entry point; it composes grant/revoke as sub-steps so
their compensation chains participate in one transaction.

## 2. The steps (and their compensation)

All steps live in [`../src/workflows/steps`](../src/workflows/steps).

| Step | Mutates? | Compensation |
| --- | --- | --- |
| `resolveTierStep` | No (read-only) | None needed. |
| `upsertMembershipStep` | Yes | Restore the previous membership snapshot, or delete the row if it was newly created. |
| `setCustomerGroupStep` | Yes | Reverse the change: remove from the group it added, re-add to the group it removed. |
| `reconcileSubscriptionStep` | Yes | **Intentional no-op** — reconciliation is idempotent and Stripe remains source of truth; never "undo" a sync. |

### 2.1 `resolveTierStep`

Resolves a tier by `tier_code`, or the default (`reader`) tier when
`use_default` is set or no code is given. Throws `NOT_FOUND` if the tier is
missing (prompting `yarn seed`). Read-only, so no compensation.

### 2.2 `upsertMembershipStep`

Reads the customer's previous membership (for the compensation snapshot), then
calls `MembershipModuleService.upsertMembership`. Compensation:

- If the row was newly **created**, delete it.
- If a **previous** row existed, restore its `tier_id`, `status`, and
  `current_period_end`.

### 2.3 `setCustomerGroupStep`

Adds the customer to `add_group_id` and/or removes them from `remove_group_id`
using the core customer module. Compensation reverses both operations exactly,
so group membership is restored on rollback.

### 2.4 `reconcileSubscriptionStep`

Mirrors a Stripe subscription into the local table via
`reconcileFromStripe`. Compensation is deliberately empty: the operation is
idempotent and the next webhook re-establishes correct state. Undoing it would
fight Stripe (the source of truth).

## 3. Grant entitlement

`grantEntitlementWorkflow(input)` where
`input = { customer_id, tier_code, current_period_end?, previous_group_id? }`:

1. `resolveTierStep({ tier_code })` → the target paid tier.
2. `upsertMembershipStep` → set the customer's membership `active` for that tier.
3. `setCustomerGroupStep` → move the customer into the tier's
   `customer_group_id` (and out of `previous_group_id` if provided).

Returns the membership. Used after a successful purchase or activation.

```
resolve tier ──► upsert membership (active) ──► move into paid group
   (read)            (compensable)                  (compensable)
```

## 4. Revoke entitlement

`revokeEntitlementWorkflow(input)` where
`input = { customer_id, paid_group_id? }`:

1. `resolveTierStep({ use_default: true })` → the free `reader` tier.
2. `upsertMembershipStep` → mark the membership `canceled` and re-point it at the
   reader tier, clearing `current_period_end`.
3. `setCustomerGroupStep` → remove from `paid_group_id`, add to the reader
   group.

Returns the membership. Used when a subscription is canceled or goes unpaid.

## 5. Sync subscription status (the orchestrator)

`syncSubscriptionStatusWorkflow(input)` where
`input = { stripe_subscription }` (the raw Stripe object from the webhook):

1. `reconcileSubscriptionStep` → upsert the local `subscription` row and return
   it.
2. **`when` status is `active`** → run `grantEntitlementWorkflow.runAsStep` with
   the reconciled customer/tier/period.
3. **`when` status is `canceled` or `unpaid`** → run
   `revokeEntitlementWorkflow.runAsStep`.

Returns the reconciled subscription. Because grant/revoke run *as steps*, their
compensations are part of this workflow's transaction — if a later step fails,
the whole entitlement change unwinds.

```
reconcile ──► when active  ──► grantEntitlementWorkflow (as step)
            └ when canceled/unpaid ──► revokeEntitlementWorkflow (as step)
```

## 6. How the webhook reaches the workflow

The HTTP layer stays thin and fast; the workflow runs on the worker:

```
POST /hooks/stripe
  → verify Stripe signature (raw body)             [src/api/hooks/stripe/route.ts]
  → if subscription-relevant event:
       resolve the Stripe subscription object
       eventBus.emit("subscription.stripe_sync", { stripe_subscription })
  → respond { received: true }

(worker)
  subscriber on "subscription.stripe_sync"          [src/subscribers/subscription-events.ts]
  → syncSubscriptionStatusWorkflow(container).run({ input })
```

Relevant Stripe events (the route's `SUBSCRIPTION_EVENTS` set):
`customer.subscription.created`, `customer.subscription.updated`,
`customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`.
For `invoice.*` events the route retrieves the full subscription from Stripe
before emitting. Unrelated events are acknowledged so Stripe stops retrying.

## 7. Why this design is correct under failure

- **At-least-once delivery is safe.** Reconciliation is idempotent, so repeated
  webhooks converge to the same state.
- **Partial failures don't leak.** If moving the customer into a group fails
  after the membership upsert, the upsert's compensation restores the prior
  membership.
- **Stripe stays authoritative.** The local subscription is a mirror; the
  Protocol never "decides" billing — it reflects it and adjusts access.
- **Webhook handling is fast.** Verification + emit returns immediately;
  reconciliation runs asynchronously on the worker, keeping Stripe retries calm.

---

Continue to [06 — API Reference](./06-api-reference.md).

*V-Channel, Inc. Proprietary Intellectual Artifact — DaScient Full-Stack
Development Framework — June 23, 2026. All rights reserved.*
