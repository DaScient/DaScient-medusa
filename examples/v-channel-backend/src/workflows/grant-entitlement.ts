import {
  createWorkflow,
  transform,
  WorkflowData,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { resolveTierStep, setCustomerGroupStep, upsertMembershipStep } from "../steps"

export type GrantEntitlementWorkflowInput = {
  customer_id: string
  // Tier code to grant: "subscriber" | "creator" (paid tiers)
  tier_code: string
  current_period_end?: Date | null
  // Group the customer is leaving (optional, e.g. the default reader group)
  previous_group_id?: string | null
}

export const grantEntitlementWorkflowId = "grant-entitlement"

/**
 * Grants a paid membership entitlement to a customer.
 *
 * Used after a successful PPV purchase or an activated subscription. It:
 *   1. resolves the target tier,
 *   2. upserts the customer's membership (active),
 *   3. moves the customer into the tier's customer group for content gating.
 *
 * Every mutating step has a compensation function, so a failure mid-flow rolls
 * back cleanly (pattern from core-flows/promotion).
 */
export const grantEntitlementWorkflow = createWorkflow(
  grantEntitlementWorkflowId,
  (input: WorkflowData<GrantEntitlementWorkflowInput>) => {
    const tier = resolveTierStep({ tier_code: input.tier_code })

    const membershipInput = transform({ input, tier }, (data) => ({
      customer_id: data.input.customer_id,
      tier_id: data.tier.id,
      status: "active" as const,
      current_period_end: data.input.current_period_end ?? null,
    }))

    const membership = upsertMembershipStep(membershipInput)

    const groupInput = transform({ input, tier }, (data) => ({
      customer_id: data.input.customer_id,
      add_group_id: data.tier.customer_group_id,
      remove_group_id: data.input.previous_group_id ?? null,
    }))

    setCustomerGroupStep(groupInput)

    return new WorkflowResponse(membership)
  }
)
