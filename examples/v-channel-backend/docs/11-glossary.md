# 11 — Glossary

**Part of:** VCEP Documentation Package · Edition June 23, 2026
**Classification:** V-Channel, Inc. Proprietary Intellectual Artifact

---

Terms are listed alphabetically. Definitions match their use throughout this
package; where a concept has a canonical owner file, it is cited.

**Artifact.** The VCEP Protocol design plus this documentation package and all
accompanying materials, designated a Proprietary Intellectual Artifact of
V-Channel, Inc. (see [`00-legal-notice.md`](./00-legal-notice.md)).

**Capability.** A boolean derived from a customer's tier and returned by the
entitlement endpoint. `ad_free` is true for Subscriber and above; `can_publish`
is true only for Creator.

**Compensation.** The rollback action attached to a mutating workflow step. On
mid-flow failure, compensations run in reverse to leave the system consistent
([`05-entitlement-protocol.md`](./05-entitlement-protocol.md)).

**Creator (tier).** The $49/month paid tier. Grants `ad_free` and `can_publish`
and is associated with the creator customer group.

**Creator profile.** Creator-specific metadata (slug, bio, avatar, Stripe
Connect account) linked to a core customer without modifying the customer module
([`creator-profile`](../src/modules/creator-profile)).

**Customer group.** A core Medusa grouping used by VCEP for content gating and
member pricing. Each tier maps to one group.

**DaScient Full-Stack Development Framework.** The engineering methodology and
toolchain, authored by DaScient, Inc., under which the Artifact was designed and
delivered.

**Entitlement.** The runtime answer to "what is this customer allowed to do?",
expressed as `has_access` plus `capabilities` and computed server-side by
`GET /store/entitlements`.

**Entitlement endpoint.** `GET /store/entitlements` — the single gating
endpoint the frontend calls server-side ([`06-api-reference.md`](./06-api-reference.md)).

**has_access.** The boolean access decision: whether the customer's tier rank
meets or exceeds the `required_tier`. Ranks: reader 0, subscriber 1, creator 2.

**Liftable scaffold.** The delivery model: copy `src/`, `medusa-config.ts`,
dependencies, and `.env.template` into a fresh Medusa app rather than forking the
monorepo (Phase 0.3).

**Membership.** A customer's current tier and lifecycle status (`active`,
`past_due`, `canceled`, `incomplete`). One per customer
([`membership`](../src/modules/membership)).

**Membership tier.** A named access level (`reader`, `subscriber`, `creator`)
mapped to a customer group and, for paid tiers, a Stripe price.

**PPV (pay-per-view).** A one-time purchasable event modeled as a Medusa
Product; a completed order is the entitlement to view it.

**Protocol / VCEP.** The V-Channel Commerce & Entitlement Protocol — the
full-stack contract documented by this package.

**Reader (tier).** The free, default tier. The fallback for anonymous visitors
and customers without an active paid membership.

**Reconciliation.** Updating the local `subscription` mirror from a Stripe
subscription object; idempotent, with Stripe as the source of truth
([`reconcileFromStripe`](../src/modules/subscription/service.ts)).

**Required tier.** The `required_tier` query parameter on the entitlement
endpoint that a piece of content demands.

**Server role / Worker role.** The two production process roles selected by
`MEDUSA_WORKER_MODE` ([`02-architecture.md`](./02-architecture.md) Section 2).

**Soft reference.** A `customer_id` stored as plain text (not a foreign key) to
keep modules decoupled; integrity is maintained by workflows.

**Source of truth.** The authoritative owner of a concern. Stripe owns billing;
Medusa owns identity and entitlement; Next.js owns rendering.

**Stripe Billing.** Stripe's recurring-subscription product; VCEP bridges to it
via the subscription module and mirrors its state.

**Stripe Connect.** Stripe's payouts product used to pay creators; VCEP stores
the Connect account id and `payouts_enabled` flag.

**Subscriber (tier).** The $9/month paid tier. Grants `ad_free` but not
`can_publish`.

**Subscription.** The Protocol's local mirror of a Stripe Billing subscription
([`subscription`](../src/modules/subscription)).

**Subscriber (event).** A worker-side handler that runs the sync workflow when
the `subscription.stripe_sync` event is emitted
([`subscription-events.ts`](../src/subscribers/subscription-events.ts)).

**Sync workflow.** `syncSubscriptionStatusWorkflow` — reconciles a Stripe
subscription and grants or revokes entitlement accordingly.

**V-Channel, Inc.** The owner of the Artifact and the V-Channel platform.

**Webhook (Stripe).** The `POST /hooks/stripe` route that receives and verifies
Stripe events and emits the internal sync event.

---

*End of the VCEP Documentation Package.*

*V-Channel, Inc. Proprietary Intellectual Artifact — DaScient Full-Stack
Development Framework — June 23, 2026. All rights reserved.*
