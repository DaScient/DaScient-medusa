import posthog from "posthog-js"

/**
 * Audience + engagement analytics for V-Channel (Phase 4.4).
 *
 * The frontend sends page-view and engagement events to PostHog directly for
 * low-latency capture; the backend `analytics` module (also PostHog) records
 * commerce/revenue events (subscription started, PPV purchased) so both streams
 * land in the same project for a unified revenue + audience dashboard.
 */
let initialized = false

export function initAnalytics(): void {
  if (initialized || typeof window === "undefined") {
    return
  }
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    capture_pageview: false, // captured manually on route change
  })
  initialized = true
}

export function trackPageView(path: string): void {
  if (typeof window === "undefined") {
    return
  }
  posthog.capture("$pageview", { path })
}

export function trackEngagement(
  event: "content_read" | "video_play" | "share" | "comment",
  properties: Record<string, unknown> = {}
): void {
  if (typeof window === "undefined") {
    return
  }
  posthog.capture(event, properties)
}

/**
 * Associate events with the logged-in customer so the dashboard can segment by
 * membership tier.
 */
export function identify(customerId: string, tier: string): void {
  if (typeof window === "undefined") {
    return
  }
  posthog.identify(customerId, { tier })
}
