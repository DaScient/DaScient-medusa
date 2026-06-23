import { MedusaError, MedusaService } from "@medusajs/framework/utils"
import { InferTypeOf } from "@medusajs/framework/types"
import { MembershipTier, Membership } from "./models/membership-tier"

type MembershipDTO = InferTypeOf<typeof Membership>

/**
 * MembershipModuleService.
 *
 * Follows the `MedusaService` factory pattern (CLAUDE.md section 5.1): the
 * factory auto-generates CRUD for `MembershipTier` and `Membership`
 * (createMembershipTiers, listMemberships, updateMemberships, ...). We only add
 * the V-Channel-specific helpers on top.
 */
class MembershipModuleService extends MedusaService({
  MembershipTier,
  Membership,
}) {
  /**
   * Resolve the membership tier a customer is currently entitled to.
   * Falls back to the default (free "reader") tier when the customer has no
   * active membership.
   */
  async resolveTierForCustomer(customerId: string) {
    const [membership] = await this.listMemberships(
      { customer_id: customerId, status: "active" },
      { relations: ["tier"], take: 1 }
    )

    if (membership?.tier) {
      return membership.tier
    }

    const [defaultTier] = await this.listMembershipTiers(
      { is_default: true },
      { take: 1 }
    )

    if (!defaultTier) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        "No default membership tier configured. Run the seed script."
      )
    }

    return defaultTier
  }

  /**
   * Create or update a customer's membership for a given tier. Used by the
   * subscription sync workflow when Stripe reports a paid invoice.
   */
  async upsertMembership(input: {
    customer_id: string
    tier_id: string
    status?: MembershipDTO["status"]
    current_period_end?: Date | null
  }): Promise<MembershipDTO> {
    const [existing] = await this.listMemberships(
      { customer_id: input.customer_id },
      { take: 1 }
    )

    if (existing) {
      return (await this.updateMemberships({
        id: existing.id,
        tier_id: input.tier_id,
        status: input.status ?? "active",
        current_period_end: input.current_period_end ?? null,
      })) as unknown as MembershipDTO
    }

    return (await this.createMemberships({
      customer_id: input.customer_id,
      tier_id: input.tier_id,
      status: input.status ?? "active",
      current_period_end: input.current_period_end ?? null,
    })) as unknown as MembershipDTO
  }
}

export default MembershipModuleService
