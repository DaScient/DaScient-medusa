import { MedusaService } from "@medusajs/framework/utils"
import { InferTypeOf } from "@medusajs/framework/types"
import Subscription from "./models/subscription"
import { StripeBilling } from "./stripe-billing"

type SubscriptionDTO = InferTypeOf<typeof Subscription>

type ModuleOptions = {
  apiKey: string
  webhookSecret: string
  // Maps a tier code to its Stripe Billing recurring price id
  priceByTier: Record<string, string | undefined>
}

/**
 * SubscriptionModuleService.
 *
 * Bridges V-Channel membership tiers to Stripe Billing. The `MedusaService`
 * factory provides CRUD for the `Subscription` model; this service adds the
 * Stripe-specific orchestration (checkout creation + webhook reconciliation).
 *
 * Module options are passed through `medusa-config.ts`:
 *   {
 *     resolve: "./src/modules/subscription",
 *     options: { apiKey, webhookSecret, priceByTier }
 *   }
 */
class SubscriptionModuleService extends MedusaService({ Subscription }) {
  protected options_: ModuleOptions
  protected billing_: StripeBilling

  constructor(_: unknown, options: ModuleOptions) {
    // @ts-ignore - forward DI container + options to the factory base
    super(...arguments)
    this.options_ = options
    this.billing_ = new StripeBilling(options.apiKey)
  }

  get billing(): StripeBilling {
    return this.billing_
  }

  priceForTier(tierCode: string): string {
    const priceId = this.options_.priceByTier?.[tierCode]
    if (!priceId) {
      throw new Error(`No Stripe price configured for tier "${tierCode}"`)
    }
    return priceId
  }

  tierForPrice(priceId: string): string | undefined {
    const entry = Object.entries(this.options_.priceByTier ?? {}).find(
      ([, value]) => value === priceId
    )
    return entry?.[0]
  }

  verifyWebhook(payload: Buffer | string, signature: string): ReturnType<StripeBilling["constructEvent"]> {
    return this.billing_.constructEvent(
      payload,
      signature,
      this.options_.webhookSecret
    )
  }

  /**
   * Start a subscription checkout for a customer + tier and persist a local
   * "incomplete" subscription row that the webhook will later activate.
   */
  async startCheckout(input: {
    customerId: string
    email: string
    tierCode: string
    successUrl: string
    cancelUrl: string
  }): Promise<{ checkoutUrl: string | null; subscription: SubscriptionDTO }> {
    const priceId = this.priceForTier(input.tierCode)
    const stripeCustomerId = await this.billing_.ensureCustomer({
      customerId: input.customerId,
      email: input.email,
    })

    const session = await this.billing_.createSubscriptionCheckout({
      stripeCustomerId,
      priceId,
      successUrl: input.successUrl,
      cancelUrl: input.cancelUrl,
      metadata: {
        vchannel_customer_id: input.customerId,
        tier_code: input.tierCode,
      },
    })

    const subscription = (await this.createSubscriptions({
      customer_id: input.customerId,
      tier_code: input.tierCode,
      stripe_customer_id: stripeCustomerId,
      stripe_price_id: priceId,
      status: "incomplete",
    })) as unknown as SubscriptionDTO

    return { checkoutUrl: session.url, subscription }
  }

  /**
   * Upsert the local subscription row from a Stripe subscription object.
   * Returns the reconciled row so the caller (workflow) can sync membership.
   */
  async reconcileFromStripe(stripeSub: {
    id: string
    customer: string
    status: SubscriptionDTO["status"]
    items: { data: { price: { id: string } }[] }
    current_period_end: number
    cancel_at_period_end: boolean
    metadata?: Record<string, string>
  }): Promise<SubscriptionDTO | undefined> {
    const priceId = stripeSub.items?.data?.[0]?.price?.id
    const customerId = stripeSub.metadata?.vchannel_customer_id
    const tierCode =
      stripeSub.metadata?.tier_code ??
      (priceId ? this.tierForPrice(priceId) : undefined)

    const [existing] = await this.listSubscriptions(
      { stripe_subscription_id: stripeSub.id },
      { take: 1 }
    )

    const payload = {
      status: stripeSub.status,
      stripe_subscription_id: stripeSub.id,
      stripe_customer_id: stripeSub.customer,
      stripe_price_id: priceId,
      current_period_end: stripeSub.current_period_end
        ? new Date(stripeSub.current_period_end * 1000)
        : null,
      cancel_at_period_end: stripeSub.cancel_at_period_end,
    }

    if (existing) {
      return (await this.updateSubscriptions({
        id: existing.id,
        ...payload,
      })) as unknown as SubscriptionDTO
    }

    // Fall back to matching the most recent incomplete row for this customer
    if (customerId) {
      const [pending] = await this.listSubscriptions(
        { customer_id: customerId, status: "incomplete" },
        { take: 1, order: { created_at: "DESC" } }
      )
      if (pending) {
        return (await this.updateSubscriptions({
          id: pending.id,
          ...payload,
        })) as unknown as SubscriptionDTO
      }

      return (await this.createSubscriptions({
        customer_id: customerId,
        tier_code: tierCode ?? "subscriber",
        ...payload,
      })) as unknown as SubscriptionDTO
    }

    return undefined
  }
}

export default SubscriptionModuleService
