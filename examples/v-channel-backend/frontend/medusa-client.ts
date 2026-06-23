import Medusa from "@medusajs/js-sdk"

/**
 * Shared Medusa JS SDK client for the V-Channel Next.js app (Phase 4.1).
 *
 * - On the server (SSR), pass the customer's auth token explicitly per request
 *   (see lib/entitlements.ts) so requests are scoped to the right user.
 * - On the client, the SDK manages the session token in localStorage.
 *
 * Set NEXT_PUBLIC_MEDUSA_BACKEND_URL and NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY in
 * your Vercel project env.
 */
export const medusa = new Medusa({
  baseUrl: process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL!,
  publishableKey: process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY!,
  auth: {
    type: "jwt",
  },
})
