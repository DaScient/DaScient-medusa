import {
  createWorkflow,
  transform,
  WorkflowData,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { resolveTierStep, setCustomerGroupStep, upsertMembershipStep } from "../steps"

export type RevokeEntitlementWorkflowInput = {
  customer_id: string
  // The paid group the customer is currently in (to remove them from)
  paid_group_id?: string | null
}

export const revokeEntitlementWorkflowId = "revoke-entitlement"

/**
 * Revokes a paid entitlement and returns the customer to the free reader tier.
 *
 * Used when a Stripe subscription is canceled or goes unpaid. It:
 *   1. resolves the default (reader) tier,
 *   2. marks the membership as canceled and re-points it at the reader tier,
 *   3. removes the customer from the paid group and adds them to the reader
 *      group.
 */
export const revokeEntitlementWorkflow = createWorkflow(
  revokeEntitlementWorkflowId,
  (input: WorkflowData<RevokeEntitlementWorkflowInput>) => {
    const readerTier = resolveTierStep({ use_default: true })

    const membershipInput = transform({ input, readerTier }, (data) => ({
      customer_id: data.input.customer_id,
      tier_id: data.readerTier.id,
      status: "canceled" as const,
      current_period_end: null,
    }))

    const membership = upsertMembershipStep(membershipInput)

    const groupInput = transform({ input, readerTier }, (data) => ({
      customer_id: data.input.customer_id,
      add_group_id: data.readerTier.customer_group_id,
      remove_group_id: data.input.paid_group_id ?? null,
    }))

    setCustomerGroupStep(groupInput)

    return new WorkflowResponse(membership)
  }
)
