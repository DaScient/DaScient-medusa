# V-Channel Commerce & Entitlement Protocol (VCEP)

### Proprietary Documentation Package

**Artifact owner:** V-Channel, Inc.
**Engineering framework:** DaScient Full-Stack Development Framework, by DaScient, Inc.
**Edition date:** June 23, 2026
**Classification:** V-Channel, Inc. Proprietary Intellectual Artifact
**Status:** Controlled — All rights reserved.

> Copyright © 2026 V-Channel, Inc. All rights reserved. This documentation
> package and the protocol it describes (the "V-Channel Commerce & Entitlement
> Protocol", "VCEP", or the "Protocol") are a Proprietary Intellectual Artifact
> of V-Channel, Inc., designed, assembled, and delivered under the DaScient
> Full-Stack Development Framework by DaScient, Inc. See
> [`00-legal-notice.md`](./00-legal-notice.md) for the complete notice,
> license posture, and intellectual-property designation.

---

## What this package is

This is the authoritative, self-contained reference for **VCEP** — the
full-stack protocol that powers identity, entitlements, payments,
subscriptions, creator payouts, and analytics for the V-Channel premium media
platform. It is written to be **comprehensively detailed yet profoundly
straightforward**: every concept is defined once, grounded in the actual
implementation in this repository, and cross-referenced.

The implementation lives in [`../`](../) (the `v-channel-backend` Medusa v2
application). This `docs/` package documents *what the Protocol is, how it is
built, and how to operate it* — independent of any single source file.

## How to read it

Read top to bottom for a full briefing, or jump to the document you need.

| # | Document | Read this when you want to… |
| --- | --- | --- |
| 00 | [Legal Notice & IP Designation](./00-legal-notice.md) | Understand ownership, licensing, and the proprietary designation. |
| 01 | [Protocol Overview & Framework](./01-overview.md) | Get the executive summary and the DaScient framework layering. |
| 02 | [Architecture](./02-architecture.md) | See the full-stack topology and runtime boundaries. |
| 03 | [Data Model](./03-data-model.md) | Understand entities, fields, and relationships. |
| 04 | [Modules Reference](./04-modules.md) | Learn the custom commerce modules and their services. |
| 05 | [Entitlement Protocol (Workflows)](./05-entitlement-protocol.md) | Follow the grant/revoke/sync flows and compensation. |
| 06 | [API Reference](./06-api-reference.md) | Call the Store, Admin, and webhook endpoints. |
| 07 | [Provider Integrations](./07-providers.md) | Configure Stripe, SendGrid, S3, PostHog, and auth. |
| 08 | [Frontend Integration](./08-frontend-integration.md) | Wire the Next.js app and gate content. |
| 09 | [Deployment & Operations](./09-deployment-operations.md) | Ship and run the Protocol in production. |
| 10 | [Security & Compliance](./10-security-compliance.md) | Review the security model and data handling. |
| 11 | [Glossary](./11-glossary.md) | Look up any term used in this package. |

## At a glance

- **Three membership tiers** — Reader (free), Subscriber ($9/mo), Creator
  ($49/mo) — each mapped to a Medusa customer group for content gating and to a
  Stripe Billing price for recurring revenue.
- **Stripe is the source of truth** for recurring billing; the Protocol mirrors
  state through verified webhooks and reconciles entitlements with
  fully-compensated workflows.
- **One entitlement endpoint** (`GET /store/entitlements`) drives all
  server-side gating decisions in the Next.js frontend.
- **Separation of concerns** — Medusa owns commerce and identity; Next.js on
  Vercel owns rendering, SEO, comments, and ads.

## Document conventions

- Code identifiers, paths, and environment variables appear in `monospace`.
- "MUST" / "SHOULD" / "MAY" are used in their conventional requirement sense.
- Every claim about behavior is traceable to a file under
  [`../src`](../src) or [`../frontend`](../frontend).
- No content in this package supersedes the [Legal Notice](./00-legal-notice.md).

---

*V-Channel, Inc. Proprietary Intellectual Artifact — prepared under the DaScient
Full-Stack Development Framework by DaScient, Inc. — June 23, 2026. All rights
reserved.*
