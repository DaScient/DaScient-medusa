import {
  ExecArgs,
  ICustomerModuleService,
  IRegionModuleService,
  ISalesChannelModuleService,
  IStoreModuleService,
} from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { MEMBERSHIP_MODULE } from "../modules/membership"
import MembershipModuleService from "../modules/membership/service"

/**
 * Seeds the minimum data V-Channel needs (Phase 1.3 + membership tiers):
 *   - a US region with USD
 *   - a "V-Channel" sales channel set as the store default
 *   - one customer group per tier (reader / subscriber / creator)
 *   - the three membership tiers wired to their groups
 *
 * Run with: `yarn seed` (medusa exec ./src/scripts/seed.ts)
 *
 * NOTE: link each tier's `product_id` and `stripe_price_id` after you create
 * the matching Products and Stripe Billing prices.
 */
export default async function seed({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  const regionModule = container.resolve<IRegionModuleService>(Modules.REGION)
  const salesChannelModule = container.resolve<ISalesChannelModuleService>(
    Modules.SALES_CHANNEL
  )
  const storeModule = container.resolve<IStoreModuleService>(Modules.STORE)
  const customerModule = container.resolve<ICustomerModuleService>(
    Modules.CUSTOMER
  )
  const membershipModule =
    container.resolve<MembershipModuleService>(MEMBERSHIP_MODULE)

  logger.info("Seeding V-Channel base data...")

  // -- Region ---------------------------------------------------------------
  let [region] = await regionModule.listRegions({ name: "United States" })
  if (!region) {
    region = await regionModule.createRegions({
      name: "United States",
      currency_code: "usd",
      countries: ["us"],
    })
    logger.info(`Created region ${region.id}`)
  }

  // -- Sales channel --------------------------------------------------------
  let [salesChannel] = await salesChannelModule.listSalesChannels({
    name: "V-Channel",
  })
  if (!salesChannel) {
    salesChannel = await salesChannelModule.createSalesChannels({
      name: "V-Channel",
      description: "Primary sales channel for the V-Channel platform",
    })
    logger.info(`Created sales channel ${salesChannel.id}`)
  }

  // -- Store defaults -------------------------------------------------------
  const [store] = await storeModule.listStores()
  if (store) {
    await storeModule.updateStores(store.id, {
      supported_currencies: [{ currency_code: "usd", is_default: true }],
      default_sales_channel_id: salesChannel.id,
      default_region_id: region.id,
    })
  }

  // -- Customer groups + membership tiers -----------------------------------
  const tiers = [
    {
      code: "reader",
      name: "Reader",
      description: "Free access to all free reviews and articles.",
      monthly_amount: 0,
      is_default: true,
    },
    {
      code: "subscriber",
      name: "Subscriber",
      description:
        "$9/month premium access: exclusive content, ad-free, monthly Q&A.",
      monthly_amount: 900,
      is_default: false,
    },
    {
      code: "creator",
      name: "Creator",
      description:
        "$49/month publishing, monetization, analytics and a custom profile.",
      monthly_amount: 4900,
      is_default: false,
    },
  ]

  for (const tier of tiers) {
    const [existingTier] = await membershipModule.listMembershipTiers({
      code: tier.code,
    })
    if (existingTier) {
      logger.info(`Tier "${tier.code}" already exists, skipping`)
      continue
    }

    const groupName = `tier:${tier.code}`
    let [group] = await customerModule.listCustomerGroups({ name: groupName })
    if (!group) {
      group = await customerModule.createCustomerGroups({ name: groupName })
    }

    await membershipModule.createMembershipTiers({
      ...tier,
      currency_code: "usd",
      customer_group_id: group.id,
    })
    logger.info(`Created tier "${tier.code}" -> group ${group.id}`)
  }

  logger.info("V-Channel seed complete.")
}
