import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { MEMBERSHIP_MODULE } from "../../modules/membership"
import MembershipModuleService from "../../modules/membership/service"

export type UpsertMembershipStepInput = {
  customer_id: string
  tier_id: string
  status?: "active" | "past_due" | "canceled" | "incomplete"
  current_period_end?: Date | null
}

/**
 * Creates or updates the customer's membership row. Compensation restores the
 * previous membership snapshot (or deletes the row if there was none before).
 */
export const upsertMembershipStep = createStep(
  "upsert-membership",
  async (input: UpsertMembershipStepInput, { container }) => {
    const service = container.resolve<MembershipModuleService>(MEMBERSHIP_MODULE)

    const [previous] = await service.listMemberships(
      { customer_id: input.customer_id },
      { take: 1 }
    )

    const membership = await service.upsertMembership(input)

    return new StepResponse(membership, {
      created: !previous,
      previous,
      membership_id: membership.id,
    })
  },
  async (compensationData, { container }) => {
    if (!compensationData) {
      return
    }
    const service = container.resolve<MembershipModuleService>(MEMBERSHIP_MODULE)

    if (compensationData.created) {
      await service.deleteMemberships(compensationData.membership_id)
      return
    }

    if (compensationData.previous) {
      await service.updateMemberships({
        id: compensationData.previous.id,
        tier_id: compensationData.previous.tier_id,
        status: compensationData.previous.status,
        current_period_end: compensationData.previous.current_period_end,
      })
    }
  }
)
