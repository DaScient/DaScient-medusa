import { model } from "@medusajs/framework/utils"

/**
 * A subscription record mirroring a Stripe Billing subscription.
 *
 * Medusa has no native recurring-billing engine, so this module is the local
 * source of truth that is kept in sync with Stripe via webhooks. The
 * sync-subscription-status / revoke-entitlement workflows read and write these
 * rows and move the customer between membership tiers / customer groups.
 */
const Subscription = model
  .define("subscription", {
    id: model.id({ prefix: "sub" }).primaryKey(),
    customer_id: model.text().searchable(),
    // The membership tier this subscription grants (subscriber | creator)
    tier_code: model.text(),
    // Stripe identifiers
    stripe_customer_id: model.text().nullable(),
    stripe_subscription_id: model.text().nullable(),
    stripe_price_id: model.text().nullable(),
    status: model
      .enum([
        "incomplete",
        "active",
        "past_due",
        "canceled",
        "unpaid",
      ])
      .default("incomplete"),
    current_period_end: model.dateTime().nullable(),
    cancel_at_period_end: model.boolean().default(false),
  })
  .indexes([
    { on: ["customer_id"] },
    { on: ["stripe_subscription_id"], unique: true, where: "stripe_subscription_id IS NOT NULL" },
    { on: ["status"] },
  ])

export default Subscription
