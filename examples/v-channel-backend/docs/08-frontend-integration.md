# 08 — Frontend Integration

**Part of:** VCEP Documentation Package · Edition June 23, 2026
**Classification:** V-Channel, Inc. Proprietary Intellectual Artifact

---

The V-Channel frontend is an existing **Next.js app on Vercel**. VCEP does not
ship a frontend; it ships **reference helpers** ([`../frontend`](../frontend))
to drop into that app, plus the contract the app must follow. This document
covers Phase 4 (connect the frontend) and Phase 5 (community, ads, SEO).

## 1. Helper files

Copy these into the Next.js project and adjust import paths. Install the SDK and
analytics client there: `npm install @medusajs/js-sdk posthog-js`.

| File | Purpose | Plan step |
| --- | --- | --- |
| [`medusa-client.ts`](../frontend/medusa-client.ts) | Shared Medusa JS SDK client | 4.1 |
| [`lib/auth.ts`](../frontend/lib/auth.ts) | Email/password + Google/GitHub login | 4.1 |
| [`lib/entitlements.ts`](../frontend/lib/entitlements.ts) | SSR content gating via `/store/entitlements` | 4.2 |
| [`lib/newsletter.ts`](../frontend/lib/newsletter.ts) | Newsletter signup → SendGrid | 4.3 |
| [`lib/analytics.ts`](../frontend/lib/analytics.ts) | Page-view / engagement → PostHog | 4.4 |

## 2. Frontend environment

Add to the Vercel project:

```
NEXT_PUBLIC_MEDUSA_BACKEND_URL=https://api.v-channel.com
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=pk_...
NEXT_PUBLIC_POSTHOG_KEY=phc_...
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

The publishable key scopes Store API access; the backend URL points at the
separately-hosted Medusa server.

## 3. The gating contract (Phase 4.2)

This is the single rule the frontend must follow:

> **Free content** renders with SSG/ISR — no entitlement call.
> **Premium content** calls the entitlement endpoint server-side and redirects
> to `/pricing` when access is denied; the protected body is never sent to an
> unauthorized client.

Concretely, in `getServerSideProps` (or a Server Component):

1. Call `getEntitlement({ required_tier })` (which wraps
   `GET /store/entitlements?required_tier=…` with the customer's JWT).
2. If `has_access` is `false`, redirect to `/pricing`.
3. Otherwise render, optionally using `capabilities` to adjust the UI.

Because the decision happens on the server before the body is produced, premium
HTML never reaches an unauthorized browser. The decision logic lives entirely in
the backend ([`06-api-reference.md`](./06-api-reference.md) Section 2.1) — the
frontend only consumes the boolean.

## 4. Checkout round-trip

```
Pricing page → POST /store/memberships { tier_code, success_url, cancel_url }
            → receive { checkout_url } → redirect to Stripe
            → Stripe success_url returns the user to the app
            → (meanwhile) webhook activates the subscription + grants entitlement
            → next entitlement check now returns the paid tier
```

There may be a short delay between returning from Stripe and the webhook
landing; design the `success_url` page to tolerate "activation pending" by
re-checking entitlement.

## 5. Auth (Phase 4.1)

[`lib/auth.ts`](../frontend/lib/auth.ts) wraps email/password and
Google/GitHub login via the JS SDK. After login, the SDK holds the customer JWT
used by the entitlement and checkout calls. OAuth callback URLs are configured on
the backend (see [`07-providers.md`](./07-providers.md) Section 6).

## 6. Newsletter & analytics (Phases 4.3–4.4)

- **Newsletter:** [`lib/newsletter.ts`](../frontend/lib/newsletter.ts) collects a
  signup and routes it to the Medusa notification module (SendGrid).
- **Analytics:** [`lib/analytics.ts`](../frontend/lib/analytics.ts) captures
  page-view and engagement events with `posthog-js`; the backend independently
  emits server-side revenue events to the same PostHog project.

## 7. Community, ads, SEO (Phase 5 — built in Next.js, not Medusa)

VCEP supplies only the signals; these features are implemented in the frontend:

- **Comments & sharing:** store the author as the Medusa `customer_id` from the
  entitlement response for identity consistency; persist comment data in your
  own store.
- **Programmatic ads:** integrate your ad network and **suppress ads when
  `capabilities.ad_free` is true** (Subscriber and Creator tiers).
- **SEO:** metadata, sitemaps, structured data, and SSR/SSG are entirely Next.js
  concerns; Medusa only supplies data via API.

## 8. Frontend responsibilities checklist

- [ ] JS SDK client configured with backend URL + publishable key.
- [ ] Premium routes call `getEntitlement()` server-side and redirect on denial.
- [ ] Pricing page lists tiers from `GET /store/memberships`.
- [ ] Checkout uses `POST /store/memberships` and handles "activation pending".
- [ ] Ads suppressed when `capabilities.ad_free` is true.
- [ ] Comment identity uses the Medusa `customer_id`.

---

Continue to [09 — Deployment & Operations](./09-deployment-operations.md).

*V-Channel, Inc. Proprietary Intellectual Artifact — DaScient Full-Stack
Development Framework — June 23, 2026. All rights reserved.*
