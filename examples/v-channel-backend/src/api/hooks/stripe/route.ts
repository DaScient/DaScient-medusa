import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { SUBSCRIPTION_MODULE } from "../../../modules/subscription"
import SubscriptionModuleService from "../../../modules/subscription/service"

// The bodyParser config in middlewares.ts attaches the unparsed body here.
interface MedusaRequestWithRawBody extends MedusaRequest {
  rawBody: Buffer | string
}

// Stripe events that affect a customer's subscription lifecycle.
const SUBSCRIPTION_EVENTS = new Set([
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.paid",
  "invoice.payment_failed",
])

/**
 * POST /hooks/stripe
 *
 * Stripe webhook receiver. Verifies the signature using the raw request body
 * (see middlewares.ts) and emits an internal event. A subscriber
 * (src/subscribers/subscription-events.ts) runs the sync-subscription-status
 * workflow so webhook handling stays fast and retry-safe.
 *
 * This route is intentionally NOT under /admin or /store so it is reachable
 * without Medusa auth; Stripe's signature is the authentication.
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const signature = req.headers["stripe-signature"] as string
  if (!signature) {
    return res.status(400).send("Missing stripe-signature header")
  }

  const subscriptionModule =
    req.scope.resolve<SubscriptionModuleService>(SUBSCRIPTION_MODULE)

  let event
  try {
    // `rawBody` is preserved by the bodyParser config in middlewares.ts.
    const rawBody = (req as MedusaRequestWithRawBody).rawBody
    event = subscriptionModule.verifyWebhook(rawBody, signature)
  } catch (err) {
    const message = err instanceof Error ? err.message : "invalid payload"
    return res.status(400).send(`Webhook signature verification failed: ${message}`)
  }

  if (!SUBSCRIPTION_EVENTS.has(event.type)) {
    // Acknowledge unrelated events so Stripe stops retrying.
    return res.json({ received: true, ignored: true })
  }

  // Resolve the subscription object regardless of the event shape.
  const dataObject = event.data.object as Record<string, any>
  const stripeSubscription =
    event.type.startsWith("invoice.") && dataObject.subscription
      ? await subscriptionModule.billing.stripe.subscriptions.retrieve(
          dataObject.subscription as string
        )
      : dataObject

  const eventBus = req.scope.resolve(Modules.EVENT_BUS)
  await eventBus.emit({
    name: "subscription.stripe_sync",
    data: { stripe_subscription: stripeSubscription },
  })

  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)
  logger.info(`Stripe webhook ${event.type} queued for subscription sync`)

  res.json({ received: true })
}
