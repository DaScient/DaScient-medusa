import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { SUBSCRIPTION_MODULE } from "../../modules/subscription"
import SubscriptionModuleService from "../../modules/subscription/service"

export type ReconcileSubscriptionStepInput = {
  // The Stripe subscription object delivered by the webhook event.
  stripe_subscription: any
}

/**
 * Mirrors a Stripe subscription object into the local subscription table.
 * Compensation is intentionally a no-op: reconciliation is idempotent and the
 * next webhook event re-establishes the correct state, so we never want to
 * "undo" a sync from Stripe (Stripe remains the source of truth).
 */
export const reconcileSubscriptionStep = createStep(
  "reconcile-subscription",
  async (input: ReconcileSubscriptionStepInput, { container }) => {
    const service =
      container.resolve<SubscriptionModuleService>(SUBSCRIPTION_MODULE)

    const subscription = await service.reconcileFromStripe(
      input.stripe_subscription
    )

    return new StepResponse(subscription)
  }
)
