import { medusa } from "../medusa-client"

/**
 * Newsletter signup wired to Medusa (Phase 4.3).
 *
 * V-Channel newsletter subscribers are modeled as customers flagged via
 * metadata. A backend subscriber/workflow can then send the welcome email and
 * recurring newsletters through the SendGrid notification provider.
 */
export async function subscribeToNewsletter(email: string): Promise<void> {
  await medusa.store.customer.create({
    email,
    metadata: { newsletter_opt_in: true },
  })
}

/**
 * Update newsletter preference for an authenticated customer.
 */
export async function setNewsletterPreference(
  authToken: string,
  optIn: boolean
): Promise<void> {
  await medusa.store.customer.update(
    { metadata: { newsletter_opt_in: optIn } },
    {},
    { Authorization: `****** }
  )
}
