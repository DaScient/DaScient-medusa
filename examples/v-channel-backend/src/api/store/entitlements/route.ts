import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MEMBERSHIP_MODULE } from "../../../modules/membership"
import MembershipModuleService from "../../../modules/membership/service"

// Capabilities granted by each tier. The frontend uses these to decide what to
// render; the backend uses `required_tier` checks to authorize gated content.
const TIER_RANK: Record<string, number> = {
  reader: 0,
  subscriber: 1,
  creator: 2,
}

/**
 * GET /store/entitlements
 *
 * The entitlement-check endpoint (Phase 3.4). The V-Channel Next.js app calls
 * this server-side (SSR) to decide whether to serve gated content.
 *
 * Query params:
 *   - required_tier: optional. When provided, the response includes
 *     `has_access` indicating whether the customer's tier meets or exceeds it.
 *
 * Auth: requires an authenticated customer (store JWT / session). Unauthorized
 * requests resolve to the free "reader" tier.
 */
export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const service = req.scope.resolve<MembershipModuleService>(MEMBERSHIP_MODULE)
  const customerId = req.auth_context?.actor_id

  const requiredTier = (req.query.required_tier as string) || undefined

  // Anonymous visitor: reader tier only.
  if (!customerId) {
    const [readerTier] = await service.listMembershipTiers(
      { is_default: true },
      { take: 1 }
    )
    const tierCode = readerTier?.code ?? "reader"
    return res.json({
      authenticated: false,
      tier: tierCode,
      has_access: requiredTier
        ? (TIER_RANK[tierCode] ?? 0) >= (TIER_RANK[requiredTier] ?? 0)
        : true,
    })
  }

  const tier = await service.resolveTierForCustomer(customerId)

  const hasAccess = requiredTier
    ? (TIER_RANK[tier.code] ?? 0) >= (TIER_RANK[requiredTier] ?? 0)
    : true

  res.json({
    authenticated: true,
    customer_id: customerId,
    tier: tier.code,
    tier_name: tier.name,
    has_access: hasAccess,
    capabilities: {
      ad_free: (TIER_RANK[tier.code] ?? 0) >= TIER_RANK.subscriber,
      can_publish: tier.code === "creator",
    },
  })
}
