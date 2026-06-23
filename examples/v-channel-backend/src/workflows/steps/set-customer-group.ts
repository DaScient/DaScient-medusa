import { ICustomerModuleService } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

export type SetCustomerGroupStepInput = {
  customer_id: string
  // Group to add the customer to (e.g. the paid tier group). Optional.
  add_group_id?: string | null
  // Group to remove the customer from (e.g. previous tier). Optional.
  remove_group_id?: string | null
}

/**
 * Adds a customer to one customer group and/or removes them from another.
 * Compensation restores the previous membership: it removes the customer from
 * the group it added them to, and re-adds them to the group it removed them
 * from.
 */
export const setCustomerGroupStep = createStep(
  "set-customer-group",
  async (input: SetCustomerGroupStepInput, { container }) => {
    const customer = container.resolve<ICustomerModuleService>(Modules.CUSTOMER)

    if (input.remove_group_id) {
      await customer.removeCustomerFromGroup({
        customer_id: input.customer_id,
        customer_group_id: input.remove_group_id,
      })
    }

    if (input.add_group_id) {
      await customer.addCustomerToGroup({
        customer_id: input.customer_id,
        customer_group_id: input.add_group_id,
      })
    }

    return new StepResponse(void 0, input)
  },
  async (input, { container }) => {
    if (!input) {
      return
    }
    const customer = container.resolve<ICustomerModuleService>(Modules.CUSTOMER)

    // Reverse the change.
    if (input.add_group_id) {
      await customer.removeCustomerFromGroup({
        customer_id: input.customer_id,
        customer_group_id: input.add_group_id,
      })
    }

    if (input.remove_group_id) {
      await customer.addCustomerToGroup({
        customer_id: input.customer_id,
        customer_group_id: input.remove_group_id,
      })
    }
  }
)
