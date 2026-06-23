# V-Channel frontend integration (Phase 4)

These are reference snippets to drop into the existing V-Channel **Next.js app on
Vercel**. They are not a standalone app — copy them into your project and adjust
import paths. Install the SDK and PostHog client in the Next.js app:

```bash
npm install @medusajs/js-sdk posthog-js
```

Add to the Vercel project environment:

```
NEXT_PUBLIC_MEDUSA_BACKEND_URL=https://api.v-channel.com
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=pk_...
NEXT_PUBLIC_POSTHOG_KEY=phc_...
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

## Files

| File | Purpose | Plan step |
| --- | --- | --- |
| `medusa-client.ts` | Shared Medusa JS SDK client | 4.1 |
| `lib/auth.ts` | Email/password + Google/GitHub login | 4.1 |
| `lib/entitlements.ts` | **SSR content gating** via `/store/entitlements` | 4.2 |
| `lib/newsletter.ts` | Newsletter signup -> SendGrid | 4.3 |
| `lib/analytics.ts` | Page-view / engagement -> PostHog | 4.4 |

## Gating model

- **Free content**: render with SSG/ISR for millisecond loads. No entitlement
  call needed.
- **Premium content** (Subscriber/Creator): call `getEntitlement()` in
  `getServerSideProps` / a Server Component and redirect to `/pricing` when
  `has_access` is false. The protected body is never sent to unauthorized
  clients.

## Community, ads, SEO (Phase 5 — built here, not in Medusa)

- **Comments & sharing**: build in Next.js with your own DB; store the author as
  the Medusa `customer_id` (from the entitlement response) for identity
  consistency.
- **Programmatic ads**: integrate your ad network in the frontend and suppress
  ads when `capabilities.ad_free` is true (Subscriber/Creator tiers).
- **SEO**: handled entirely in Next.js (metadata, sitemaps, structured data,
  SSR/SSG). Medusa only supplies data via API.
