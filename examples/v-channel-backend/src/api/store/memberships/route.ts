import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { ICustomerModuleService } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { MEMBERSHIP_MODULE } from "../../../modules/membership"
import MembershipModuleService from "../../../modules/membership/service"
import { SUBSCRIPTION_MODULE } from "../../../modules/subscription"
import SubscriptionModuleService from "../../../modules/subscription/service"

/**
 * GET /store/memberships
 *
 * Lists the available membership tiers (Reader / Subscriber / Creator) so the
 * pricing page can render them dynamically.
 */
export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const service = req.scope.resolve<MembershipModuleService>(MEMBERSHIP_MODULE)
  const tiers = await service.listMembershipTiers(
    {},
    { order: { monthly_amount: "ASC" } }
  )
  res.json({ tiers })
}

type StartCheckoutBody = {
  tier_code: string
  success_url: string
  cancel_url: string
}

/**
 * POST /store/memberships
 *
 * Starts a Stripe Billing checkout for a paid tier and returns the redirect
 * URL. The webhook later activates the subscription and grants entitlement.
 *
 * Auth: requires an authenticated customer.
 */
export const POST = async (
  req: AuthenticatedMedusaRequest<StartCheckoutBody>,
  res: MedusaResponse
) => {
  const customerId = req.auth_context?.actor_id
  if (!customerId) {
    throw new MedusaError(
      MedusaError.Types.UNAUTHORIZED,
      "You must be signed in to start a membership."
    )
  }

  const { tier_code, success_url, cancel_url } = req.body
  if (!tier_code || !success_url || !cancel_url) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "tier_code, success_url and cancel_url are required."
    )
  }

  const customerModule = req.scope.resolve<ICustomerModuleService>(
    Modules.CUSTOMER
  )
  const customer = await customerModule.retrieveCustomer(customerId)

  const subscriptionModule =
    req.scope.resolve<SubscriptionModuleService>(SUBSCRIPTION_MODULE)

  const { checkoutUrl } = await subscriptionModule.startCheckout({
    customerId,
    email: customer.email!,
    tierCode: tier_code,
    successUrl: success_url,
    cancelUrl: cancel_url,
  })

  res.json({ checkout_url: checkoutUrl })
}
