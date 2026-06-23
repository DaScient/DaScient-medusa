import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { syncSubscriptionStatusWorkflow } from "../workflows"

/**
 * Listens for Stripe subscription events relayed by the webhook route and runs
 * the sync-subscription-status workflow, which reconciles the local
 * subscription and moves the customer between membership tiers / groups.
 */
export default async function subscriptionStripeSyncHandler({
  event,
  container,
}: SubscriberArgs<{ stripe_subscription: any }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  const stripeSubscription = event.data.stripe_subscription
  if (!stripeSubscription) {
    logger.warn("subscription.stripe_sync event received without a subscription")
    return
  }

  await syncSubscriptionStatusWorkflow(container).run({
    input: { stripe_subscription: stripeSubscription },
  })
}

export const config: SubscriberConfig = {
  event: "subscription.stripe_sync",
}
