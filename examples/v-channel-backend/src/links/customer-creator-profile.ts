import { defineLink } from "@medusajs/framework/utils"
import CustomerModule from "@medusajs/medusa/customer"
import CreatorProfileModule from "../modules/creator-profile"

/**
 * Associates a core Customer with its V-Channel CreatorProfile without
 * modifying the customer module. Lets you query a customer together with its
 * creator metadata via the Query graph:
 *
 *   query.graph({
 *     entity: "customer",
 *     fields: ["id", "email", "creator_profile.*"],
 *   })
 */
export default defineLink(
  CustomerModule.linkable.customer,
  {
    linkable: CreatorProfileModule.linkable.creatorProfile,
    isList: false,
  }
)
