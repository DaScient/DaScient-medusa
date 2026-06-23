import { medusa } from "../medusa-client"

/**
 * Auth helpers for the V-Channel frontend (Phase 4.1).
 *
 * Supports email/password and Google (and GitHub) login via the Medusa auth
 * module. The returned JWT identifies the customer for entitlement checks.
 */

export async function registerWithEmail(input: {
  email: string
  password: string
  first_name?: string
  last_name?: string
}): Promise<string> {
  // 1. Register an auth identity, 2. create the customer profile.
  const token = await medusa.auth.register("customer", "emailpass", {
    email: input.email,
    password: input.password,
  })

  await medusa.store.customer.create(
    {
      email: input.email,
      first_name: input.first_name,
      last_name: input.last_name,
    },
    {},
    { Authorization: "Bearer ".concat(token) }
  )

  return token
}

export async function loginWithEmail(
  email: string,
  password: string
): Promise<string> {
  const result = await medusa.auth.login("customer", "emailpass", {
    email,
    password,
  })

  if (typeof result !== "string") {
    // A `location` object means an OAuth redirect is required.
    throw new Error("Unexpected redirect for emailpass login")
  }
  return result
}

/**
 * Returns the Google OAuth URL to redirect the user to. After consent, Google
 * calls back to the Medusa auth callback configured in medusa-config.ts.
 */
export async function getGoogleLoginUrl(): Promise<string> {
  const result = await medusa.auth.login("customer", "google", {})
  if (typeof result === "string") {
    throw new Error("Expected an OAuth redirect location for Google login")
  }
  return result.location
}

export async function logout(): Promise<void> {
  await medusa.auth.logout()
}
