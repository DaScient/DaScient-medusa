/**
 * Server-side entitlement gating for V-Channel premium content (Phase 4.2).
 *
 * Call `getEntitlement` inside a Next.js Server Component / `getServerSideProps`
 * BEFORE rendering gated content so the protected body never ships to an
 * unauthorized client. Keep free pages on SSG for speed; only gated pages need
 * this server round-trip.
 */

export type Entitlement = {
  authenticated: boolean
  tier: "reader" | "subscriber" | "creator" | string
  tier_name?: string
  has_access: boolean
  capabilities?: {
    ad_free: boolean
    can_publish: boolean
  }
}

/**
 * @param authToken  the customer's Medusa JWT (from cookie/session). Omit for
 *                   anonymous visitors -> resolves to the free reader tier.
 * @param requiredTier  the minimum tier the content requires.
 */
export async function getEntitlement(input: {
  authToken?: string
  requiredTier?: "subscriber" | "creator"
}): Promise<Entitlement> {
  const url = new URL(
    "/store/entitlements",
    process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL!
  )
  if (input.requiredTier) {
    url.searchParams.set("required_tier", input.requiredTier)
  }

  const res = await fetch(url.toString(), {
    headers: {
      "x-publishable-api-key": process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY!,
      ...(input.authToken
        ? { Authorization: `****** }
        : {}),
    },
    // Always hit the backend; never cache a per-user authorization decision.
    cache: "no-store",
  })

  if (!res.ok) {
    // Fail closed: treat as the free reader tier with no premium access.
    return { authenticated: false, tier: "reader", has_access: false }
  }

  return (await res.json()) as Entitlement
}

/**
 * Example usage in `getServerSideProps`:
 *
 *   const entitlement = await getEntitlement({
 *     authToken: req.cookies["_medusa_jwt"],
 *     requiredTier: "subscriber",
 *   })
 *   if (!entitlement.has_access) {
 *     return { redirect: { destination: "/pricing", permanent: false } }
 *   }
 */
