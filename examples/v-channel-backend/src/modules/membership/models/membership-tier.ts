import { model } from "@medusajs/framework/utils"

/**
 * A V-Channel membership tier.
 *
 * Tiers map 1:1 to the plans on the V-Channel pricing page:
 *   - reader     (free)
 *   - subscriber ($9/month)
 *   - creator    ($49/month)
 *
 * Each paid tier references:
 *   - `product_id`        the Medusa Product that fans purchase / subscribe to
 *   - `customer_group_id` the group used to gate content and apply member pricing
 *   - `stripe_price_id`   the Stripe Billing recurring price for the subscription
 */
const MembershipTier = model
  .define("membership_tier", {
    id: model.id({ prefix: "mtier" }).primaryKey(),
    // Stable machine code: "reader" | "subscriber" | "creator"
    code: model.text().searchable(),
    name: model.text().searchable(),
    description: model.text().nullable(),
    // Monthly price in the smallest currency unit (e.g. cents). 0 for reader.
    monthly_amount: model.number().default(0),
    currency_code: model.text().default("usd"),
    is_default: model.boolean().default(false),
    product_id: model.text().nullable(),
    customer_group_id: model.text().nullable(),
    stripe_price_id: model.text().nullable(),
    memberships: model.hasMany(() => Membership, {
      mappedBy: "tier",
    }),
  })
  .indexes([
    { on: ["code"], unique: true },
    { on: ["product_id"] },
    { on: ["customer_group_id"] },
  ])

/**
 * A customer's current membership.
 *
 * One active membership per customer. `status` reflects the lifecycle as
 * driven by Stripe Billing webhooks (see the subscription module + workflows).
 */
const Membership = model
  .define("membership", {
    id: model.id({ prefix: "mem" }).primaryKey(),
    customer_id: model.text().searchable(),
    status: model
      .enum(["active", "past_due", "canceled", "incomplete"])
      .default("active"),
    current_period_end: model.dateTime().nullable(),
    tier: model.belongsTo(() => MembershipTier, {
      mappedBy: "memberships",
    }),
  })
  .indexes([
    { on: ["customer_id"], unique: true },
    { on: ["status"] },
  ])

export { MembershipTier, Membership }
export default MembershipTier
