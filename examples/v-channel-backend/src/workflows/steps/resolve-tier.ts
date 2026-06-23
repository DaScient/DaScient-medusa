import { MedusaError } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { MEMBERSHIP_MODULE } from "../../modules/membership"
import MembershipModuleService from "../../modules/membership/service"

export type ResolveTierStepInput = {
  // Resolve by explicit tier code, or fall back to the default (reader) tier.
  tier_code?: string
  use_default?: boolean
}

/**
 * Read-only step: resolves a membership tier by code (or the default tier).
 * No compensation needed because it does not mutate state.
 */
export const resolveTierStep = createStep(
  "resolve-tier",
  async (input: ResolveTierStepInput, { container }) => {
    const service = container.resolve<MembershipModuleService>(MEMBERSHIP_MODULE)

    let tier
    if (input.use_default || !input.tier_code) {
      ;[tier] = await service.listMembershipTiers({ is_default: true }, { take: 1 })
    } else {
      ;[tier] = await service.listMembershipTiers(
        { code: input.tier_code },
        { take: 1 }
      )
    }

    if (!tier) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Membership tier "${input.tier_code ?? "default"}" was not found. Run the seed script.`
      )
    }

    return new StepResponse(tier)
  }
)
