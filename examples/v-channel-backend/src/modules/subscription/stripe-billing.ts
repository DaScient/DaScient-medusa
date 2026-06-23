import Stripe from "stripe"

/**
 * Thin wrapper around the Stripe Billing API used by the subscription module.
 *
 * This isolates all direct Stripe calls so the module service and workflows
 * stay testable. Recurring billing (the $9 Subscriber and $49 Creator plans)
 * is delegated entirely to Stripe Billing; Medusa only mirrors the state.
 */
export class StripeBilling {
  private client: Stripe

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error("STRIPE_API_KEY is required for the subscription module")
    }
    this.client = new Stripe(apiKey)
  }

  get stripe(): Stripe {
    return this.client
  }

  /**
   * Find an existing Stripe customer by V-Channel customer id (stored in
   * metadata) or create a new one.
   */
  async ensureCustomer(input: {
    customerId: string
    email: string
  }): Promise<string> {
    const existing = await this.client.customers.search({
      query: `metadata['vchannel_customer_id']:'${input.customerId}'`,
      limit: 1,
    })

    if (existing.data.length) {
      return existing.data[0].id
    }

    const created = await this.client.customers.create({
      email: input.email,
      metadata: { vchannel_customer_id: input.customerId },
    })

    return created.id
  }

  /**
   * Create a Stripe Checkout Session for a recurring subscription. The
   * frontend redirects the fan/creator to the returned URL.
   */
  async createSubscriptionCheckout(input: {
    stripeCustomerId: string
    priceId: string
    successUrl: string
    cancelUrl: string
    metadata?: Record<string, string>
  }): Promise<{ id: string; url: string | null }> {
    const session = await this.client.checkout.sessions.create({
      mode: "subscription",
      customer: input.stripeCustomerId,
      line_items: [{ price: input.priceId, quantity: 1 }],
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      metadata: input.metadata,
    })

    return { id: session.id, url: session.url }
  }

  /**
   * Build a Billing Portal URL so members can manage / cancel their plan.
   */
  async createBillingPortal(input: {
    stripeCustomerId: string
    returnUrl: string
  }): Promise<string> {
    const portal = await this.client.billingPortal.sessions.create({
      customer: input.stripeCustomerId,
      return_url: input.returnUrl,
    })
    return portal.url
  }

  /**
   * Verify and construct a webhook event from the raw request body.
   */
  constructEvent(
    payload: Buffer | string,
    signature: string,
    webhookSecret: string
  ): Stripe.Event {
    return this.client.webhooks.constructEvent(
      payload,
      signature,
      webhookSecret
    )
  }
}
