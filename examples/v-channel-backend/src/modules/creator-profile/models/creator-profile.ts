import { model } from "@medusajs/framework/utils"

/**
 * Creator-specific metadata that extends a Medusa customer.
 *
 * A module link (see src/links/customer-creator-profile.ts) associates each
 * profile with a core `customer` record so the customer module stays
 * unmodified. Stripe Connect is used for creator payouts.
 */
const CreatorProfile = model
  .define("creator_profile", {
    id: model.id({ prefix: "creator" }).primaryKey(),
    customer_id: model.text().searchable(),
    // Public, URL-friendly handle used for the creator's V-Channel page
    slug: model.text().searchable(),
    display_name: model.text(),
    bio: model.text().nullable(),
    avatar_url: model.text().nullable(),
    // Stripe Connect account id used to route payouts to the creator
    stripe_connect_account_id: model.text().nullable(),
    payouts_enabled: model.boolean().default(false),
    is_published: model.boolean().default(false),
  })
  .indexes([
    { on: ["customer_id"], unique: true },
    { on: ["slug"], unique: true },
  ])

export default CreatorProfile
