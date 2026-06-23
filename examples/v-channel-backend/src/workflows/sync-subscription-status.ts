import {
  createWorkflow,
  transform,
  when,
  WorkflowData,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { reconcileSubscriptionStep } from "../steps"
import { grantEntitlementWorkflow } from "./grant-entitlement"
import { revokeEntitlementWorkflow } from "./revoke-entitlement"

export type SyncSubscriptionStatusWorkflowInput = {
  // The raw Stripe subscription object from the webhook event
  stripe_subscription: any
}

export const syncSubscriptionStatusWorkflowId = "sync-subscription-status"

/**
 * Reconciles a Stripe subscription into Medusa and drives the customer's
 * entitlement accordingly.
 *
 *   - "active"  -> grant the paid tier (grant-entitlement workflow)
 *   - canceled / unpaid -> revoke and return to reader (revoke-entitlement)
 *
 * Composes the grant/revoke workflows as steps so their compensation chains
 * participate in this workflow's transaction.
 */
export const syncSubscriptionStatusWorkflow = createWorkflow(
  syncSubscriptionStatusWorkflowId,
  (input: WorkflowData<SyncSubscriptionStatusWorkflowInput>) => {
    const subscription = reconcileSubscriptionStep({
      stripe_subscription: input.stripe_subscription,
    })

    when({ subscription }, ({ subscription }) => {
      return subscription?.status === "active"
    }).then(() => {
      const grantInput = transform({ subscription }, (data) => ({
        customer_id: data.subscription!.customer_id,
        tier_code: data.subscription!.tier_code,
        current_period_end: data.subscription!.current_period_end,
      }))
      grantEntitlementWorkflow.runAsStep({ input: grantInput })
    })

    when({ subscription }, ({ subscription }) => {
      return (
        subscription?.status === "canceled" ||
        subscription?.status === "unpaid"
      )
    }).then(() => {
      const revokeInput = transform({ subscription }, (data) => ({
        customer_id: data.subscription!.customer_id,
      }))
      revokeEntitlementWorkflow.runAsStep({ input: revokeInput })
    })

    return new WorkflowResponse(subscription)
  }
)
