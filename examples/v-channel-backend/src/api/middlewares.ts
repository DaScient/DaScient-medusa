import { defineMiddlewares } from "@medusajs/framework/http"

/**
 * Preserve the raw request body for the Stripe webhook route so the signature
 * can be verified. Without this, Express' JSON body parser would consume the
 * stream and Stripe verification would fail.
 */
export default defineMiddlewares({
  routes: [
    {
      matcher: "/hooks/stripe",
      method: ["POST"],
      bodyParser: { preserveRawBody: true },
    },
  ],
})
