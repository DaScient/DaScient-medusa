# 01 — Protocol Overview & Framework

**Part of:** VCEP Documentation Package · Edition June 23, 2026
**Classification:** V-Channel, Inc. Proprietary Intellectual Artifact

---

## 1. Executive summary

The **V-Channel Commerce & Entitlement Protocol (VCEP)** is the full-stack
contract by which the V-Channel media platform turns anonymous visitors into
paying members and creators, and decides — on every request — what content a
person is allowed to see.

In one sentence: **VCEP authenticates a person, determines the membership tier
they are entitled to, keeps that entitlement in sync with Stripe billing, and
exposes a single yes/no answer the frontend can trust.**

The Protocol is delivered as a Medusa v2 backend (this repository) plus a thin
set of frontend integration helpers for the V-Channel Next.js application. It is
designed to be *lifted* into a fresh Medusa app rather than forked from the
Medusa monorepo (see [`02-architecture.md`](./02-architecture.md), Section 6).

## 2. The problem it solves

V-Channel is a premium, monetizable platform for creators, celebrities, and
influencers. It needs to:

1. Let fans and creators sign in (email/password or social).
2. Sell access three ways: free reading, recurring subscriptions, and one-time
   pay-per-view (PPV) events.
3. Pay creators out.
4. Gate every piece of premium content correctly and fast, including during
   server-side rendering.
5. Keep billing state authoritative and recover cleanly from partial failures.

VCEP packages all of this into a small, well-bounded protocol so the frontend
team never has to reason about Stripe, customer groups, or webhook ordering.

## 3. Core concepts (define-once)

| Concept | Definition |
| --- | --- |
| **Tier** | A named level of access: `reader` (free), `subscriber` ($9/mo), `creator` ($49/mo). Each tier maps to a Medusa **customer group** and, for paid tiers, a **Stripe price**. |
| **Membership** | A customer's *current* tier and its lifecycle `status` (`active`, `past_due`, `canceled`, `incomplete`). Exactly one per customer. |
| **Subscription** | The Protocol's mirror of a **Stripe Billing** subscription. Stripe is authoritative; the Protocol reconciles from it. |
| **Entitlement** | The runtime answer to "what is this customer allowed to do?" — derived from their resolved tier and expressed as `has_access` plus `capabilities`. |
| **Capability** | A boolean derived from the tier: `ad_free` (Subscriber+) and `can_publish` (Creator only). |
| **Creator profile** | Creator-specific metadata (slug, bio, Stripe Connect account) linked to a core customer without modifying the customer module. |
| **Compensation** | The rollback action attached to every mutating workflow step, so a mid-flow failure leaves no partial state. |

These terms are used consistently across the entire package; the
[Glossary](./11-glossary.md) repeats them verbatim for quick lookup.

## 4. The Protocol in four moves

1. **Identify.** A request arrives with (or without) an authenticated customer.
   Anonymous requests resolve to the free `reader` tier.
2. **Resolve.** The membership module resolves the customer's active tier,
   falling back to the default `reader` tier.
3. **Decide.** The entitlement endpoint compares the resolved tier rank against
   the `required_tier` and returns `has_access` plus `capabilities`.
4. **Reconcile.** When Stripe reports a billing change via webhook, the sync
   workflow updates the local subscription and grants or revokes the
   entitlement — moving the customer between tiers/groups with full
   compensation.

Moves 1–3 are read-only and fast (suitable for SSR). Move 4 is asynchronous and
retry-safe.

## 5. The DaScient Full-Stack Development Framework layering

VCEP is organized along the DaScient framework's layered model. Each layer has a
single responsibility and a stable contract with the layer above it.

```
  ┌─────────────────────────────────────────────────────────────┐
  │  L5  Experience      Next.js on Vercel: SEO, SSR/SSG, comments │  (outside Medusa)
  │                      ads, sharing — consumes entitlements       │
  ├─────────────────────────────────────────────────────────────┤
  │  L4  Interface       Store/Admin API routes + Stripe webhook    │  src/api
  │                      One entitlement endpoint to rule gating    │
  ├─────────────────────────────────────────────────────────────┤
  │  L3  Orchestration   Workflows + compensable steps              │  src/workflows
  │                      grant / revoke / sync entitlement          │
  ├─────────────────────────────────────────────────────────────┤
  │  L2  Domain          Custom modules + services                  │  src/modules
  │                      membership · subscription · creator-profile│
  ├─────────────────────────────────────────────────────────────┤
  │  L1  Platform        Medusa runtime + Redis infra + providers   │  medusa-config.ts
  │                      cache · event-bus · workflow-engine · lock │
  ├─────────────────────────────────────────────────────────────┤
  │  L0  External truth  Stripe (Billing+Connect) · SendGrid · S3   │  third parties
  │                      PostHog · Google/GitHub OAuth              │
  └─────────────────────────────────────────────────────────────┘
```

**Framework principles applied throughout VCEP:**

- **Single source of truth per concern.** Stripe owns billing; Medusa owns
  identity and entitlement; Next.js owns rendering. No concern is owned twice.
- **Liftable, not forked.** The Protocol ships as a copy-in scaffold to avoid
  coupling to the upstream monorepo (Phase 0.3).
- **Every mutation is reversible.** Orchestration steps define compensation, so
  the system is always in a consistent state.
- **The edge is dumb on purpose.** The frontend asks one question and trusts one
  answer; all policy lives server-side.
- **Configuration over code.** Tiers, prices, CORS, and providers are wired via
  config and environment, not hard-coded.

## 6. Phase map (delivery plan to documentation)

The original delivery plan is a 6-phase program. This package maps each phase to
the document that now governs it.

| Phase | Theme | Governing document |
| --- | --- | --- |
| 0 | Architecture & ground rules | [02 — Architecture](./02-architecture.md) |
| 1 | Stand up the backend (infra + providers) | [07 — Providers](./07-providers.md), [09 — Deployment](./09-deployment-operations.md) |
| 2 | V-Channel concepts on Medusa | [03 — Data Model](./03-data-model.md), [04 — Modules](./04-modules.md) |
| 3 | Custom modules & workflows | [04 — Modules](./04-modules.md), [05 — Entitlement Protocol](./05-entitlement-protocol.md), [06 — API](./06-api-reference.md) |
| 4 | Connect the frontend | [08 — Frontend Integration](./08-frontend-integration.md) |
| 5 | Community, ads, SEO (Next.js) | [08 — Frontend Integration](./08-frontend-integration.md) |
| 6 | Deploy & operate | [09 — Deployment & Operations](./09-deployment-operations.md) |

## 7. What is intentionally *not* in scope

- **Content management** (articles/videos/podcasts) lives in the V-Channel CMS /
  Next.js app, which references Medusa product/tier IDs.
- **Comments, social sharing, programmatic ads, SEO** are Next.js concerns; VCEP
  only supplies the identity and entitlement signals they consume.
- **Creator payout execution** is delegated to **Stripe Connect**; VCEP stores
  the Connect account and `payouts_enabled` flag but does not move money itself.

---

Continue to [02 — Architecture](./02-architecture.md).

*V-Channel, Inc. Proprietary Intellectual Artifact — DaScient Full-Stack
Development Framework — June 23, 2026. All rights reserved.*
